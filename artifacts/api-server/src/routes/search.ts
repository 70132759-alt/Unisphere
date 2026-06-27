import { Router, type IRouter } from "express";
import { eq, or, ilike, desc, and, ne } from "drizzle-orm";
import { db, usersTable, postsTable, societiesTable, followsTable } from "@workspace/db";
import { requireAuth, getCurrentUserId } from "../lib/currentUser";
import { serializePosts } from "./posts";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const userId = getCurrentUserId(req);
  const q = String(req.query.q ?? "").trim();
  if (!q) {
    res.json({ users: [], posts: [], societies: [] });
    return;
  }
  const like = `%${q}%`;

  const userRows = await db
    .select()
    .from(usersTable)
    .where(
      and(
        ne(usersTable.id, userId),
        or(
          ilike(usersTable.name, like),
          ilike(usersTable.username, like),
          ilike(usersTable.major, like),
        ),
      ),
    )
    .limit(10);

  const following = await db
    .select({ followedId: followsTable.followedId })
    .from(followsTable)
    .where(eq(followsTable.followerId, userId));
  const followingSet = new Set(following.map((f) => f.followedId));

  const users = userRows.map((u) => ({
    id: u.id,
    name: u.name,
    major: u.major,
    avatar: u.avatar,
    isFollowing: followingSet.has(u.id),
  }));

  const postRows = await db
    .select({ post: postsTable, author: usersTable })
    .from(postsTable)
    .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .where(or(ilike(postsTable.content, like), ilike(postsTable.hashtags, like)))
    .orderBy(desc(postsTable.createdAt))
    .limit(10);
  const posts = await serializePosts(userId, postRows);

  const societyRows = await db
    .select()
    .from(societiesTable)
    .where(or(ilike(societiesTable.name, like), ilike(societiesTable.description, like)))
    .limit(10);
  const societies = societyRows.map((s) => ({
    id: s.id,
    name: s.name,
    desc: s.description,
    icon: s.icon,
    members: s.membersCount,
    joined: false,
  }));

  res.json({ users, posts, societies });
});

export default router;
