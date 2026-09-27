# Dcnstrct

Understand an unfamiliar application by following what a user action actually does.

Built for the IBM Bob 2.0 hackathon. Demo: follow order cancellation through policy, database, fulfillment worker and notification records. Bob interprets observed evidence together with source through a local MCP workflow.

**Status:** Checkpoint 01 automated checks pass: 31 tests, all package typechecks, and the production build. A Bob follow-up still needs to close source revision and unreachable worker-branch claims. The UI is a raw scaffold; genuine MCP integration and deployment are pending.

Start with [the living build guide](docs/BUILD_GUIDE.md). Contracts: [product](docs/PRD.md), [architecture](docs/ARCHITECTURE.md), [design](docs/DESIGN.md). Focused Bob prompts: docs/bob-tasks/.

## Prerequisites

- Node 24+ (uses built-in `node:sqlite` — no native SQLite build required)
- npm 10+
- Git

## Quick start

```sh
npm install

# API (terminal 1)
npm run dev -w packages/api   # http://localhost:3001

# Client (terminal 2)
npm run dev -w packages/client  # http://localhost:3000
```

## Checks

```sh
# Typecheck all packages
npm run typecheck -w packages/shared
npm run typecheck -w packages/api
npm run typecheck -w packages/client

# Tests (API — 31 checks)
npm run test -w packages/api
```

**Test results (checkpoint 01):** 31 passed, 31 total.
**Typecheck:** clean across all three packages.

## What is tested

- `cancel_preparing` path: accepted, order marked cancelled, notification persisted, worker reads current state and skips shipment. Events include `policy_accept`, `db_write`, `notification_persisted`, `job_queue`, `worker_start`, `worker_skip`, `run_complete`. Before/after state correct.
- `cancel_shipped` path: refused, order state unchanged, zero notifications, no worker events. `policy_refuse` and `run_complete` emitted. Refusal reason mentions return portal.
- Isolation: two runs never share order rows.
- Reset: `POST /api/demo/reset` wipes all tables; subsequent GET returns 404.
- Invalid input: unknown scenarioId → 400.

The normal `worker_ship` code branch is not reached by either supported cancellation scenario and has no test yet. The fulfillment phase runs synchronously within the request; this prototype does not demonstrate an independently scheduled background worker.

## Judge path (planned)

Landing → Explore demo → cancel preparing order → inspect journey/source/evidence → try shipped refusal → compare branches → reset. Synthetic sample data. Recorded Bob explanations will be labeled; no live hosted Bob API or general repository support claimed.

## Architecture

- `packages/shared` — Zod runtime contracts (Run, RunEvent, Order, FulfillmentJob, Notification, Analysis)
- `packages/api` — Node/TypeScript Express API; `node:sqlite` backed; isolated run per visitor
- `packages/client` — React/TypeScript/Vite (checkpoint 01: functional raw scaffold; checkpoint 03: full UI)

## Bob MCP session

Genuine session pending (checkpoint 02). Recorded analyses will be labeled with scenario fingerprint, source revision and task reference. No live hosted Bob API or model ID claimed. [Bob session evidence](bob_sessions/README.md) is pending genuine sessions.

## Attribution

Supplied logo at `public/brand/dcnstrct-logo.png` used unchanged; confirm owner-provided asset provenance before submission. Dependency/font attribution will be added with full UI implementation. Synthetic data only; no credentials or personal data in tracked files.
