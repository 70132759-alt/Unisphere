import type { Request, Response, NextFunction } from "express";
import { eq, and, isNull } from "drizzle-orm";
import { getAuth, clerkClient } from "@clerk/express";
import { db, usersTable } from "@workspace/db";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      localUserId?: number;
    }
  }
}

function slugifyUsername(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^_+|_+$/g, "") || "user";
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuth(req);
    const clerkUserId = auth?.userId;
    if (!clerkUserId) {
      const cookieHeader = req.headers.cookie ?? "";
      const cookieNames = cookieHeader
        .split(";")
        .map((c) => c.trim().split("=")[0])
        .filter(Boolean);
      req.log.warn(
        {
          origin: req.headers.origin,
          referer: req.headers.referer,
          cookieNames,
          hasCookieHeader: cookieHeader.length > 0,
          clerkReason: (auth as { reason?: string })?.reason,
        },
        "AUTH_DEBUG: unauthorized request",
      );
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    let [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, clerkUserId));

    if (!user) {
      user = await provisionLocalUser(clerkUserId);
    }

    req.localUserId = user.id;
    next();
  } catch (err) {
    req.log.error({ err }, "Auth bridge failed");
    res.status(500).json({ error: "Auth bridge failed" });
  }
}

// Concurrency-safe JIT provisioning. Multiple parallel first-time requests may race;
// we handle every collision (clerk_user_id / email / username) by re-selecting after
// a unique-violation insert. Always returns a row or throws.
async function provisionLocalUser(clerkUserId: string) {
  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    `${clerkUserId}@unknown.local`;
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    email.split("@")[0] ||
    "New User";

  // Link by email if a seeded/pre-existing row matches and is not yet linked.
  // `clerkUserId IS NULL` keeps two concurrent sign-ins from clobbering each other.
  const linked = await db
    .update(usersTable)
    .set({ clerkUserId })
    .where(
      and(eq(usersTable.email, email), isNull(usersTable.clerkUserId)),
    )
    .returning();
  if (linked.length > 0) return linked[0]!;

  // Maybe a concurrent request already linked / provisioned this clerkUserId.
  const [existingByClerk] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId));
  if (existingByClerk) return existingByClerk;

  // Fresh insert. Try candidates until a unique username sticks; bail to re-select
  // on any conflict so concurrent inserts converge to the row that won.
  const base = slugifyUsername(
    clerkUser.username || email.split("@")[0] || `user_${clerkUserId.slice(-6)}`,
  );
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}_${attempt}`;
    const inserted = await db
      .insert(usersTable)
      .values({
        clerkUserId,
        username: candidate,
        name,
        email,
        avatar: clerkUser.imageUrl ?? "",
      })
      .onConflictDoNothing()
      .returning();
    if (inserted.length > 0) return inserted[0]!;

    // A unique constraint blocked us — either clerkUserId or email already exists
    // (someone else won the race), or username is taken (try next candidate).
    const [winner] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, clerkUserId));
    if (winner) return winner;
  }
  throw new Error(`Could not provision local user for Clerk id ${clerkUserId}`);
}

export function getCurrentUserId(req: Request): number {
  if (req.localUserId === undefined) {
    throw new Error("getCurrentUserId called without requireAuth middleware");
  }
  return req.localUserId;
}
