/**
 * runs.ts — execution core: perform a scenario run and emit ordered events
 *
 * SOURCE_ALLOWLIST: packages/api/src/runs.ts
 *
 * Each call to executeRun creates entirely isolated rows keyed on a fresh runId
 * so concurrent visitors never mutate each other's orders. No global mutable
 * state is used; all reads and writes go through the supplied Database instance.
 *
 * Events are assigned monotonically increasing sequence numbers and carry
 * before/after snapshots of the affected rows plus a sourceRef pointing to the
 * exact lines in this file where the operation was performed.
 *
 * Worker execution is synchronous within the run for test determinism but the
 * job row is written first ("queued") so the UI can show the queue phase before
 * the worker progresses through "running" -> "done" or "skipped".
 */
import { nanoid } from "nanoid";
import {
  Run,
  RunEvent,
  RunEventSchema,
  Order,
  OrderStatus,
  FulfillmentJob,
  Notification,
  SourceRef,
  ScenarioId,
} from "@dcnstrct/shared";
import { getScenario, scenarioFingerprint, SOURCE_REVISION } from "./scenarios";
import type { Db } from "./db";

// ── Source reference helpers ───────────────────────────────────────────────

function ref(startLine: number, endLine: number): SourceRef {
  return {
    file: "packages/api/src/runs.ts",
    startLine,
    endLine,
    sourceRevision: SOURCE_REVISION,
  };
}

// ── ID helpers ─────────────────────────────────────────────────────────────

function newRunId(): string {
  return `run_${nanoid(10)}`;
}

function evtId(rId: string, seq: number): string {
  return `evt_${rId.slice(4)}_${String(seq).padStart(2, "0")}`;
}

function orderId(rId: string): string {
  return `ord_${rId.slice(4)}`;
}

function jobId(rId: string): string {
  return `job_${rId.slice(4)}`;
}

function notifId(rId: string, suffix: string): string {
  return `ntf_${rId.slice(4)}_${suffix}`;
}

// ── Timestamps ─────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

// ── Row serializers ─────────────────────────────────────────────────────────

function orderSnapshot(order: Order): Record<string, unknown> {
  return {
    id: order.id,
    status: order.status,
    updatedAt: order.updatedAt,
  };
}

function jobSnapshot(job: FulfillmentJob): Record<string, unknown> {
  return {
    id: job.id,
    status: job.status,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    skipReason: job.skipReason,
  };
}

// ── DB read helpers ─────────────────────────────────────────────────────────

type OrderRow = {
  id: string;
  run_id: string;
  customer_id: string;
  item: string;
  quantity: number;
  status: string;
  created_at: string;
  updated_at: string;
};

type JobRow = {
  id: string;
  run_id: string;
  order_id: string;
  status: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  skip_reason: string | null;
};

type RunRow = {
  id: string;
  scenario_id: string;
  scenario_fingerprint: string;
  source_revision: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  cancel_accepted: number | null;
  refusal_reason: string | null;
};

type EventRow = {
  id: string;
  sequence: number;
  parent_id: string | null;
  role: string;
  kind: string;
  label: string;
  outcome: string;
  observed_data: string;
  source_file: string;
  source_start: number;
  source_end: number;
  source_rev: string;
  before_state: string | null;
  after_state: string | null;
  timestamp: string;
};

