# Paste into Bob Agent mode — task 01

Build checkpoint 01 of Dcnstrct. Read AGENTS.md, docs/PRD.md, docs/ARCHITECTURE.md and docs/BUILD_GUIDE.md. Do not regenerate the harness. Implement execution core and minimal runnable scaffold only; no polished UI yet.

Scaffold React/TypeScript/Vite client and Node/TypeScript API, SQLite supported by installed Node 24, shared runtime-validated run/event contracts. Persist synthetic orders, jobs, notifications and runs. Implement planned API with independent state per run so concurrent visitors do not mutate each other's orders.

Preparing cancellation succeeds, persists cancellation/notification, and its queued fulfillment worker observes current state and skips shipment. Shipped cancellation refuses, leaves state/notifications unchanged, explains return boundary. Emit events at actual operations with source references, ordered IDs, parents and before/after state. No hardcoded pretend trace. Include real worker phase and explicit completion status.

Add meaningful checks for accepted side effects, refusal preserving state, worker skip, valid fulfillment, isolation and reset. Supply npm dev/test/typecheck/build scripts. Run applicable checks and report exact results. Resolve dependency issues within this boundary. Update BUILD_GUIDE and README with actual commands/state/gaps. Stop for Codex review; do not push or claim evidence captured. Remind me to save task session summary PNG in bob_sessions/dcnstrct_task01_core_summary.png.
