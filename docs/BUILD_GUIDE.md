# Dcnstrct — start here

Latest verification: GPT-6 Luna Extra High fixes for REVIEW-02 are implemented. `npm test` passes 61 tests (38 API, 23 MCP); `npm run typecheck` passes all four packages; the full root production build passes when Vite is allowed its required filesystem access; the MCP stdio smoke passes. Task 02B now demonstrates genuine Bob calls and two persisted analyses. Review found draft corrections and incomplete MCP source reads; see docs/REVIEW-03.md. Application source remains unchanged since these passing checks.

## Where I am

Current checkpoint: **03 UI handoff** — corrected Bob analysis content approved against current source and persisted runs. Bob's final report confirms get_source still failed and read_file was used; disclose this fallback. Updated consumption summary remains pending. See docs/REVIEW-03.md.
Owner: user operating Bob IDE; Codex maintains harness and reviews after Bob stops.
Next action: GPT-6 Luna Extra High implements the detailed UI plan in docs/bob-tasks/03-ui.md using reviewed corrected-records.json. UI design decisions are recorded in docs/DESIGN.md: cream/teal light theme, multicolor rotating word pill, five-section landing and separate scrolling workspace. Build safe analysis/source HTTP delivery first, workspace second, landing third, then real integration/responsive checks. No demo video asset is confirmed; use a real workspace screenshot until footage exists. No further Bob retry is needed before UI; reserve remaining coins until actual updated consumption is known. A new final-summary PNG is present but not inspected in this planning task; its consumption/evidence status must not be inferred from its filename.
Last passing checks: `npm test` → 61/61 (38 API + 23 MCP); `npm run typecheck` → all 4 packages clean; full `npm run build` passes including Vite and MCP; `npm run smoke:mcp` passes. Vite bundle: 146.68 kB (47.20 kB gzip).
Baseline commit: f58da4f (harness). Checkpoint 01 commit: 6a1e7d9. Verified MCP implementation commit: 0ce32b1. Task 02B evidence and review are recorded separately; full checkpoint 02 approval awaits the focused corrections.
Public repository: https://github.com/emmaGH1/Dcnstrct

## Runtime notes

UI planning handoff: application files unchanged. Reviewed current client, HTTP routes, source allowlist, corrected recording structure and latest review. Changes in this task are DESIGN.md, bob-tasks/03-ui.md and this guide only; no application tests or builds rerun for documentation planning. Current scaffold has no browser analysis/source endpoints and fetches a run once; Luna must implement real response validation and conditional polling. Full checkpoint 03 remains pending implementation and Codex review.

Mascot handoff follow-up: saved the user's IBM Bob attachment unchanged as public/brand/ibm-bob-mascot.png; source/destination SHA-256 match (6A31AF26A9FC64C1365ED5543A65400BF697D9552B0FDED004E69BE2B7969A64). Inspected image metadata: 308x412, opaque corner #121314. DESIGN.md and task 03 specify Bob workflow illustration plus optional recorded-interpretation marker. No application code changed or runtime tests rerun. Actual UI placement/responsive inspection and official asset provenance/attribution remain pending. Continue saving ALL relevant Bob session consumption-summary PNGs in bob_sessions/, including retries/reviews.

Visual planning previews: generated and displayed two conceptual raster images, saved privately in ignored .hackathon/ui-previews/landing-concept.png and workspace-concept.png. These are NOT actual app renders, traces, source evidence or final copy. Workspace background transparency was corrected in a second generation. Generated logo/copy/details may drift: DESIGN.md, the unchanged supplied assets and actual validated events remain authoritative for Luna. No implementation or responsive verification occurred in this preview task; video still pending. BUILD_GUIDE is the only tracked file changed.

- SQLite: uses built-in `node:sqlite` (Node 24.16+). No native build required, no better-sqlite3.
- DB_PATH: defaults to `packages/api/data/dcnstrct.db` (created on first run). Set `DB_PATH=:memory:` for ephemeral/test. MCP server reads the same file.
- Source revision: full SHA-256 of the actual allowlisted source bytes, recomputed for each API run and each MCP operation. Missing source fails closed. Source edits make old runs unavailable for new explanations.
- PORT: API defaults to `3001`. Client dev server runs on `3000` with proxy to `:3001`.

## Quick start

```sh
npm install
# Terminal 1 — API server
npm run dev -w packages/api
# Terminal 2 — client dev server
npm run dev -w packages/client
# Open http://localhost:3000
```

## Checks (checkpoint 02)

```sh
# Run all tests (api + mcp)
npm test
# → 38 passed (packages/api) + 23 passed (packages/mcp) = 61 total

# Typecheck all packages
npm run typecheck
# → all 4 packages pass with no output (shared, api, client, mcp)

# Build the full production app, including the MCP server
npm run build

# Exercise real MCP stdio transport against an isolated temporary database
npm run smoke:mcp
```

