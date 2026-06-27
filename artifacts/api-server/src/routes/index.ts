import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { z } from "zod/v4";
import healthRouter from "./health";
import usersRouter from "./users";
import postsRouter from "./posts";
import societiesRouter from "./societies";
import eventsRouter from "./events";
import jobsRouter from "./jobs";
import messagesRouter from "./messages";
import notificationsRouter from "./notifications";
import miscRouter from "./misc";
import searchRouter from "./search";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/posts", postsRouter);
router.use("/societies", societiesRouter);
router.use("/events", eventsRouter);
router.use("/jobs", jobsRouter);
router.use("/messages", messagesRouter);
router.use("/notifications", notificationsRouter);
router.use("/search", searchRouter);
router.use(storageRouter);
router.use(miscRouter);

router.use((err: Error, req: Request, res: Response, _next: NextFunction): void => {
  if (err instanceof z.ZodError) {
    req.log.warn({ err }, "Validation error");
    res.status(400).json({ error: "Validation failed", details: err.issues });
    return;
  }
  req.log.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

export default router;
