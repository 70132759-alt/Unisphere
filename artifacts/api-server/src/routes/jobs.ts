import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, jobsTable, savedJobsTable, jobApplicationsTable } from "@workspace/db";
import { requireAuth, getCurrentUserId } from "../lib/currentUser";

const router: IRouter = Router();
router.use(requireAuth);

async function serializeAll(userId: number) {
  const jobs = await db.select().from(jobsTable).orderBy(jobsTable.id);

  const saved = await db
    .select({ jobId: savedJobsTable.jobId })
    .from(savedJobsTable)
    .where(eq(savedJobsTable.userId, userId));

  const applications = await db
    .select({ jobId: jobApplicationsTable.jobId })
    .from(jobApplicationsTable)
    .where(eq(jobApplicationsTable.userId, userId));

  const savedSet = new Set(saved.map((s) => s.jobId));
  const appliedSet = new Set(applications.map((a) => a.jobId));

  return jobs.map((j) => ({
    ...j,
    saved: savedSet.has(j.id),
    applied: appliedSet.has(j.id),
    isOwn: j.createdByUserId === userId,
  }));
}

router.get("/", async (req, res) => {
  const userId = getCurrentUserId(req);
  res.json(await serializeAll(userId));
});

router.post("/", async (req, res) => {
  const userId = getCurrentUserId(req);
  const title = String(req.body.title ?? "").trim();
  const company = String(req.body.company ?? "").trim();
  const location = String(req.body.location ?? "").trim();
  const type = String(req.body.type ?? "Internship").trim();
  const salary = String(req.body.salary ?? "").trim();
  const logo = String(req.body.logo ?? "").trim();

  const rawTags: unknown[] = Array.isArray(req.body.tags) ? req.body.tags : [];
  const tags = rawTags
    .map((tag: unknown) => String(tag).trim())
    .filter((tag: string) => tag.length > 0);

  if (!title) {
    res.status(400).json({ error: "Job title is required" });
    return;
  }

  if (!company) {
    res.status(400).json({ error: "Company name is required" });
    return;
  }

  if (!location) {
    res.status(400).json({ error: "Location is required" });
    return;
  }

  const defaultLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    company,
  )}&background=4f46e5&color=fff&bold=true`;

  const [job] = await db
    .insert(jobsTable)
    .values({
      createdByUserId: userId,
      title,
      company,
      location,
      type,
      salary,
      tags,
      logo: logo || defaultLogo,
    })
    .returning();

  if (!job) {
    res.status(500).json({ error: "Failed to create job" });
    return;
  }

  res.status(201).json({
    ...job,
    saved: false,
    applied: false,
    isOwn: true,
  });
});

router.delete("/:id", async (req, res) => {
  const userId = getCurrentUserId(req);
  const jobId = Number(req.params.id);

  if (!Number.isFinite(jobId)) {
    res.status(400).json({ error: "Invalid job id" });
    return;
  }

  const deleted = await db
    .delete(jobsTable)
    .where(and(eq(jobsTable.id, jobId), eq(jobsTable.createdByUserId, userId)))
    .returning({ id: jobsTable.id });

  if (deleted.length === 0) {
    res.status(404).json({ error: "Job not found or you do not have permission to delete it" });
    return;
  }

  res.status(204).send();
});

router.post("/:id/save", async (req, res) => {
  const userId = getCurrentUserId(req);
  const jobId = Number(req.params.id);

  if (!Number.isFinite(jobId)) {
    res.status(400).json({ error: "Invalid job id" });
    return;
  }

  await db
    .insert(savedJobsTable)
    .values({ userId, jobId })
    .onConflictDoNothing();

  await returnOne(userId, jobId, res);
});

router.delete("/:id/save", async (req, res) => {
  const userId = getCurrentUserId(req);
  const jobId = Number(req.params.id);

  if (!Number.isFinite(jobId)) {
    res.status(400).json({ error: "Invalid job id" });
    return;
  }

  await db
    .delete(savedJobsTable)
    .where(and(eq(savedJobsTable.userId, userId), eq(savedJobsTable.jobId, jobId)));

  await returnOne(userId, jobId, res);
});

router.post("/:id/apply", async (req, res) => {
  const userId = getCurrentUserId(req);
  const jobId = Number(req.params.id);

  if (!Number.isFinite(jobId)) {
    res.status(400).json({ error: "Invalid job id" });
    return;
  }

  await db
    .insert(jobApplicationsTable)
    .values({ userId, jobId })
    .onConflictDoNothing();

  await returnOne(userId, jobId, res);
});

router.delete("/:id/apply", async (req, res) => {
  const userId = getCurrentUserId(req);
  const jobId = Number(req.params.id);

  if (!Number.isFinite(jobId)) {
    res.status(400).json({ error: "Invalid job id" });
    return;
  }

  await db
    .delete(jobApplicationsTable)
    .where(and(eq(jobApplicationsTable.userId, userId), eq(jobApplicationsTable.jobId, jobId)));

  await returnOne(userId, jobId, res);
});

async function returnOne(
  userId: number,
  id: number,
  res: Parameters<Parameters<typeof router.get>[1]>[1],
) {
  const all = await serializeAll(userId);
  const one = all.find((j) => j.id === id);

  if (!one) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.json(one);
}

export default router;
