import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, notificationsTable, usersTable } from "@workspace/db";
import { requireAuth, getCurrentUserId } from "../lib/currentUser";
import { relativeTime } from "../lib/time";

const router: IRouter = Router();
router.use(requireAuth);

const TYPE_META: Record<string, { icon: string; color: string }> = {
  like: { icon: "fas fa-heart", color: "#ef4444" },
  comment: { icon: "fas fa-comment", color: "#4f46e5" },
  follow: { icon: "fas fa-user-plus", color: "#10b981" },
  mention: { icon: "fas fa-at", color: "#f59e0b" },
  event: { icon: "fas fa-calendar-check", color: "#4f46e5" },
  message: { icon: "fas fa-message", color: "#2563eb" },
};

router.get("/", async (req, res) => {
  const userId = getCurrentUserId(req);
  const rows = await db
    .select({ n: notificationsTable, actor: usersTable })
    .from(notificationsTable)
    .leftJoin(usersTable, eq(notificationsTable.actorId, usersTable.id))
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt));

  res.json(
    rows.map(({ n, actor }) => {
      const meta = TYPE_META[n.type] ?? { icon: "fas fa-bell", color: "#64748b" };
      return {
        id: n.id,
        type: n.type,
        icon: meta.icon,
        color: meta.color,
        user: actor?.name ?? "System",
        action: n.action,
        detail: n.detail,
        time: relativeTime(n.createdAt),
        avatar: actor?.avatar ?? "",
        read: n.read,
      };
    }),
  );
});

router.delete("/:id", async (req, res) => {
  const userId = getCurrentUserId(req);
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid notification id" });
    return;
  }

  await db
    .delete(notificationsTable)
    .where(
      and(
        eq(notificationsTable.id, id),
        eq(notificationsTable.userId, userId),
      ),
    );

  res.json({ ok: true });
});

router.post("/read-all", async (req, res) => {
  const userId = getCurrentUserId(req);

  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(eq(notificationsTable.userId, userId));

  res.json({ ok: true });
});
router.post("/type/:type/read", async (req, res) => {
  const userId = getCurrentUserId(req);
  const type = req.params.type;

  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(
      and(
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.type, type),
      ),
    );

  res.json({ ok: true });
});

export default router;
