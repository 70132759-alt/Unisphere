import { Router, type IRouter } from "express";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { db, messagesTable, notificationsTable, usersTable } from "@workspace/db";
import { SendMessageBody } from "@workspace/api-zod";
import { requireAuth, getCurrentUserId } from "../lib/currentUser";
import { chatTime } from "../lib/time";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/contacts", async (req, res) => {
  const userId = getCurrentUserId(req);

  const rows = await db
    .select({
      partnerId: sql<number>`CASE WHEN ${messagesTable.senderId} = ${userId} THEN ${messagesTable.receiverId} ELSE ${messagesTable.senderId} END`.as("partner_id"),
      text: messagesTable.text,
      createdAt: messagesTable.createdAt,
    })
    .from(messagesTable)
    .where(
      or(
        and(
          eq(messagesTable.senderId, userId),
          eq(messagesTable.deletedForSender, false),
        ),
        and(
          eq(messagesTable.receiverId, userId),
          eq(messagesTable.deletedForReceiver, false),
        ),
      ),
    )
    .orderBy(desc(messagesTable.createdAt));

  const latestByPartner = new Map<number, { text: string; createdAt: Date }>();

  for (const r of rows) {
    if (!latestByPartner.has(r.partnerId)) {
      latestByPartner.set(r.partnerId, {
        text: r.text,
        createdAt: r.createdAt,
      });
    }
  }

  const partnerIds = Array.from(latestByPartner.keys());

  if (partnerIds.length === 0) {
    res.json([]);
    return;
  }

  const users = await db.select().from(usersTable);
  const userMap = new Map(users.map((u) => [u.id, u]));

  const contacts = partnerIds
    .map((pid) => {
      const u = userMap.get(pid);
      const latest = latestByPartner.get(pid);

      if (!u || !latest) return null;

      return {
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        lastMsg: latest.text,
        time: chatTime(latest.createdAt),
        online: u.id % 2 === 1,
        unread: 0,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  res.json(contacts);
});

router.get("/:userId", async (req, res) => {
  const userId = getCurrentUserId(req);
  const otherId = Number(req.params.userId);

  if (!Number.isFinite(otherId)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const rows = await db
    .select()
    .from(messagesTable)
    .where(
      or(
        and(
          eq(messagesTable.senderId, userId),
          eq(messagesTable.receiverId, otherId),
          eq(messagesTable.deletedForSender, false),
        ),
        and(
          eq(messagesTable.senderId, otherId),
          eq(messagesTable.receiverId, userId),
          eq(messagesTable.deletedForReceiver, false),
        ),
      ),
    )
    .orderBy(messagesTable.createdAt);

  res.json(
    rows.map((m) => ({
      id: m.id,
      type: m.senderId === userId ? "sent" : "received",
      text: m.text,
      isAttachment: m.isAttachment,
      image: m.image,
      filename: m.filename,
    })),
  );
});


router.delete("/message/:messageId", async (req, res) => {
  const userId = getCurrentUserId(req);
  const messageId = Number(req.params.messageId);

  if (!Number.isFinite(messageId)) {
    res.status(400).json({ error: "Invalid message id" });
    return;
  }

  const [message] = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.id, messageId));

  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  if (message.senderId !== userId && message.receiverId !== userId) {
    res.status(403).json({ error: "Not allowed" });
    return;
  }

  if (message.senderId === userId) {
    await db
      .update(messagesTable)
      .set({ deletedForSender: true })
      .where(eq(messagesTable.id, messageId));
  }

  if (message.receiverId === userId) {
    await db
      .update(messagesTable)
      .set({ deletedForReceiver: true })
      .where(eq(messagesTable.id, messageId));
  }

  await db
    .delete(messagesTable)
    .where(
      and(
        eq(messagesTable.id, messageId),
        eq(messagesTable.deletedForSender, true),
        eq(messagesTable.deletedForReceiver, true),
      ),
    );

  res.json({ ok: true });
});
router.delete("/:userId", async (req, res) => {
  const userId = getCurrentUserId(req);
  const otherId = Number(req.params.userId);

  if (!Number.isFinite(otherId)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  await db
    .update(messagesTable)
    .set({ deletedForSender: true })
    .where(
      and(
        eq(messagesTable.senderId, userId),
        eq(messagesTable.receiverId, otherId),
      ),
    );

  await db
    .update(messagesTable)
    .set({ deletedForReceiver: true })
    .where(
      and(
        eq(messagesTable.senderId, otherId),
        eq(messagesTable.receiverId, userId),
      ),
    );

  await db
    .delete(notificationsTable)
    .where(
      and(
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.actorId, otherId),
        eq(notificationsTable.type, "message"),
      ),
    );

  await db
    .delete(messagesTable)
    .where(
      and(
        or(
          and(
            eq(messagesTable.senderId, userId),
            eq(messagesTable.receiverId, otherId),
          ),
          and(
            eq(messagesTable.senderId, otherId),
            eq(messagesTable.receiverId, userId),
          ),
        ),
        eq(messagesTable.deletedForSender, true),
        eq(messagesTable.deletedForReceiver, true),
      ),
    );

  res.json({ ok: true });
});

router.post("/", async (req, res) => {
  const userId = getCurrentUserId(req);
  const body = SendMessageBody.parse(req.body) as {
    receiverId: number;
    text: string;
    isAttachment?: boolean;
    image?: string | null;
    filename?: string | null;
  };

  const [msg] = await db
    .insert(messagesTable)
    .values({
      senderId: userId,
      receiverId: body.receiverId,
      text: body.text,
      isAttachment: body.isAttachment ?? false,
      image: body.image ?? null,
      filename: body.filename ?? null,
    })
    .returning();

  if (!msg) {
    res.status(500).json({ error: "Failed to send message" });
    return;
  }

  if (body.receiverId !== userId) {
    await db.insert(notificationsTable).values({
      userId: body.receiverId,
      actorId: userId,
      type: "message",
      action: "sent you a message",
      detail: msg.text.length > 80 ? `${msg.text.slice(0, 77)}...` : msg.text,
      read: false,
    });
  }

  res.status(201).json({
    id: msg.id,
    type: "sent",
    text: msg.text,
    isAttachment: msg.isAttachment,
    image: msg.image,
    filename: msg.filename,
  });
});

export default router;




