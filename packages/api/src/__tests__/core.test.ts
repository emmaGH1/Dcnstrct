/**
 * core.test.ts — meaningful checks for checkpoint 01 + review fixes
 *
 * Tests cover:
 *  1. cancel_preparing: accepted, side effects persist, worker skips
 *  2. cancel_shipped: refused, state unchanged, no notifications
 *  3. worker_status_read event distinct from worker_skip
 *  4. job seeded before cancellation (job exists in DB before order is cancelled)
 *  5. runWorkerPhase skip and ship tested independently
 *  6. worker_ship persists order status to shipped
 *  7. isolation: two concurrent runs do not share data
 *  8. reset: /api/demo/reset wipes all rows
 *  9. invalid scenario returns 400
 */
import request from "supertest";
import express from "express";
import cors from "cors";
import fs from "fs";
import os from "os";
import path from "path";
import { createTestDb } from "../db";
import { buildPresentationRouter } from "../presentation";
import { buildRouter } from "../routes";
import { loadRun, loadNotifications, loadOrdersForRun, runWorkerPhase } from "../runs";
import { SOURCE_ALLOWLIST, computeSourceRevision } from "@dcnstrct/shared";
import { getSourceRevision } from "../scenarios";
import type { RunEvent } from "@dcnstrct/shared";