function readOrder(db: Db, id: string): Order {
  const row = db
    .prepare(
      `SELECT id, run_id, customer_id, item, quantity, status, created_at, updated_at
       FROM orders WHERE id = ?`
    )
    .get(id) as OrderRow | undefined;
  if (!row) throw new Error(`Order not found: ${id}`);
  return {
    id: row.id,
    runId: row.run_id,
    customerId: row.customer_id,
    item: row.item,
    quantity: row.quantity,
    status: row.status as OrderStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function readJob(db: Db, id: string): FulfillmentJob {
  const row = db
    .prepare(
      `SELECT id, run_id, order_id, status, created_at, started_at, completed_at, skip_reason
       FROM fulfillment_jobs WHERE id = ?`
    )
    .get(id) as JobRow | undefined;
  if (!row) throw new Error(`Job not found: ${id}`);
  return {
    id: row.id,
    runId: row.run_id,
    orderId: row.order_id,
    status: row.status as FulfillmentJob["status"],
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    skipReason: row.skip_reason,
  };
}

// ── DB write helpers ─────────────────────────────────────────────────────────

function insertOrder(db: Db, o: Order): void {
  db.prepare(
    `INSERT INTO orders (id, run_id, customer_id, item, quantity, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(o.id, o.runId, o.customerId, o.item, o.quantity, o.status, o.createdAt, o.updatedAt);
}

function updateOrderStatus(db: Db, id: string, status: OrderStatus, updatedAt: string): void {
  db.prepare(`UPDATE orders SET status = ?, updated_at = ? WHERE id = ?`).run(
    status,
    updatedAt,
    id
  );
}

function insertJob(db: Db, j: FulfillmentJob): void {
  db.prepare(
    `INSERT INTO fulfillment_jobs (id, run_id, order_id, status, created_at, started_at, completed_at, skip_reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    j.id, j.runId, j.orderId, j.status, j.createdAt,
    j.startedAt, j.completedAt, j.skipReason
  );
}

function updateJob(
  db: Db,
  id: string,
  fields: Partial<Pick<FulfillmentJob, "status" | "startedAt" | "completedAt" | "skipReason">>
): void {
  const sets: string[] = [];
  const vals: Array<string | number | null> = [];
  if (fields.status !== undefined) { sets.push("status = ?"); vals.push(fields.status); }
  if (fields.startedAt !== undefined) { sets.push("started_at = ?"); vals.push(fields.startedAt); }
  if (fields.completedAt !== undefined) { sets.push("completed_at = ?"); vals.push(fields.completedAt); }
  if (fields.skipReason !== undefined) { sets.push("skip_reason = ?"); vals.push(fields.skipReason ?? null); }
  if (sets.length === 0) return;
  vals.push(id);
  db.prepare(`UPDATE fulfillment_jobs SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
}

function insertNotification(db: Db, n: Notification): void {
  db.prepare(
    `INSERT INTO notifications (id, run_id, order_id, type, message, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(n.id, n.runId, n.orderId, n.type, n.message, n.createdAt);
}

function persistEvent(db: Db, rId: string, evt: RunEvent): void {
  RunEventSchema.parse(evt); // validate before persisting — no fabricated events
  db.prepare(
    `INSERT INTO run_events
       (id, run_id, sequence, parent_id, role, kind, label, outcome,
        observed_data, source_file, source_start, source_end, source_rev,
        before_state, after_state, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    evt.id, rId, evt.sequence, evt.parentId,
    evt.role, evt.kind, evt.label, evt.outcome,
    JSON.stringify(evt.observedData),
    evt.sourceRef.file, evt.sourceRef.startLine, evt.sourceRef.endLine, evt.sourceRef.sourceRevision,
    evt.before ? JSON.stringify(evt.before) : null,
    evt.after ? JSON.stringify(evt.after) : null,
    evt.timestamp
  );
}

function insertRun(db: Db, rId: string, scenarioId: ScenarioId, fingerprint: string): void {
  db.prepare(
    `INSERT INTO runs (id, scenario_id, scenario_fingerprint, source_revision, status, started_at)
     VALUES (?, ?, ?, ?, 'running', ?)`
  ).run(rId, scenarioId, fingerprint, SOURCE_REVISION, now());
}

function finalizeRun(
  db: Db,
  rId: string,
  status: "completed" | "failed" | "partial",
  cancelAccepted: boolean | null,
  refusalReason: string | null,
  completedAt: string
): void {
  db.prepare(
    `UPDATE runs SET status = ?, cancel_accepted = ?, refusal_reason = ?, completed_at = ?
     WHERE id = ?`
  ).run(
    status,
    cancelAccepted === null ? null : cancelAccepted ? 1 : 0,
    refusalReason,
    completedAt,
    rId
  );
}

// ── Public read helpers used by routes ──────────────────────────────────────

export function loadRun(db: Db, rId: string): Run | null {
  const row = db
    .prepare(
      `SELECT id, scenario_id, scenario_fingerprint, source_revision, status,
              started_at, completed_at, cancel_accepted, refusal_reason
       FROM runs WHERE id = ?`
    )
    .get(rId) as RunRow | undefined;

  if (!row) return null;

  const events = loadEvents(db, rId);
  const triggerEvt = events.find((e) => e.role === "trigger");
  const completionEvt = [...events].reverse().find((e) => e.role === "completion");

  return {
    id: row.id,
    scenarioId: row.scenario_id as ScenarioId,
    scenarioFingerprint: row.scenario_fingerprint,
    sourceRevision: row.source_revision,
    status: row.status as Run["status"],
    startedAt: row.started_at,
    completedAt: row.completed_at,
    events,
    beforeState: triggerEvt?.before ?? null,
    afterState: completionEvt?.after ?? null,
    cancelAccepted: row.cancel_accepted === null ? null : row.cancel_accepted === 1,
    refusalReason: row.refusal_reason,
  };
}

function loadEvents(db: Db, rId: string): RunEvent[] {
  const rows = db
    .prepare(
      `SELECT id, sequence, parent_id, role, kind, label, outcome,
              observed_data, source_file, source_start, source_end, source_rev,
              before_state, after_state, timestamp
       FROM run_events WHERE run_id = ? ORDER BY sequence ASC`
    )
    .all(rId) as EventRow[];

  return rows.map((r) =>
    RunEventSchema.parse({
      id: r.id,
      sequence: r.sequence,
      parentId: r.parent_id,
      role: r.role,
      kind: r.kind,
      label: r.label,
      outcome: r.outcome,
      observedData: JSON.parse(r.observed_data) as Record<string, unknown>,
      sourceRef: {
        file: r.source_file,
        startLine: r.source_start,
        endLine: r.source_end,
        sourceRevision: r.source_rev,
      },
      before: r.before_state ? (JSON.parse(r.before_state) as Record<string, unknown>) : null,
      after: r.after_state ? (JSON.parse(r.after_state) as Record<string, unknown>) : null,
      timestamp: r.timestamp,
    })
  );
}

export function loadNotifications(db: Db, rId: string): Notification[] {
  const rows = db
    .prepare(
      `SELECT id, run_id, order_id, type, message, created_at
       FROM notifications WHERE run_id = ? ORDER BY created_at ASC`
    )
    .all(rId) as Array<{
    id: string;
    run_id: string;
    order_id: string;
    type: string;
    message: string;
    created_at: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    runId: r.run_id,
    orderId: r.order_id,
    type: r.type,
    message: r.message,
    createdAt: r.created_at,
  }));
}

export function loadOrdersForRun(db: Db, rId: string): Order[] {
  const rows = db
    .prepare(
      `SELECT id, run_id, customer_id, item, quantity, status, created_at, updated_at
       FROM orders WHERE run_id = ?`
    )
    .all(rId) as OrderRow[];
  return rows.map((r) => ({
    id: r.id,
    runId: r.run_id,
    customerId: r.customer_id,
    item: r.item,
    quantity: r.quantity,
    status: r.status as OrderStatus,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

// ── Main execution entry point ───────────────────────────────────────────────

/**
 * executeRun — create a fresh isolated run for the given scenario.
 *
 * All DB operations run synchronously. The returned runId can be fetched via
 * GET /api/runs/:id. Events carry sourceRefs pointing to exact lines of this
 * file so the UI can navigate directly to the code that performed each operation.
 */
export function executeRun(db: Db, scenarioId: ScenarioId): string {
  const rId = newRunId();
  const fingerprint = scenarioFingerprint(scenarioId);
  const scenario = getScenario(scenarioId);

  insertRun(db, rId, scenarioId, fingerprint);

  let seq = 0;

  function emit(evt: Omit<RunEvent, "id" | "sequence" | "timestamp">): RunEvent {
    seq += 1;
    const full: RunEvent = {
      ...evt,
      id: evtId(rId, seq),
      sequence: seq,
      timestamp: now(),
    };
    persistEvent(db, rId, full);
    return full;
  }

  try {
    // ── 1. Create synthetic order in initial state ─────────────────────────
    const oId = orderId(rId);
    const orderCreatedAt = now();
    const initialOrder: Order = {
      id: oId,
      runId: rId,
      customerId: `cust_synthetic`,
      item: "Widget A",
      quantity: 1,
      status: scenario.initialOrderStatus,
      createdAt: orderCreatedAt,
      updatedAt: orderCreatedAt,
    };
    insertOrder(db, initialOrder);

    // ── 2. Trigger: cancellation request ──────────────────────────────────
    const triggerEvt = emit({
      parentId: null,
      role: "trigger",
      kind: "cancellation_request",
      label: "User requests cancellation",
      outcome: "success",
      observedData: { scenarioId, orderId: oId, initialStatus: scenario.initialOrderStatus },
      sourceRef: ref(437, 448),
      before: orderSnapshot(initialOrder),
      after: null,
    });

    // ── 3. Policy check ────────────────────────────────────────────────────
    const canCancel = scenario.initialOrderStatus === "preparing";

    if (!canCancel) {
      // REFUSED PATH — order is shipped, state must not change
      const refusalReason =
        "Order has already been dispatched. Please use the return portal within 30 days.";

      emit({
        parentId: triggerEvt.id,
        role: "policy_check",
        kind: "policy_refuse",
        label: "Cancellation refused — order already shipped",
        outcome: "refused",
        observedData: { orderId: oId, currentStatus: scenario.initialOrderStatus, reason: refusalReason },
        sourceRef: ref(450, 468),
        before: orderSnapshot(initialOrder),
        after: orderSnapshot(initialOrder), // unchanged
      });

      emit({
        parentId: triggerEvt.id,
        role: "completion",
        kind: "run_complete",
        label: "Run complete — cancellation refused",
        outcome: "refused",
        observedData: {
          cancelAccepted: false,
          refusalReason,
          notificationsCreated: 0,
          workerInvoked: false,
        },
        sourceRef: ref(470, 487),
        before: orderSnapshot(initialOrder),
        after: orderSnapshot(initialOrder),
      });

      finalizeRun(db, rId, "completed", false, refusalReason, now());
      return rId;
    }

    // ACCEPTED PATH — order is preparing
    emit({
      parentId: triggerEvt.id,
      role: "policy_check",
      kind: "policy_accept",
      label: "Cancellation accepted — order still preparing",
      outcome: "success",
      observedData: { orderId: oId, currentStatus: scenario.initialOrderStatus },
      sourceRef: ref(450, 451),
      before: orderSnapshot(initialOrder),
      after: null,
    });

    // ── 4. DB write: mark order cancelled ─────────────────────────────────
    const cancelledAt = now();
    updateOrderStatus(db, oId, "cancelled", cancelledAt);
    const cancelledOrder = readOrder(db, oId);

    emit({
      parentId: triggerEvt.id,
      role: "db_write",
      kind: "order_status_update",
      label: "Order status updated to cancelled",
      outcome: "success",
      observedData: { orderId: oId, previousStatus: "preparing", newStatus: "cancelled" },
      sourceRef: ref(504, 519),
      before: orderSnapshot(initialOrder),
      after: orderSnapshot(cancelledOrder),
    });

    // ── 5. Persist cancellation notification ──────────────────────────────
    const notif: Notification = {
      id: notifId(rId, "cancel"),
      runId: rId,
      orderId: oId,
      type: "order_cancelled",
      message: `Order ${oId} has been successfully cancelled.`,
      createdAt: now(),
    };
    insertNotification(db, notif);

    emit({
      parentId: triggerEvt.id,
      role: "notification",
      kind: "notification_persisted",
      label: "Cancellation notification persisted",
      outcome: "success",
      observedData: { notificationId: notif.id, type: notif.type, message: notif.message },
      sourceRef: ref(521, 542),
      before: null,
      after: { id: notif.id, type: notif.type, message: notif.message },
    });

    // ── 6. Queue fulfillment job ──────────────────────────────────────────
    const jId = jobId(rId);
    const job: FulfillmentJob = {
      id: jId,
      runId: rId,
      orderId: oId,
      status: "queued",
      createdAt: now(),
      startedAt: null,
      completedAt: null,
      skipReason: null,
    };
    insertJob(db, job);

    const jobQueuedEvt = emit({
      parentId: triggerEvt.id,
      role: "worker_phase",
      kind: "job_queue",
      label: "Fulfillment job queued",
      outcome: "success",
      observedData: { jobId: jId, orderId: oId, jobStatus: "queued" },
      sourceRef: ref(544, 568),
      before: null,
      after: jobSnapshot(job),
    });

    // ── 7. Worker: start, read current state, decide ─────────────────────
    const startedAt = now();
    updateJob(db, jId, { status: "running", startedAt });
    const runningJob = readJob(db, jId);

    emit({
      parentId: jobQueuedEvt.id,
      role: "worker_phase",
      kind: "worker_start",
      label: "Fulfillment worker started",
      outcome: "success",
      observedData: { jobId: jId, startedAt },
      sourceRef: ref(570, 585),
      before: jobSnapshot(job),
      after: jobSnapshot(runningJob),
    });

    // Worker reads CURRENT order state from DB — not a cached value
    const currentOrder = readOrder(db, oId);
    const workerSeesCancelled = currentOrder.status === "cancelled";

    emit({
      parentId: jobQueuedEvt.id,
      role: "db_read",
      kind: "worker_skip", // pre-labelled; outcome assigned below
      label: `Worker reads current order status: ${currentOrder.status}`,
      outcome: "success",
      observedData: {
        orderId: oId,
        observedStatus: currentOrder.status,
        willSkip: workerSeesCancelled,
      },
      sourceRef: ref(587, 605),
      before: null,
      after: null,
    });

    if (workerSeesCancelled) {
      // SKIP SHIPMENT — correct; never ship a cancelled order
      const completedAt = now();
      updateJob(db, jId, { status: "skipped", completedAt, skipReason: "order_cancelled" });
      const skippedJob = readJob(db, jId);

      emit({
        parentId: jobQueuedEvt.id,
        role: "worker_phase",
        kind: "worker_skip",
        label: "Worker skipped shipment — order was cancelled",
        outcome: "skipped",
        observedData: { jobId: jId, skipReason: "order_cancelled", orderId: oId },
        sourceRef: ref(607, 623),
        before: jobSnapshot(runningJob),
        after: jobSnapshot(skippedJob),
      });
    } else {
      // Fulfillment path — order was not cancelled before worker ran
      const completedAt = now();
      updateJob(db, jId, { status: "done", completedAt });
      const doneJob = readJob(db, jId);

      emit({
        parentId: jobQueuedEvt.id,
        role: "worker_phase",
        kind: "worker_ship",
        label: "Worker shipped order (not cancelled)",
        outcome: "success",
        observedData: { jobId: jId, orderId: oId },
        sourceRef: ref(624, 640),
        before: jobSnapshot(runningJob),
        after: jobSnapshot(doneJob),
      });
    }

    // ── 8. Final completion event ─────────────────────────────────────────
    const finalOrder = readOrder(db, oId);
    const finalJob = readJob(db, jId);
    const countRow = db
      .prepare(`SELECT COUNT(*) as c FROM notifications WHERE run_id = ?`)
      .get(rId) as { c: number };

    emit({
      parentId: triggerEvt.id,
      role: "completion",
      kind: "run_complete",
      label: "Run complete — cancellation accepted",
      outcome: "success",
      observedData: {
        cancelAccepted: true,
        finalOrderStatus: finalOrder.status,
        jobStatus: finalJob.status,
        notificationsCreated: countRow.c,
        workerInvoked: true,
        workerSkipped: finalJob.status === "skipped",
      },
      sourceRef: ref(643, 669),
      before: orderSnapshot(initialOrder),
      after: orderSnapshot(finalOrder),
    });

    finalizeRun(db, rId, "completed", true, null, now());
    return rId;
  } catch (err) {
    // Partial run — record failure event; never pretend completion
    try {
      const message = err instanceof Error ? err.message : String(err);
      persistEvent(db, rId, {
        id: evtId(rId, seq + 1),
        sequence: seq + 1,
        parentId: null,
        role: "completion",
        kind: "run_failed",
        label: "Run failed unexpectedly",
        outcome: "failed",
        observedData: { error: message },
        sourceRef: ref(671, 692),
        before: null,
        after: null,
        timestamp: now(),
      });
    } catch {
      // best-effort failure recording
    }
    finalizeRun(db, rId, "failed", null, null, now());
    return rId;
  }
}
