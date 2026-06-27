import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, eventsTable, eventRsvpsTable } from "@workspace/db";
import { requireAuth, getCurrentUserId } from "../lib/currentUser";

const router: IRouter = Router();
router.use(requireAuth);

async function serializeAll(userId: number) {
  const events = await db.select().from(eventsTable).orderBy(eventsTable.id);
  const rsvps = await db
    .select({ eventId: eventRsvpsTable.eventId })
    .from(eventRsvpsTable)
    .where(eq(eventRsvpsTable.userId, userId));
  const rsvpSet = new Set(rsvps.map((r) => r.eventId));
  return events.map((e) => ({
    id: e.id,
    name: e.name,
    date: e.date,
    location: e.location,
    image: e.image,
    category: e.category,
    attendees: e.attendeesCount,
    rsvp: rsvpSet.has(e.id),
  }));
}

router.get("/", async (req, res) => {
  const userId = getCurrentUserId(req);
  res.json(await serializeAll(userId));
});

router.post("/", async (req, res) => {
  const name = String(req.body.name ?? "").trim();
  const date = String(req.body.date ?? "").trim();
  const location = String(req.body.location ?? "").trim();
  const category = String(req.body.category ?? "General").trim();
  const image = String(req.body.image ?? "").trim();

  if (!name) {
    res.status(400).json({ error: "Event name is required" });
    return;
  }

  if (!date) {
    res.status(400).json({ error: "Event date is required" });
    return;
  }

  if (!location) {
    res.status(400).json({ error: "Event location is required" });
    return;
  }

  const [event] = await db
    .insert(eventsTable)
    .values({
      name,
      date,
      location,
      category,
      image: image || "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800",
      attendeesCount: 0,
    })
    .returning();

  if (!event) {
    res.status(500).json({ error: "Failed to create event" });
    return;
  }

  res.status(201).json({
    id: event.id,
    name: event.name,
    date: event.date,
    location: event.location,
    image: event.image,
    category: event.category,
    attendees: event.attendeesCount,
    rsvp: false,
  });
});

router.post("/:id/rsvp", async (req, res) => {
  const userId = getCurrentUserId(req);
  const eventId = Number(req.params.id);
  const inserted = await db
    .insert(eventRsvpsTable)
    .values({ userId: userId, eventId })
    .onConflictDoNothing()
    .returning();
  if (inserted.length > 0) {
    await db
      .update(eventsTable)
      .set({ attendeesCount: sql`${eventsTable.attendeesCount} + 1` })
      .where(eq(eventsTable.id, eventId));
  }
  await returnOne(userId, eventId, res);
});

router.delete("/:id/rsvp", async (req, res) => {
  const userId = getCurrentUserId(req);
  const eventId = Number(req.params.id);
  const deleted = await db
    .delete(eventRsvpsTable)
    .where(and(eq(eventRsvpsTable.userId, userId), eq(eventRsvpsTable.eventId, eventId)))
    .returning();
  if (deleted.length > 0) {
    await db
      .update(eventsTable)
      .set({ attendeesCount: sql`GREATEST(${eventsTable.attendeesCount} - 1, 0)` })
      .where(eq(eventsTable.id, eventId));
  }
  await returnOne(userId, eventId, res);
});

async function returnOne(userId: number, id: number, res: Parameters<Parameters<typeof router.get>[1]>[1]) {
  const all = await serializeAll(userId);
  const one = all.find((e) => e.id === id);
  if (!one) { res.status(404).json({ error: "Event not found" }); return; }
  res.json(one);
}

export default router;