## MCP setup — connecting Bob IDE

The MCP server configuration is in `.bob/mcp.json`. IBM Bob supports project-level settings in this path; when the same server name exists globally, the project-level entry takes precedence. Its `cwd: "."` and relative `DB_PATH` require opening this repository as Bob's project root.

**To connect:**
1. Open Bob IDE with this workspace (`ibm-2.0-hackathon/` as the project root).
2. Click the **Settings** icon in the Bob panel → **MCP** tab.
3. Click **Edit Project MCP** — this opens `.bob/mcp.json`.
4. Confirm **Use MCP Servers** is checked and the `dcnstrct` entry shows `disabled: false`.
5. **Start the API server first** so the SQLite DB exists: `npm run dev -w packages/api`
6. Bob will start the MCP server as a child process using:
   `node node_modules/tsx/dist/cli.mjs packages/mcp/src/index.ts`
   with `DB_PATH=packages/api/data/dcnstrct.db`.

**If the server does not appear in Bob's tool list:**
- Verify Node 24.16+ is active: `node --version`
- Check that `packages/api/data/` exists (directory is created after first API request).
- Open Bob IDE MCP tab → check for connection errors in the server entry.
- Smoke-test manually: `node node_modules/tsx/dist/cli.mjs packages/mcp/src/index.ts` — it should start silently (waiting for MCP protocol on stdin). Stderr shows `dcnstrct-mcp: stdio transport ready`. Any import/syntax errors appear on stderr.

**Available tools once connected:**

| Tool | Purpose |
|---|---|
| `list_runs` | List completed runs (most recent first). Optional `limit` (default 10). |
| `get_run` | Fetch a finalized run with all validated events. Rejects unfinished runs. |
| `get_source` | Read bounded lines from an allowlisted source file. Must include `sourceRevision` copied from the run; stale source is rejected. |
| `save_analysis` | Persist an analysis only when run and current source revisions match, citations belong to the run, and source references are current, allowlisted and bounded. |

**Using the tools — guide for a genuine Bob session:**

```
# Step 1: list completed runs (run the scenario first via the UI or API)
list_runs(limit=5)
# → note run IDs for cancel_preparing and cancel_shipped paths

# Step 2: inspect both cancellation paths
get_run(runId="run_<cancel_preparing_id>")
get_run(runId="run_<cancel_shipped_id>")
# → read events; observe job_queue→order_cancelled→worker_skip for accepted path
# → observe policy_refuse with unchanged state for refused path

# Step 3: read relevant source
get_source(file="packages/api/src/runs.ts", startLine=<event sourceRef start>, endLine=<event sourceRef end>, sourceRevision=<run sourceRevision>)
# Use the citation range returned by get_run; do not guess line numbers.

# Step 4: save an evidence-linked analysis
save_analysis(analysis=<JSON string matching AnalysisSchema>)
# Required fields: schemaVersion "1", runId, scenarioFingerprint, sourceRevision
# Copy scenarioFingerprint and sourceRevision from the get_run response — must match exactly
# provenance.taskReference must be a real IBM Bob task reference (visible in Bob IDE task header)
# uncertainty must be explicit where reasoning is uncertain, not null for everything
# Schema validity alone does not prove Bob authorship — the task reference is the evidence
```

**Critical constraints (do not deviate):**
- Do NOT invent a model ID or hosted inference API.
- `sourceRevision` in the analysis must equal the value from `get_run` for that run exactly.
- `scenarioFingerprint` must match. If source changed since the run, re-run the scenario first.
- All `eventId` and `evidenceEventIds` must belong to the specific run (MCP enforces this).
- All `sourceRefs` must be in SOURCE_ALLOWLIST with valid line bounds (MCP enforces this).
- `provenance.delivery` must be `"recorded"` for analyses produced in this session.
- If MCP connection cannot be verified, report the blocker — do not simulate tool calls.

## Gaps at checkpoint 02 exit

- Bob saved both corrected analyses; content/references/current source/persisted outcomes verified. Updated task summary and successful Bob get_source tool history remain to be captured. Earlier screenshot records 35.14 total Bobcoins; continuation consumption is not yet verified.
- UI is a minimal functional scaffold (raw event table). Checkpoint 03 deliverable.
- Visitor reset is now run-scoped (Finding 4 resolved); global reset still accessible in dev/demo.

## Review findings — resolved

