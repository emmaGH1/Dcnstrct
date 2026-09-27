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

  // POST /api/demo/reset — clears data for a specific run, or all rows in non-production.
  // Body: { runId?: string }
  // If runId is provided: wipes only that run's rows (safe for public visitors).
  // If runId is absent: wipes all rows in non-production only (dev/local demo).
  // Production without runId: returns 403.
  router.post("/demo/reset", (req, res) => {
    const { runId } = req.body as { runId?: string };

    if (runId) {
      // Visitor-scoped reset — always allowed; clears only the supplied run.
      db.prepare(`DELETE FROM run_events WHERE run_id = ?`).run(runId);
      db.prepare(`DELETE FROM notifications WHERE run_id = ?`).run(runId);
      db.prepare(`DELETE FROM fulfillment_jobs WHERE run_id = ?`).run(runId);
      db.prepare(`DELETE FROM orders WHERE run_id = ?`).run(runId);
      db.prepare(`DELETE FROM runs WHERE id = ?`).run(runId);
      res.json({ ok: true });
      return;
    }

    // Global reset — dev/demo only
    if (process.env.NODE_ENV === "production") {
      res.status(403).json({ error: "Global reset not available in production. Supply a runId to reset your own run." });
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