function buildTestApp() {
  const db = createTestDb();
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api", buildRouter(db));
  return { app, db };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function createRun(app: express.Express, scenarioId: string) {
  const res = await request(app).post("/api/runs").send({ scenarioId });
  expect(res.status).toBe(201);
  expect(res.body.runId).toBeTruthy();
  return res.body.runId as string;
}

async function getRun(app: express.Express, runId: string) {
  const res = await request(app).get(`/api/runs/${runId}`);
  expect(res.status).toBe(200);
  return res.body as {
    run: {
      id: string;
      status: string;
      cancelAccepted: boolean | null;
      refusalReason: string | null;
      events: Array<{ id: string; role: string; kind: string; outcome: string; sequence: number; parentId: string | null; before: unknown; after: unknown; sourceRef: { file: string; startLine: number; endLine: number } }>;
    };
    notifications: Array<{ id: string; type: string; message: string }>;
    orders: Array<{ id: string; status: string }>;
  };
}

// ── 1. cancel_preparing: accepted, side effects, worker skip ─────────────────

describe("cancel_preparing — accepted path", () => {
  let body: Awaited<ReturnType<typeof getRun>>;

  beforeAll(async () => {
    const { app } = buildTestApp();
    const runId = await createRun(app, "cancel_preparing");
    body = await getRun(app, runId);
  });

  it("run status is completed", () => {
    expect(body.run.status).toBe("completed");
  });

  it("cancelAccepted is true", () => {
    expect(body.run.cancelAccepted).toBe(true);
  });

  it("refusalReason is null", () => {
    expect(body.run.refusalReason).toBeNull();
  });

  it("order final status is cancelled", () => {
    const order = body.orders[0];
    expect(order).toBeDefined();
    expect(order.status).toBe("cancelled");
  });

  it("exactly one cancellation notification persisted", () => {
    const cancels = body.notifications.filter((n) => n.type === "order_cancelled");
    expect(cancels).toHaveLength(1);
  });

  it("events include a policy_accept event", () => {
    const policyEvt = body.run.events.find((e) => e.kind === "policy_accept");
    expect(policyEvt).toBeDefined();
    expect(policyEvt?.outcome).toBe("success");
  });

  it("events include an order_status_update db_write event with correct before/after", () => {
    const dbEvt = body.run.events.find((e) => e.kind === "order_status_update");
    expect(dbEvt).toBeDefined();
    expect(dbEvt?.role).toBe("db_write");
    const before = dbEvt?.before as { status?: string } | null;
    const after = dbEvt?.after as { status?: string } | null;
    expect(before?.status).toBe("preparing");
    expect(after?.status).toBe("cancelled");
  });

  it("events include a notification_persisted event", () => {
    const notifEvt = body.run.events.find((e) => e.kind === "notification_persisted");
    expect(notifEvt).toBeDefined();
    expect(notifEvt?.outcome).toBe("success");
  });

  it("events include a job_queue event followed by worker_start", () => {
    const seqs = body.run.events.map((e) => e.kind);
    const queueIdx = seqs.indexOf("job_queue");
    const startIdx = seqs.indexOf("worker_start");
    expect(queueIdx).toBeGreaterThanOrEqual(0);
    expect(startIdx).toBeGreaterThan(queueIdx);
  });

  it("events include a worker_status_read event with role db_read (distinct from worker_skip)", () => {
    const readEvt = body.run.events.find((e) => e.kind === "worker_status_read" && e.role === "db_read");
    expect(readEvt).toBeDefined();
    expect(readEvt?.outcome).toBe("success");
  });

  it("job_queue event appears before order_status_update (job seeded before cancel)", () => {
    const seqs = body.run.events;
    const jobQueueSeq = seqs.find((e) => e.kind === "job_queue")?.sequence ?? -1;
    const cancelSeq = seqs.find((e) => e.kind === "order_status_update")?.sequence ?? -1;
    expect(jobQueueSeq).toBeGreaterThan(0);
    expect(cancelSeq).toBeGreaterThan(jobQueueSeq);
  });

  it("events include a worker_skip event (worker observed cancelled state)", () => {
    const skipEvt = body.run.events.find((e) => e.kind === "worker_skip" && e.role === "worker_phase");
    expect(skipEvt).toBeDefined();
    expect(skipEvt?.outcome).toBe("skipped");
  });

  it("no worker_ship event emitted", () => {
    const shipEvt = body.run.events.find((e) => e.kind === "worker_ship");
    expect(shipEvt).toBeUndefined();
  });

  it("events have monotonically increasing sequence numbers", () => {
    const seqs = body.run.events.map((e) => e.sequence);
    for (let i = 1; i < seqs.length; i++) {
      expect(seqs[i]).toBeGreaterThan(seqs[i - 1]);
    }
  });

  it("every event carries a valid sourceRef pointing to an allowlisted file", () => {
    for (const evt of body.run.events) {
      expect(evt.sourceRef.file).toBeTruthy();
      expect(SOURCE_ALLOWLIST).toContain(evt.sourceRef.file);
      expect(evt.sourceRef.startLine).toBeGreaterThan(0);
      expect(evt.sourceRef.endLine).toBeGreaterThanOrEqual(evt.sourceRef.startLine);
      const sourcePath = path.resolve(__dirname, "../../../..", evt.sourceRef.file);
      expect(fs.existsSync(sourcePath)).toBe(true);
      const sourceLines = fs.readFileSync(sourcePath, "utf8").split(/\r?\n/);
      expect(evt.sourceRef.endLine).toBeLessThanOrEqual(sourceLines.length);
    }
  });

  it("trigger event has null parentId; all subsequent events have a parentId", () => {
    const trigger = body.run.events.find((e) => e.role === "trigger");
    expect(trigger?.parentId).toBeNull();
    const nonTrigger = body.run.events.filter((e) => e.role !== "trigger");
    for (const e of nonTrigger) {
      expect(e.parentId).not.toBeNull();
    }
  });

  it("final completion event is present with run_complete kind", () => {
    const completion = body.run.events.find((e) => e.role === "completion");
    expect(completion).toBeDefined();
    expect(completion?.kind).toBe("run_complete");
  });
});

// ── 2. cancel_shipped: refused, state preserved, no notifications ────────────

describe("cancel_shipped — refusal path", () => {
  let body: Awaited<ReturnType<typeof getRun>>;

  beforeAll(async () => {
    const { app } = buildTestApp();
    const runId = await createRun(app, "cancel_shipped");
    body = await getRun(app, runId);
  });

  it("run status is completed", () => {
    expect(body.run.status).toBe("completed");
  });

  it("cancelAccepted is false", () => {
    expect(body.run.cancelAccepted).toBe(false);
  });

  it("refusalReason mentions return portal", () => {
    expect(body.run.refusalReason).toMatch(/return/i);
  });

  it("order status remains shipped (unchanged)", () => {
    const order = body.orders[0];
    expect(order).toBeDefined();
    expect(order.status).toBe("shipped");
  });

  it("zero notifications created", () => {
    expect(body.notifications).toHaveLength(0);
  });

  it("policy_refuse event emitted", () => {
    const refuseEvt = body.run.events.find((e) => e.kind === "policy_refuse");
    expect(refuseEvt).toBeDefined();
    expect(refuseEvt?.outcome).toBe("refused");
  });

  it("no order_status_update event emitted (state not mutated)", () => {
    const updateEvt = body.run.events.find((e) => e.kind === "order_status_update");
    expect(updateEvt).toBeUndefined();
  });

  it("no worker events emitted", () => {
    const workerEvts = body.run.events.filter((e) =>
      ["job_queue", "worker_start", "worker_skip", "worker_ship"].includes(e.kind)
    );
    expect(workerEvts).toHaveLength(0);
  });

  it("before and after state on policy_refuse are both shipped", () => {
    const refuseEvt = body.run.events.find((e) => e.kind === "policy_refuse");
    const before = refuseEvt?.before as { status?: string } | null;
    const after = refuseEvt?.after as { status?: string } | null;
    expect(before?.status).toBe("shipped");
    expect(after?.status).toBe("shipped");
  });

  it("completion event present with refused outcome", () => {
    const completion = body.run.events.find((e) => e.role === "completion");
    expect(completion).toBeDefined();
    expect(completion?.outcome).toBe("refused");
  });
});

// ── 3. runWorkerPhase — independent skip and ship tests ──────────────────────

import { nanoid } from "nanoid";

describe("runWorkerPhase — independent worker skip (order cancelled before worker runs)", () => {
  it("skips shipment and persists job as skipped when order is cancelled", () => {
    const db = createTestDb();
    // Minimal fixtures: insert a run row, order, and job directly
    const rId = `run_${nanoid(10)}`;
    const oId = `ord_${rId.slice(4)}`;
    const jId = `job_${rId.slice(4)}`;
    const ts = new Date().toISOString();

    db.exec(`
      INSERT INTO runs (id, scenario_id, scenario_fingerprint, source_revision, status, started_at)
      VALUES ('${rId}', 'cancel_preparing', 'fp_test', 'rev_test', 'running', '${ts}');
      INSERT INTO orders (id, run_id, customer_id, item, quantity, status, created_at, updated_at)
      VALUES ('${oId}', '${rId}', 'cust_synthetic', 'Widget A', 1, 'cancelled', '${ts}', '${ts}');
      INSERT INTO fulfillment_jobs (id, run_id, order_id, status, created_at)
      VALUES ('${jId}', '${rId}', '${oId}', 'queued', '${ts}');
    `);

    const emitted: RunEvent[] = [];
    let seq = 0;
    function emit(evt: Omit<RunEvent, "id" | "sequence" | "timestamp">): RunEvent {
      seq += 1;
      const full = {
        ...evt,
        id: `evt_${rId.slice(4)}_${String(seq).padStart(2, "0")}`,
        sequence: seq,
        timestamp: new Date().toISOString(),
      } as RunEvent;
      emitted.push(full);
      return full;
    }

    runWorkerPhase(db, rId, oId, jId, "evt_parent_00", emit as Parameters<typeof runWorkerPhase>[5]);

    const statusReadEvt = emitted.find((e) => e.kind === "worker_status_read");
    expect(statusReadEvt).toBeDefined();
    expect(statusReadEvt?.role).toBe("db_read");
    expect((statusReadEvt?.observedData as { observedStatus?: string })?.observedStatus).toBe("cancelled");

    const skipEvt = emitted.find((e) => e.kind === "worker_skip");
    expect(skipEvt).toBeDefined();
    expect(skipEvt?.outcome).toBe("skipped");
    expect(skipEvt?.role).toBe("worker_phase");

    // Verify actual persisted DB state
    const jobRow = db.prepare("SELECT status FROM fulfillment_jobs WHERE id = ?").get(jId) as { status: string };
    expect(jobRow.status).toBe("skipped");

    // No order status mutation
    const orderRow = db.prepare("SELECT status FROM orders WHERE id = ?").get(oId) as { status: string };
    expect(orderRow.status).toBe("cancelled");
  });
});

describe("runWorkerPhase — independent worker ship (order still preparing when worker runs)", () => {
  it("transitions order to shipped and marks job done", () => {
    const db = createTestDb();
    const rId = `run_${nanoid(10)}`;
    const oId = `ord_${rId.slice(4)}`;
    const jId = `job_${rId.slice(4)}`;
    const ts = new Date().toISOString();

    db.exec(`
      INSERT INTO runs (id, scenario_id, scenario_fingerprint, source_revision, status, started_at)
      VALUES ('${rId}', 'cancel_preparing', 'fp_test', 'rev_test', 'running', '${ts}');
      INSERT INTO orders (id, run_id, customer_id, item, quantity, status, created_at, updated_at)
      VALUES ('${oId}', '${rId}', 'cust_synthetic', 'Widget A', 1, 'preparing', '${ts}', '${ts}');
      INSERT INTO fulfillment_jobs (id, run_id, order_id, status, created_at)
      VALUES ('${jId}', '${rId}', '${oId}', 'queued', '${ts}');
    `);

    const emitted: RunEvent[] = [];
    let seq = 0;
    function emit(evt: Omit<RunEvent, "id" | "sequence" | "timestamp">): RunEvent {
      seq += 1;
      const full = {
        ...evt,
        id: `evt_${rId.slice(4)}_${String(seq).padStart(2, "0")}`,
        sequence: seq,
        timestamp: new Date().toISOString(),
      } as RunEvent;
      emitted.push(full);
      return full;
    }

    runWorkerPhase(db, rId, oId, jId, "evt_parent_00", emit as Parameters<typeof runWorkerPhase>[5]);

    const statusReadEvt = emitted.find((e) => e.kind === "worker_status_read");
    expect(statusReadEvt).toBeDefined();
    expect((statusReadEvt?.observedData as { observedStatus?: string })?.observedStatus).toBe("preparing");

    const shipEvt = emitted.find((e) => e.kind === "worker_ship");
    expect(shipEvt).toBeDefined();
    expect(shipEvt?.outcome).toBe("success");
    expect(shipEvt?.role).toBe("worker_phase");

    // The after snapshot on worker_ship is the job snapshot (status: "done").
    // Order persistence is verified via observedData.newStatus and the DB row below.
    const afterSnapshot = shipEvt?.after as { status?: string } | null;
    expect(afterSnapshot?.status).toBe("done"); // job snapshot
    const observedData = shipEvt?.observedData as { newStatus?: string };
    expect(observedData?.newStatus).toBe("shipped");

    // Verify actual persisted DB state
    const orderRow = db.prepare("SELECT status FROM orders WHERE id = ?").get(oId) as { status: string };
    expect(orderRow.status).toBe("shipped");

    const jobRow = db.prepare("SELECT status FROM fulfillment_jobs WHERE id = ?").get(jId) as { status: string };
    expect(jobRow.status).toBe("done");
  });
});

// ── 4. Isolation: two runs have separate orders ───────────────────────────────

describe("run isolation", () => {
  it("two concurrent runs do not share order rows", async () => {
    const { app, db } = buildTestApp();
    const runId1 = await createRun(app, "cancel_preparing");
    const runId2 = await createRun(app, "cancel_preparing");
    expect(runId1).not.toBe(runId2);

    const orders1 = loadOrdersForRun(db, runId1);
    const orders2 = loadOrdersForRun(db, runId2);
    expect(orders1).toHaveLength(1);
    expect(orders2).toHaveLength(1);
    expect(orders1[0].id).not.toBe(orders2[0].id);
  });

  it("run row keyed on runId cannot be retrieved with a foreign runId", async () => {
    const { app } = buildTestApp();
    const runId = await createRun(app, "cancel_shipped");
    const res = await request(app).get(`/api/runs/run_doesnotexist`);
    expect(res.status).toBe(404);
    // original run still accessible
    const res2 = await request(app).get(`/api/runs/${runId}`);
    expect(res2.status).toBe(200);
  });
});

// ── 5. Reset ──────────────────────────────────────────────────────────────────

describe("demo reset", () => {
  it("POST /api/demo/reset (global, no runId) wipes all rows and subsequent GET returns 404", async () => {
    const { app } = buildTestApp();
    const runId = await createRun(app, "cancel_preparing");
    // confirm it exists
    const before = await request(app).get(`/api/runs/${runId}`);
    expect(before.status).toBe(200);
    // global reset
    const reset = await request(app).post("/api/demo/reset").send({});
    expect(reset.status).toBe(200);
    expect(reset.body.ok).toBe(true);
    // no longer found
    const after = await request(app).get(`/api/runs/${runId}`);
    expect(after.status).toBe(404);
  });

  it("POST /api/demo/reset with runId wipes only that run and leaves other runs intact", async () => {
    const { app } = buildTestApp();
    const runId1 = await createRun(app, "cancel_preparing");
    const runId2 = await createRun(app, "cancel_shipped");
    // visitor-scoped reset of run1 only
    const reset = await request(app).post("/api/demo/reset").send({ runId: runId1 });
    expect(reset.status).toBe(200);
    expect(reset.body.ok).toBe(true);
    // run1 gone
    const after1 = await request(app).get(`/api/runs/${runId1}`);
    expect(after1.status).toBe(404);
    // run2 still accessible
    const after2 = await request(app).get(`/api/runs/${runId2}`);
    expect(after2.status).toBe(200);
  });
});

// ── 5. Invalid scenario rejected ─────────────────────────────────────────────

describe("invalid input", () => {
  it("POST /api/runs with unknown scenarioId returns 400", async () => {
    const { app } = buildTestApp();
    const res = await request(app).post("/api/runs").send({ scenarioId: "not_a_scenario" });
    expect(res.status).toBe(400);
  });

  it("POST /api/runs with missing body returns 400", async () => {
    const { app } = buildTestApp();
    const res = await request(app).post("/api/runs").send({});
    expect(res.status).toBe(400);
  });
});

// ── 6. GET /api/scenarios ─────────────────────────────────────────────────────

describe("GET /api/scenarios", () => {
  it("returns both scenario descriptors", async () => {
    const { app } = buildTestApp();
    const res = await request(app).get("/api/scenarios");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const ids = res.body.map((s: { id: string }) => s.id);
    expect(ids).toContain("cancel_preparing");
    expect(ids).toContain("cancel_shipped");
  });
});

describe("source revision", () => {
  it("hashes the real repository source and changes when an allowlisted file changes", () => {
    const root = path.resolve(__dirname, "../../../../");
    expect(fs.existsSync(path.join(root, "packages/api/src/runs.ts"))).toBe(true);
    const before = getSourceRevision();
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "dcnstrct-source-"));
    try {
      for (const relative of SOURCE_ALLOWLIST) {
        const destination = path.join(fixture, relative);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.copyFileSync(path.join(root, relative), destination);
      }
      const fixtureBefore = computeSourceRevision(fixture);
      const fixtureFile = path.join(fixture, "packages/api/src/runs.ts");
      fs.appendFileSync(fixtureFile, "\n// source revision regression check\n");
      expect(computeSourceRevision(fixture)).not.toBe(fixtureBefore);
      expect(before).toHaveLength(64);
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("fails closed when an allowlisted source file is missing", () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), "dcnstrct-source-missing-"));
    try {
      expect(() => computeSourceRevision(empty)).toThrow();
    } finally {
      fs.rmSync(empty, { recursive: true, force: true });
    }
  });
});

