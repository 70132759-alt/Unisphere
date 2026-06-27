import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, buildingsTable, storiesTable, postsTable, usersTable } from "@workspace/db";
import { CreateStoryBody } from "@workspace/api-zod";
import { requireAuth, getCurrentUserId } from "../lib/currentUser";

const router: IRouter = Router();

router.get("/stories", requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req);
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db
    .select()
    .from(storiesTable)
    .where(sql`${storiesTable.createdAt} > ${cutoff}`)
    .orderBy(desc(storiesTable.id));
  res.json([
    { id: 0, name: "Add Story", image: null, isAdd: true },
    ...rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), isOwn: r.userId === userId })),
  ]);
});

router.post("/stories", requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req);
  const body = CreateStoryBody.parse(req.body);
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const [story] = await db
    .insert(storiesTable)
    .values({ userId, name: body.name ?? me?.name ?? "You", image: body.image })
    .returning();
  if (!story) { res.status(500).json({ error: "Failed to create story" }); return; }
  res.status(201).json(story);
});

router.delete("/stories/:id", requireAuth, async (req, res) => {
  const userId = getCurrentUserId(req);
  const storyId = Number(req.params.id);
  const [story] = await db.select().from(storiesTable).where(eq(storiesTable.id, storyId));
  if (!story) { res.status(404).json({ error: "Story not found" }); return; }
  if (story.userId !== userId) { res.status(403).json({ error: "Not your story" }); return; }
  await db.delete(storiesTable).where(eq(storiesTable.id, storyId));
  res.json({ ok: true });
});

router.get("/buildings", async (_req, res) => {
  const rows = await db.select().from(buildingsTable).orderBy(buildingsTable.id);
  res.json(rows);
});

const HASHTAG_RE = /#[\p{L}\p{N}_]+/gu;

router.get("/trending", async (_req, res) => {
  const rows = await db.select({ content: postsTable.content, hashtags: postsTable.hashtags }).from(postsTable);
  const counts = new Map<string, number>();
  for (const row of rows) {
    const text = `${row.content} ${row.hashtags}`;
    const matches = text.match(HASHTAG_RE) ?? [];
    const seen = new Set<string>();
    for (const m of matches) {
      const tag = m.toLowerCase();
      if (seen.has(tag)) continue;
      seen.add(tag);
      counts.set(m, (counts.get(m) ?? 0) + 1);
    }
  }
  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([title, count], i) => ({
      rank: i + 1,
      title,
      posts: `${count} ${count === 1 ? "post" : "posts"}`,
    }));
  res.json(sorted);
});

export default router;
