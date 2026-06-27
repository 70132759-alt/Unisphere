import { Router, type IRouter } from "express";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { db, postsTable, commentsTable, likesTable, usersTable } from "@workspace/db";
import { CreatePostBody, CreateCommentBody } from "@workspace/api-zod";
import { requireAuth, getCurrentUserId } from "../lib/currentUser";
import { relativeTime } from "../lib/time";

const router: IRouter = Router();
router.use(requireAuth);

export async function serializePosts(userId: number, rows: { post: typeof postsTable.$inferSelect; author: typeof usersTable.$inferSelect }[]) {
  if (rows.length === 0) return [];
  const postIds = rows.map((r) => r.post.id);

  const liked = await db
    .select({ postId: likesTable.postId })
    .from(likesTable)
    .where(and(eq(likesTable.userId, userId), inArray(likesTable.postId, postIds)));
  const likedSet = new Set(liked.map((l) => l.postId));

  const comments = await db
    .select({
      id: commentsTable.id,
      postId: commentsTable.postId,
      text: commentsTable.text,
      createdAt: commentsTable.createdAt,
      authorName: usersTable.name,
      authorAvatar: usersTable.avatar,
    })
    .from(commentsTable)
    .innerJoin(usersTable, eq(commentsTable.authorId, usersTable.id))
    .where(inArray(commentsTable.postId, postIds))
    .orderBy(commentsTable.createdAt);

  return rows.map(({ post, author }) => ({
    id: post.id,
    author: author.name,
    major: `${author.major} • ${relativeTime(post.createdAt)}`,
    avatar: author.avatar,
    content: post.content,
    hashtags: post.hashtags,
    image: post.image,
    likes: post.likesCount,
    comments: post.commentsCount,
    isLiked: likedSet.has(post.id),
    isOwn: post.authorId === userId,
    commentList: comments
      .filter((c) => c.postId === post.id)
      .map((c) => ({
        id: c.id,
        postId: c.postId,
        author: c.authorName,
        avatar: c.authorAvatar,
        text: c.text,
        time: relativeTime(c.createdAt),
      })),
  }));
}

router.get("/", async (req, res) => {
  const userId = getCurrentUserId(req);
  const rows = await db
    .select({ post: postsTable, author: usersTable })
    .from(postsTable)
    .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .orderBy(desc(postsTable.createdAt));
  res.json(await serializePosts(userId, rows));
});

router.post("/", async (req, res) => {
  const userId = getCurrentUserId(req);
  const body = CreatePostBody.parse(req.body);
  const [post] = await db
    .insert(postsTable)
    .values({
      authorId: userId,
      content: body.content,
      hashtags: body.hashtags ?? "",
      image: body.image ?? null,
    })
    .returning();
  if (!post) { res.status(500).json({ error: "Failed to create post" }); return; }
  await db
    .update(usersTable)
    .set({ postsCount: sql`${usersTable.postsCount} + 1` })
    .where(eq(usersTable.id, userId));
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!author) { res.status(500).json({ error: "Author not found" }); return; }
  const [serialized] = await serializePosts(userId, [{ post, author }]);
  res.status(201).json(serialized);
});

router.delete("/:id", async (req, res) => {
  const userId = getCurrentUserId(req);
  const postId = Number(req.params.id);
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }
  if (post.authorId !== userId) { res.status(403).json({ error: "Not your post" }); return; }
  await db.delete(postsTable).where(eq(postsTable.id, postId));
  await db
    .update(usersTable)
    .set({ postsCount: sql`GREATEST(${usersTable.postsCount} - 1, 0)` })
    .where(eq(usersTable.id, userId));
  res.json({ ok: true });
});

router.post("/:id/like", async (req, res) => {
  const userId = getCurrentUserId(req);
  const postId = Number(req.params.id);
  const inserted = await db
    .insert(likesTable)
    .values({ userId: userId, postId })
    .onConflictDoNothing()
    .returning();
  if (inserted.length > 0) {
    await db
      .update(postsTable)
      .set({ likesCount: sql`${postsTable.likesCount} + 1` })
      .where(eq(postsTable.id, postId));
  }
  await returnPost(userId, postId, res);
});

router.delete("/:id/like", async (req, res) => {
  const userId = getCurrentUserId(req);
  const postId = Number(req.params.id);
  const deleted = await db
    .delete(likesTable)
    .where(and(eq(likesTable.userId, userId), eq(likesTable.postId, postId)))
    .returning();
  if (deleted.length > 0) {
    await db
      .update(postsTable)
      .set({ likesCount: sql`GREATEST(${postsTable.likesCount} - 1, 0)` })
      .where(eq(postsTable.id, postId));
  }
  await returnPost(userId, postId, res);
});

router.post("/:id/comments", async (req, res) => {
  const userId = getCurrentUserId(req);
  const postId = Number(req.params.id);
  const body = CreateCommentBody.parse(req.body);
  const [comment] = await db
    .insert(commentsTable)
    .values({ postId, authorId: userId, text: body.text })
    .returning();
  if (!comment) { res.status(500).json({ error: "Failed to create comment" }); return; }
  await db
    .update(postsTable)
    .set({ commentsCount: sql`${postsTable.commentsCount} + 1` })
    .where(eq(postsTable.id, postId));
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!author) { res.status(500).json({ error: "Author not found" }); return; }
  res.status(201).json({
    id: comment.id,
    postId: comment.postId,
    author: author.name,
    avatar: author.avatar,
    text: comment.text,
    time: relativeTime(comment.createdAt),
  });
});

async function returnPost(userId: number, postId: number, res: Parameters<Parameters<typeof router.get>[1]>[1]) {
  const [row] = await db
    .select({ post: postsTable, author: usersTable })
    .from(postsTable)
    .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .where(eq(postsTable.id, postId));
  if (!row) { res.status(404).json({ error: "Post not found" }); return; }
  const [serialized] = await serializePosts(userId, [row]);
  res.json(serialized);
}

export default router;