describe("presentation endpoints", () => {
  const repoRoot = path.resolve(__dirname, "../../../../");

  it.each(["cancel_preparing", "cancel_shipped"])("delivers only the reviewed interpretation matched to %s run's event sequence", async (scenarioId) => {
    const { app, db } = buildTestApp();
    app.use("/api", buildPresentationRouter(db, repoRoot));
    const runId = await createRun(app, scenarioId);
    const runResponse = await request(app).get(`/api/runs/${runId}`);
    const run = runResponse.body.run as { events: Array<{ id: string }>; scenarioFingerprint: string; sourceRevision: string };

    const response = await request(app).get(`/api/runs/${runId}/analysis`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("available");
    expect(response.body.recording.provenance.delivery).toBe("recorded");
    expect(response.body.recording.analysis.scenarioFingerprint).toBe(run.scenarioFingerprint);
    expect(response.body.recording.analysis.sourceRevision).toBe(run.sourceRevision);
    expect(response.body.eventMap).toHaveLength(run.events.length);
    expect(new Set(response.body.eventMap.map((entry: { runEventId: string }) => entry.runEventId)))
      .toEqual(new Set(run.events.map((event) => event.id)));
  });

  it("returns a bounded, numbered allowlisted excerpt for a run event", async () => {
    const { app, db } = buildTestApp();
    app.use("/api", buildPresentationRouter(db, repoRoot));
    const runId = await createRun(app, "cancel_preparing");
    const runResponse = await request(app).get(`/api/runs/${runId}`);
    const run = runResponse.body.run as { events: Array<{ id: string }>; sourceRevision: string };

    const response = await request(app).get(`/api/runs/${runId}/source/${run.events[0].id}/0`);

    expect(response.status).toBe(200);
    expect(SOURCE_ALLOWLIST).toContain(response.body.file);
    expect(response.body.sourceRevision).toBe(run.sourceRevision);
    expect(response.body.lines.length).toBeGreaterThan(0);
    expect(response.body.lines.length).toBeLessThanOrEqual(80);
    expect(response.body.lines[0].number).toBe(response.body.startLine);
    expect(response.body.lines.at(-1).number).toBe(response.body.endLine);
  });

  it("rejects bad citation indices and event IDs", async () => {
    const { app, db } = buildTestApp();
    app.use("/api", buildPresentationRouter(db, repoRoot));
    const runId = await createRun(app, "cancel_preparing");
    const runResponse = await request(app).get(`/api/runs/${runId}`);
    const eventId = runResponse.body.run.events[0].id as string;

    expect((await request(app).get(`/api/runs/${runId}/source/${eventId}/999`)).status).toBe(400);
    expect((await request(app).get(`/api/runs/${runId}/source/missing-event/0`)).status).toBe(404);
  });

  it("withholds a recorded explanation when the current source revision cannot be verified", async () => {
    const { app, db } = buildTestApp();
    const missingSourceRoot = path.join(os.tmpdir(), "dcnstrct-source-root-does-not-exist");
    app.use("/api", buildPresentationRouter(db, missingSourceRoot));
    const runId = await createRun(app, "cancel_preparing");

    const response = await request(app).get(`/api/runs/${runId}/analysis`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("unavailable");
    expect(response.body.recording).toBeNull();
    expect(response.body.eventMap).toEqual([]);
  });
});
