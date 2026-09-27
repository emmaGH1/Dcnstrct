/**
 * core.test.ts — meaningful checks for checkpoint 01
 *
 * Tests cover:
 *  1. cancel_preparing: accepted, side effects persist, worker skips
 *  2. cancel_shipped: refused, state unchanged, no notifications
 *  3. fulfillment-job skip for an order cancelled before worker execution
 *  4. isolation: two concurrent runs do not share data
 *  5. reset: /api/demo/reset wipes all rows
 *  6. invalid scenario returns 400
 */
import request from "supertest";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { createTestDb } from "../db";
import { buildRouter } from "../routes";
import { loadRun, loadNotifications, loadOrdersForRun } from "../runs";
import { SOURCE_ALLOWLIST } from "@dcnstrct/shared";

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

// ── 3. Isolation: two runs have separate orders ───────────────────────────────

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

// ── 4. Reset ──────────────────────────────────────────────────────────────────

describe("demo reset", () => {
  it("POST /api/demo/reset wipes all rows and subsequent GET returns 404", async () => {
    const { app } = buildTestApp();
    const runId = await createRun(app, "cancel_preparing");
    // confirm it exists
    const before = await request(app).get(`/api/runs/${runId}`);
    expect(before.status).toBe(200);
    // reset
    const reset = await request(app).post("/api/demo/reset");
    expect(reset.status).toBe(200);
    expect(reset.body.ok).toBe(true);
    // no longer found
    const after = await request(app).get(`/api/runs/${runId}`);
    expect(after.status).toBe(404);
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
