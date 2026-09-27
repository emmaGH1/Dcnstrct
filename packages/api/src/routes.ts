/**
 * routes.ts — Express HTTP API
 *
 * SOURCE_ALLOWLIST: packages/api/src/routes.ts
 *
 * GET  /api/scenarios        — list scenario descriptors
 * POST /api/runs             — create and execute a new isolated run
 * GET  /api/runs/:id         — poll run status and events
 * POST /api/demo/reset       — wipe all data (dev/demo only)
 */
import { Router } from "express";
import type { Db } from "./db";
import { CreateRunRequestSchema } from "@dcnstrct/shared";
import { executeRun, loadRun, loadNotifications, loadOrdersForRun } from "./runs";
import type { ScenarioId } from "@dcnstrct/shared";
import { SCENARIOS } from "./scenarios";

export function buildRouter(db: Db): Router {
  const router = Router();

  // GET /api/scenarios
  router.get("/scenarios", (_req, res) => {
    res.json(SCENARIOS);
  });

  // POST /api/runs  { scenarioId }
  router.post("/runs", (req, res) => {
    const parsed = CreateRunRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", issues: parsed.error.issues });
      return;
    }
    try {
      const runId = executeRun(db, parsed.data.scenarioId as ScenarioId);
      res.status(201).json({ runId });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: message });
    }
  });

  // GET /api/runs/:id
  router.get("/runs/:id", (req, res) => {
    const run = loadRun(db, req.params.id);
    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }
    const notifications = loadNotifications(db, run.id);
    const orders = loadOrdersForRun(db, run.id);
    res.json({ run, notifications, orders });
  });

  // POST /api/demo/reset — clears all tables; never exposed in production
  router.post("/demo/reset", (_req, res) => {
    if (process.env.NODE_ENV === "production") {
      res.status(403).json({ error: "Reset not available in production" });
      return;
    }
    db.exec(
      `DELETE FROM run_events;
       DELETE FROM notifications;
       DELETE FROM fulfillment_jobs;
       DELETE FROM orders;
       DELETE FROM runs;`
    );
    res.json({ ok: true });
  });

  return router;
}
