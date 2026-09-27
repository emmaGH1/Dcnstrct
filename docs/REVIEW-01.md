# Checkpoint 01 review

GPT-6 Sol reviewed the execution core after Bob completed task 01. Application code was not changed during this review. Existing verification: 31 tests pass, package typechecks pass, production build passes outside the filesystem sandbox. Those checks do not establish the behaviors below.

## Findings

1. **P1 — source identity does not track source edits.** `packages/api/src/scenarios.ts:50` defaults SOURCE_REVISION to `dev`; the scenario fingerprint at line 45 includes only the scenario ID and starting order status. Editing execution code leaves both identities unchanged. Saved explanations could therefore be accepted against different code. Before saving analysis, derive a source-content identity from the allowlisted source, including uncommitted changes, and check it consistently when reading source and accepting/replaying analysis. Reject stale runs or retain their immutable source snapshot.

2. **P1 — queued-work cancellation premise is not represented.** `packages/api/src/runs.ts:544` creates the fulfillment job after cancellation and notification. The worker then executes synchronously after an unconditional cancellation, making the shipping branch unreachable in the supported scenarios. Seed the preparing order's queued job before cancellation, then execute a bounded worker phase that reads persisted state. Deterministic synchronous execution is sufficient; describe it honestly. Extract enough worker logic to verify both cancelled-job skip and ordinary fulfillment without adding a third product scenario.

3. **P2 — shipping event claims a state change that is absent.** `packages/api/src/runs.ts:627` marks the job done, but does not update the order to shipped before emitting `worker_ship` at line 633. When making ordinary fulfillment testable, persist and verify the corresponding order transition and capture it in evidence, or narrow the event to what actually occurred. Also give the DB status-read event at line 594 a read-specific kind instead of `worker_skip`.

4. **P2 — reset is global and its failure is hidden.** `packages/api/src/routes.ts:60` deletes every visitor's runs outside production; in production the route returns 403. `packages/client/src/App.tsx:39` ignores that response and clears the displayed result anyway. Before hosting, make “start again” local to the visitor or safely scoped to their run; keep any global cleanup unavailable to public visitors and handle non-success responses.

## Decision

Checkpoint 01 remains open. Resolve findings 1–3 before generating Bob analysis; resolve finding 4 before hosting. MCP and polished UI are next checkpoints, not missing checkpoint-01 deliverables. Required task-consumption-summary evidence remains pending: completion-report screenshots and task-list costs are supporting evidence.
