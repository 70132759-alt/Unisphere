import { Router, type IRouter } from "express";
import { eq, and, ne, sql } from "drizzle-orm";
import { db, usersTable, followsTable } from "@workspace/db";
import { UpdateCurrentUserBody } from "@workspace/api-zod";
import { requireAuth, getCurrentUserId } from "../lib/currentUser";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/me", async (req, res) => {
  const userId = getCurrentUserId(req);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
});

router.patch("/me", async (req, res) => {
  const userId = getCurrentUserId(req);
  const body = UpdateCurrentUserBody.parse(req.body);
  const [user] = await db.update(usersTable).set(body).where(eq(usersTable.id, userId)).returning();
  res.json(user);
});

router.get("/suggestions", async (req, res) => {
  const userId = getCurrentUserId(req);
  const users = await db
    .select({ id: usersTable.id, name: usersTable.name, major: usersTable.major, avatar: usersTable.avatar })
    .from(usersTable)
    .where(ne(usersTable.id, userId))
    .limit(3);

  const follows = await db
    .select({ followedId: followsTable.followedId })
    .from(followsTable)
    .where(eq(followsTable.followerId, userId));
  const followedSet = new Set(follows.map((f) => f.followedId));

  res.json(users.map((u) => ({ ...u, isFollowing: followedSet.has(u.id) })));
});

router.get("/:id", async (req, res) => {
  const userId = getCurrentUserId(req);
  const id = Number(req.params.id);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
});

router.post("/:id/follow", async (req, res) => {
  const userId = getCurrentUserId(req);
  const followedId = Number(req.params.id);
  if (followedId === userId) { res.status(400).json({ error: "Cannot follow self" }); return; }
  const inserted = await db
    .insert(followsTable)
    .values({ followerId: userId, followedId })
    .onConflictDoNothing()
    .returning();
  if (inserted.length > 0) {
    await db
      .update(usersTable)
      .set({ followingCount: sql`${usersTable.followingCount} + 1` })
      .where(eq(usersTable.id, userId));
    await db
      .update(usersTable)
      .set({ followersCount: sql`${usersTable.followersCount} + 1` })
      .where(eq(usersTable.id, followedId));
  }
  res.json({ ok: true });
});

router.delete("/:id/follow", async (req, res) => {
  const userId = getCurrentUserId(req);
  const followedId = Number(req.params.id);
  const deleted = await db
    .delete(followsTable)
    .where(and(eq(followsTable.followerId, userId), eq(followsTable.followedId, followedId)))
    .returning();
  if (deleted.length > 0) {
    await db
      .update(usersTable)
      .set({ followingCount: sql`GREATEST(${usersTable.followingCount} - 1, 0)` })
      .where(eq(usersTable.id, userId));
    await db
      .update(usersTable)
      .set({ followersCount: sql`GREATEST(${usersTable.followersCount} - 1, 0)` })
      .where(eq(usersTable.id, followedId));
  }
  res.json({ ok: true });
});

export default router;
