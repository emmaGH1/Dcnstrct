# Dcnstrct

Understand an unfamiliar application by following what a user action actually does.

Built for the IBM Bob 2.0 hackathon. Demo: follow order cancellation through policy, database, fulfillment worker and notification records. Bob interprets observed evidence together with source through a local MCP workflow.

**Status:** The cream-and-pastel-green landing page and guided cancellation workspace are implemented. The two synthetic cancellation paths run against the real local app, show their observed events, and link to source and reviewed recorded IBM Bob interpretations. All 66 automated tests, all four package typechecks, the production build, and the MCP stdio smoke test pass. The rebuilt landing page and workspace were inspected at 375px, 768px and 1440px; the hero shows a labeled real workspace capture; demo video is pending. Render persistent-disk API and Vercel UI deployment configurations are prepared; actual deployment and hosted persistence verification are pending. See [deployment instructions](docs/DEPLOYMENT.md).

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

# Tests (API + MCP — 66 checks)
npm test

# Test real MCP stdio transport against a temporary database
npm run smoke:mcp
```

**Test results:** 66 passed (43 API, 23 MCP).
**Typecheck and production build:** clean across all four packages; the client bundle is about 232 kB (67.4 kB gzip) JavaScript and 38.7 kB (8.8 kB gzip) CSS.
**MCP transport:** stdio smoke passed initialize, tool discovery, list/get/source, invalid-input paths, and 20 repeated database-backed calls against its temporary database.

## What is tested

- `cancel_preparing` path: accepted, order marked cancelled, notification persisted, worker reads current state and skips shipment. Events include `policy_accept`, `db_write`, `notification_persisted`, `job_queue`, `worker_start`, `worker_skip`, `run_complete`. Before/after state correct.
- `cancel_shipped` path: refused, order state unchanged, zero notifications, no worker events. `policy_refuse` and `run_complete` emitted. Refusal reason mentions return portal.
- Isolation: two runs never share order rows.
- Reset: visitor-scoped reset clears only the selected run; global cleanup is limited to development.
- Invalid input: unknown scenarioId → 400.

The supported preparing-order cancellation queues a fulfillment job before the cancellation write; the worker then reads persisted state and skips it. The normal ship branch is independently tested. Worker execution is synchronous inside the request; this prototype does not demonstrate a separately scheduled background worker.

## Local demo path

Landing → Explore demo → cancel the preparing order → inspect its journey, source and recorded interpretation → try the shipped refusal → compare both outcomes → reset only this tab's runs. Synthetic sample data. Bob interpretations are recorded and revision-matched; there is no hosted Bob API or general repository support claim.

## Architecture

- `packages/shared` — Zod runtime contracts and source revision hashing
- `packages/api` — Node/TypeScript Express API; `node:sqlite` backed; isolated run per visitor
- `packages/client` — React/TypeScript/Vite landing page and naturally scrolling guided workspace
- `packages/mcp` — local stdio MCP server with list/get/read/save tools and stale-source checks

## Bob MCP session

The MCP server is built and transport-tested. A genuine Bob session saved corrected explanations for both cancellation paths; their content, references and persisted outcomes have been reviewed. The final IDE summary is in `bob_sessions/dcnstrct_task02b_bob_analysis_summary_final.png.png` and shows 6.20 Bobcoins. Bob's report says `get_source` still failed because the IDE's discovered schema lacked `sourceRevision`; Bob used its local `read_file` fallback. Do not claim Bob successfully called `get_source`. Codex independently rechecked the cited bytes and current source revision. Originals and corrected records are preserved with [Bob session evidence](bob_sessions/README.md). No live hosted Bob API or model ID is claimed.

## Attribution

Supplied Dcnstrct logo at `public/brand/dcnstrct-logo.png` is used unchanged. The transparent IBM Bob mascot is a derivative of the user-provided source image; confirm asset rights before public submission. The interface self-hosts the official Inter variable font; its SIL Open Font License is included in `public/fonts/Inter-LICENSE.txt`. The hero uses a real synthetic-run workspace screenshot at `public/previews/workspace-cancellation.jpg`. Synthetic data only; no credentials or personal/client data in tracked files.
