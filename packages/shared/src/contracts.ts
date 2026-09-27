import { z } from "zod";

// ──────────────────────────────────────────────
// SourceRef — restricted to allowlisted relative paths
// ──────────────────────────────────────────────
export const SourceRefSchema = z.object({
  file: z.string(), // relative path, validated server-side against allowlist
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  sourceRevision: z.string().min(1),
}).refine((ref) => ref.endLine >= ref.startLine, {
  message: "endLine must be greater than or equal to startLine",
  path: ["endLine"],
});
export type SourceRef = z.infer<typeof SourceRefSchema>;

// ──────────────────────────────────────────────
// Event — one atomic operation in a run
// ──────────────────────────────────────────────
export const EventRoleSchema = z.enum([
  "trigger",        // user action that started this path
  "policy_check",   // business-rule evaluation
  "db_write",       // database mutation
  "db_read",        // database read
  "worker_phase",   // fulfillment worker lifecycle step
  "notification",   // persisted notification record
  "completion",     // final status record for the run
]);
export type EventRole = z.infer<typeof EventRoleSchema>;

export const EventKindSchema = z.enum([
  "cancellation_request",
  "policy_accept",
  "policy_refuse",
  "order_status_update",
  "job_queue",
  "worker_start",
  "worker_status_read",
  "worker_skip",
  "worker_ship",
  "worker_complete",
  "notification_persisted",
  "run_complete",
  "run_failed",
]);
export type EventKind = z.infer<typeof EventKindSchema>;

export const EventOutcomeSchema = z.enum(["success", "skipped", "refused", "failed"]);
export type EventOutcome = z.infer<typeof EventOutcomeSchema>;

export const RunEventSchema = z.object({
  id: z.string(),          // "evt_<run-seq>_<local-seq>" e.g. evt_abc123_01
  sequence: z.number().int().nonnegative(),
  parentId: z.string().nullable(),
  role: EventRoleSchema,
  kind: EventKindSchema,
  label: z.string(),
  outcome: EventOutcomeSchema,
  observedData: z.record(z.unknown()),
  sourceRef: SourceRefSchema,
  before: z.record(z.unknown()).nullable(),
  after: z.record(z.unknown()).nullable(),
  timestamp: z.string().datetime(),
});
export type RunEvent = z.infer<typeof RunEventSchema>;

// ──────────────────────────────────────────────
// Order state — the before/after snapshot data
// ──────────────────────────────────────────────
export const OrderStatusSchema = z.enum([
  "preparing",
  "shipped",
  "cancelled",
  "delivered",
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const OrderSchema = z.object({
  id: z.string(),
  runId: z.string(),
  customerId: z.string(),
  item: z.string(),
  quantity: z.number().int().positive(),
  status: OrderStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Order = z.infer<typeof OrderSchema>;

// ──────────────────────────────────────────────
// Job — fulfillment queue entry
// ──────────────────────────────────────────────
export const JobStatusSchema = z.enum(["queued", "running", "done", "skipped"]);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const FulfillmentJobSchema = z.object({
  id: z.string(),
  runId: z.string(),
  orderId: z.string(),
  status: JobStatusSchema,
  createdAt: z.string().datetime(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  skipReason: z.string().nullable(),
});
export type FulfillmentJob = z.infer<typeof FulfillmentJobSchema>;

// ──────────────────────────────────────────────
// Notification — synthetic persisted record
// ──────────────────────────────────────────────
export const NotificationSchema = z.object({
  id: z.string(),
  runId: z.string(),
  orderId: z.string(),
  type: z.string(),
  message: z.string(),
  createdAt: z.string().datetime(),
});
export type Notification = z.infer<typeof NotificationSchema>;

// ──────────────────────────────────────────────
// Scenario — the test scenario descriptor
// ──────────────────────────────────────────────
export const ScenarioIdSchema = z.enum(["cancel_preparing", "cancel_shipped"]);
export type ScenarioId = z.infer<typeof ScenarioIdSchema>;

export const ScenarioSchema = z.object({
  id: ScenarioIdSchema,
  label: z.string(),
  description: z.string(),
  initialOrderStatus: OrderStatusSchema,
});
export type Scenario = z.infer<typeof ScenarioSchema>;

// ──────────────────────────────────────────────
// Run — the top-level execution record
// ──────────────────────────────────────────────
export const RunStatusSchema = z.enum(["running", "completed", "partial", "failed"]);
export type RunStatus = z.infer<typeof RunStatusSchema>;

export const RunSchema = z.object({
  id: z.string(),
  scenarioId: ScenarioIdSchema,
  scenarioFingerprint: z.string(),
  sourceRevision: z.string(),
  status: RunStatusSchema,
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  events: z.array(RunEventSchema),
  beforeState: z.record(z.unknown()).nullable(),
  afterState: z.record(z.unknown()).nullable(),
  cancelAccepted: z.boolean().nullable(),
  refusalReason: z.string().nullable(),
});
export type Run = z.infer<typeof RunSchema>;

// ──────────────────────────────────────────────
// API shapes
// ──────────────────────────────────────────────
export const CreateRunRequestSchema = z.object({
  scenarioId: ScenarioIdSchema,
});
export type CreateRunRequest = z.infer<typeof CreateRunRequestSchema>;

export const CreateRunResponseSchema = z.object({
  runId: z.string(),
});
export type CreateRunResponse = z.infer<typeof CreateRunResponseSchema>;

// ──────────────────────────────────────────────
// Analysis provenance
// ──────────────────────────────────────────────
export const AnalysisDeliverySchema = z.enum(["recorded", "live"]);

export const AnalysisProvenanceSchema = z.object({
  provider: z.literal("ibm-bob"),
  taskReference: z.string(),
  createdAt: z.string().datetime(),
  delivery: AnalysisDeliverySchema,
});

export const AnalysisStepSchema = z.object({
  eventId: z.string(),
  explanation: z.string(),
  sourceRefs: z.array(SourceRefSchema),
  evidenceEventIds: z.array(z.string()),
  uncertainty: z.string().nullable(),
});

export const AnalysisSchema = z.object({
  schemaVersion: z.literal("1"),
  runId: z.string(),
  scenarioFingerprint: z.string(),
  sourceRevision: z.string(),
  provenance: AnalysisProvenanceSchema,
  summary: z.string(),
  steps: z.array(AnalysisStepSchema),
  branchExplanation: z.string(),
  sideEffects: z.array(z.string()),
});
export type Analysis = z.infer<typeof AnalysisSchema>;

// ──────────────────────────────────────────────
// SOURCE_ALLOWLIST — relative paths MCP may serve
// Must be kept in sync with server-side enforcement
// ──────────────────────────────────────────────
export const SOURCE_ALLOWLIST = [
  "packages/api/src/scenarios.ts",
  "packages/api/src/db.ts",
  "packages/api/src/routes.ts",
  "packages/api/src/runs.ts",
  "packages/shared/src/contracts.ts",
  "packages/shared/src/source-revision.ts",
] as const;

export type AllowedSourceFile = (typeof SOURCE_ALLOWLIST)[number];
