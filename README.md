# Dcnstrct

Understand an unfamiliar application by following what a user action actually does.

Built for the IBM Bob 2.0 hackathon. Demo: follow order cancellation through policy, database, fulfillment worker and notification records. Bob interprets observed evidence together with source through a local MCP workflow.

**Status:** The execution core and local MCP server pass 61 tests, all package typechecks, the full production build, and an MCP stdio smoke test. Genuine IBM Bob IDE calls produced two corrected, reviewed explanations with preserved synthetic evidence. The updated session summary/source-tool history is still pending. The UI remains a raw scaffold; deployment is pending.

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

# Tests (API + MCP — 61 checks)
npm test

# Test real MCP stdio transport against a temporary database
npm run smoke:mcp
```

**Test results:** 61 passed (38 API, 23 MCP).
**Typecheck and production build:** clean across all four packages.

## What is tested

- `cancel_preparing` path: accepted, order marked cancelled, notification persisted, worker reads current state and skips shipment. Events include `policy_accept`, `db_write`, `notification_persisted`, `job_queue`, `worker_start`, `worker_skip`, `run_complete`. Before/after state correct.
- `cancel_shipped` path: refused, order state unchanged, zero notifications, no worker events. `policy_refuse` and `run_complete` emitted. Refusal reason mentions return portal.
- Isolation: two runs never share order rows.
- Reset: visitor-scoped reset clears only the selected run; global cleanup is limited to development.
- Invalid input: unknown scenarioId → 400.

The supported preparing-order cancellation queues a fulfillment job before the cancellation write; the worker then reads persisted state and skips it. The normal ship branch is independently tested. Worker execution is synchronous inside the request; this prototype does not demonstrate a separately scheduled background worker.

## Judge path (planned)

Landing → Explore demo → cancel preparing order → inspect journey/source/evidence → try shipped refusal → compare branches → reset. Synthetic sample data. Recorded Bob explanations will be labeled; no live hosted Bob API or general repository support claimed.

## Architecture

- `packages/shared` — Zod runtime contracts and source revision hashing
- `packages/api` — Node/TypeScript Express API; `node:sqlite` backed; isolated run per visitor
- `packages/client` — React/TypeScript/Vite (checkpoint 01: functional raw scaffold; checkpoint 03: full UI)
- `packages/mcp` — local stdio MCP server with list/get/read/save tools and stale-source checks

## Bob MCP session

The MCP server is built and transport-tested. A genuine Bob session saved corrected explanations for both cancellation paths; their content, references and persisted outcomes have been reviewed. Originals and corrected records are preserved with [Bob session evidence](bob_sessions/README.md). The continuation summary and successful Bob source-tool history remain to be documented. UI integration will label these recorded analyses with scenario fingerprint, source revision and task reference. No live hosted Bob API or model ID claimed.

## Attribution

Supplied logo at `public/brand/dcnstrct-logo.png` used unchanged; confirm owner-provided asset provenance before submission. Dependency/font attribution will be added with full UI implementation. Synthetic data only; no credentials or personal data in tracked files.