| Finding | Status | What changed |
|---|---|---|
| F1: source identity doesn't track edits | Fixed | Source revision is SHA-256 of every allowlisted file's bytes, recomputed for each run/tool call; missing source fails closed |
| F2: queued-work premise not represented | Fixed | Job inserted as `queued` **before** `updateOrderStatus` cancel; worker extracted to `runWorkerPhase()` for independent testability |
| F3a: shipping event claims absent state change | Fixed | `updateOrderStatus(db, oId, "shipped", ...)` called and verified before `worker_ship` emitted |
| F3b: DB status-read uses wrong kind | Fixed | Read event uses `kind: "worker_status_read"` (role `db_read`), not `"worker_skip"` |
| F4: reset is global and failure hidden | Fixed | `/api/demo/reset` accepts `{ runId }` for visitor-scoped wipe; client checks response status |

## Checkpoints

- [x] Name/scope/assets and Bob harness prepared.
- [x] 01 Core review: source identity, queue timing, worker paths and visitor reset reviewed and tested.
- [ ] 02 MCP: local stdio transport verified; actual tools called in Bob; two source-linked analyses saved. **← CURRENT**
- [ ] 03 UI: landing -> action -> journey -> explanation/source/evidence; recorded provenance; mobile.
- [ ] 04 Online: fresh visitor path, persistence, repeat/reset and errors checked.
- [ ] 05 Package: all relevant summaries, README, attribution, deck, cover, video and statements.
- [ ] 06 Submission: links/limits checked and actual confirmation saved.

Check boxes only with verified exit evidence, not an agent's assertion.

## After EVERY relevant Bob task

1. Review changed files and actual check results; commit a verified checkpoint.
2. Bob Tasks -> select project task -> click task header -> screenshot session consumption summary.
3. Save a readable task-summary PNG in bob_sessions/ using the task number and purpose in the filename. Include member alias for multiple builders.
4. Index contribution, files/commit and PNG in bob_sessions/README.md.
5. Update this guide; tell Codex Bob finished so review can begin.

Bob Shell and watsonx are optional. Shell/terminal/app screenshots supplement, never replace required IDE summaries. Subscription screenshot does not prove building.

## Targets — September 27, Lagos/WAT

| Target | Exit evidence |
| --- | --- |
| Next focused task | Genuine Bob MCP session: `list_runs` + `get_run` + `get_source` + `save_analysis` on both cancellation paths; capture summary PNG |
| 06:00–08:00 | Integrated UI, hosted visitor path and evidence checks |
| 10:00 | Latest build freeze target; begin demo packaging |
| 10:00–14:00 | Video, deck, cover, statements and public checks |
| 14:00 | Internal submission target |
| 16:00 | Official deadline: 15:00 UTC / 11 AM ET |

Targets are not promises. If MCP session slips, cut animations and landing extras; keep two real paths, Bob evidence and judge access. No fabricated fallback.

## Submission checklist

- [ ] lablab participant/team membership confirmed; IBM account team is different.
- [ ] Public repo includes source and all relevant participant Bob summary PNGs.
- [ ] Working app URL verified without private access.
- [ ] Cover and slide presentation ready.
- [ ] Narrated MP4 <=180s with >=90s solution action.
- [ ] Problem/solution and Bob usage statements each <=500 words.
- [ ] Originality/MIT requirement and dependency/asset attribution checked against form.
- [ ] Recorded/live/synthetic claims consistent across site/video/README.
- [ ] No secrets or personal/client data in tracked files/captures.
- [ ] Final links, visibility, playback and fresh-session test checked.
- [ ] Actual submission confirmation saved.

Sources: [event](https://lablab.ai/ai-hackathons/ibm-bob-2-hackathon), [guide](https://lablab-ibm-bob-2-hackathon-guide.s3.us.cloud-object-storage.appdomain.cloud/index.html), [IBM Bob IDE MCP setup](https://bob.ibm.com/docs/ide/configuration/mcp/mcp-in-bob). Inspect actual submission form before final delivery.

## Fill-in progress log

| Time WAT | Task | Actual commands/result | Commit | Summary PNG | Next action/blocker |
| --- | --- | --- | --- | --- | --- |
| 01:54 WAT | 01 Core checks | `npm test` 31/31 incl. citation path/bounds checks; typecheck all packages clean; production build passes outside sandbox; diff check clean | 6a1e7d9 pushed | completion report pages captured; required consumption summary pending | GPT-6 Sol review; resolve source revision/worker coverage; then MCP |
| Bob task 02 | Review fixes + MCP | Bob reports 54 tests; later review found and corrected the source-root bug. GPT-6 Luna: `npm test` 61/61; typecheck 4 packages; shared/API/MCP builds; stdio smoke | pending commit | `dcnstrct_task02_mcp_summary.png` saved (22.95 coins) | Fresh Bob analysis task, verify actual tools, save analyses and task summary |
