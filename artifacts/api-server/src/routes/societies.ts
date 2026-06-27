import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, societiesTable, societyMembersTable } from "@workspace/db";
import { requireAuth, getCurrentUserId } from "../lib/currentUser";

const router: IRouter = Router();
router.use(requireAuth);

async function serializeAll(userId: number) {
  const societies = await db.select().from(societiesTable).orderBy(societiesTable.id);
  const memberships = await db
    .select({ societyId: societyMembersTable.societyId })
    .from(societyMembersTable)
    .where(eq(societyMembersTable.userId, userId));
  const joinedSet = new Set(memberships.map((m) => m.societyId));
  return societies.map((s) => ({
    id: s.id,
    name: s.name,
    desc: s.description,
    icon: s.icon,
    members: s.membersCount,
    joined: joinedSet.has(s.id),
  }));
}

router.get("/", async (req, res) => {
  const userId = getCurrentUserId(req);
  res.json(await serializeAll(userId));
});

router.post("/", async (req, res) => {
  const userId = getCurrentUserId(req);

  const name = String(req.body.name ?? "").trim();
  const description = String(req.body.description ?? "").trim();
  const icon = String(req.body.icon ?? "fas fa-users").trim();

  if (!name) {
    res.status(400).json({ error: "Society name is required" });
    return;
  }

  const [society] = await db
    .insert(societiesTable)
    .values({
      name,
      description,
      icon,
      membersCount: 1,
    })
    .returning();

  if (!society) {
    res.status(500).json({ error: "Failed to create society" });
    return;
  }

  await db
    .insert(societyMembersTable)
    .values({
      userId,
      societyId: society.id,
    })
    .onConflictDoNothing();

  res.status(201).json({
    id: society.id,
    name: society.name,
    desc: society.description,
    icon: society.icon,
    members: society.membersCount,
    joined: true,
  });
});

router.post("/:id/join", async (req, res) => {
  const userId = getCurrentUserId(req);
  const societyId = Number(req.params.id);
  const inserted = await db
    .insert(societyMembersTable)
    .values({ userId: userId, societyId })
    .onConflictDoNothing()
    .returning();
  if (inserted.length > 0) {
    await db
      .update(societiesTable)
      .set({ membersCount: sql`${societiesTable.membersCount} + 1` })
      .where(eq(societiesTable.id, societyId));
  }
  await returnOne(userId, societyId, res);
});

router.delete("/:id/join", async (req, res) => {
  const userId = getCurrentUserId(req);
  const societyId = Number(req.params.id);
  const deleted = await db
    .delete(societyMembersTable)
    .where(and(eq(societyMembersTable.userId, userId), eq(societyMembersTable.societyId, societyId)))
    .returning();
  if (deleted.length > 0) {
    await db
      .update(societiesTable)
      .set({ membersCount: sql`GREATEST(${societiesTable.membersCount} - 1, 0)` })
      .where(eq(societiesTable.id, societyId));
  }
  await returnOne(userId, societyId, res);
});

async function returnOne(userId: number, id: number, res: Parameters<Parameters<typeof router.get>[1]>[1]) {
  const all = await serializeAll(userId);
  const one = all.find((s) => s.id === id);
  if (!one) { res.status(404).json({ error: "Society not found" }); return; }
  res.json(one);
}

export default router;
