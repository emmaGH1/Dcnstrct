# Dcnstrct — start here

Latest update — 2026-09-27: Added the existing transparent Bob cutout as a decorative head peeking over the hero preview’s top-right edge, behind the frame. Responsive sizing and extra phone spacing keep the CTA clear; the image is aria-hidden and does not imply live Bob execution. Updated DESIGN.md and added plain Render Blueprint dashboard steps to DEPLOYMENT.md. Asset bytes, screenshot, workspace behavior and evidence source remain unchanged.

Checks: client typecheck and production build passed; actual 1440×1000 and 375×812 browser renders showed the loaded avatar with no horizontal overflow or CTA overlap. Final CSS seats it 9px lower behind the frame instead of leaving a small gap. git diff --check passed. No backend tests repeated for this decorative change. Hosted deployment/persistence remains pending; no Bob task ran and no new summary PNG is due.

Previous deployment preparation — 2026-09-27: Prepared the user-selected Render persistent-disk API plus Vercel UI deployment. Added Dockerfile/.dockerignore, render.yaml (Starter, 1 GB /data disk, production SQLite, manual deploys), vercel.json, a guarded Vercel build, public VITE_API_ORIGIN support, and docs/DEPLOYMENT.md. Pinned allowlisted evidence source to LF in .gitattributes without changing its bytes or recorded revision. Docker packages actual source and the reviewed corrected records; it does not ship a local database or private notes. The user will deploy and approve any host charges.

Checks: npm test passed 66/66 (43 API + 23 MCP); npm run typecheck passed all four packages; npm run build passed all packages. npm run check:deployment passed using an isolated production on-disk database: both paths, recorded/source matches, browser CORS preflight, persisted rows after process restart, production global-reset refusal and scoped reset isolation. Missing, HTTP and path-bearing Vercel backend origins were rejected. Vercel build with an HTTPS example origin passed; a normal local client build was restored afterward. git diff --check passed. Docker is unavailable locally, so no container build/run or actual Render/Vercel deployment is claimed. Previous responsive verification remains applicable; only the API base setting changed in the client.

Remaining: user deploys Render first, then sets VITE_API_ORIGIN and deploys Vercel from repository root. Verify real URLs, /demo reload, both outcomes, evidence, scoped reset and Render disk persistence across a host restart before filming. See docs/DEPLOYMENT.md for exact settings. Hosted persistence is not yet verified. No Bob task ran and no new summary PNG is due; save all relevant consumption summaries when another Bob task/retry/review runs.

Previous motion update — 2026-09-27: Added once-only scroll reveals to the landing preview and lower content: a 16px lift and 520ms eased fade. First-screen content stays immediately visible. Keyboard focus reveals pending content; reduced-motion preferences disable reveals, including changes while open. Content defaults to visible without observer support; observers/listeners clean up on route changes. No dependency or workspace behavior changed.

Changed: packages/client/src/App.tsx, packages/client/src/styles.css, docs/DESIGN.md and this guide. Checks: npm run typecheck -w packages/client passed; npm run build -w packages/client passed (JS 233.12 kB / 67.74 kB gzip; CSS 39.10 kB / 8.94 kB gzip); git diff --check passed. Browser scrolling at 1440×1000 and 375×812 confirmed pending-to-visible transitions, settled opacity 1 / no transform, and no horizontal overflow. Keyboard focus on the pending Bob project link revealed its section. Viewport override was reset. Reduced-motion code/CSS reviewed; OS preference was not changed for runtime testing. No backend tests repeated for this client-only polish.

Next: demo recording. Deployment/persistence and the disclosed Bob get_source discovery issue remain separate gaps. No Bob IDE task ran; no new consumption PNG is due. Save all relevant summaries in bob_sessions/ when a future Bob task, retry or review runs.

Previous capsule/preview update — 2026-09-27: Tightened the rotating capsule to its current word, enlarged the dot to 0.34em and aligned it with the lettering. Removed the pause/play state, button and styles at the user’s request; hidden-page/offscreen suspension and reduced-motion behavior remain. Replaced the skeleton with public/previews/workspace-cancellation.jpg, a genuine 1440×1000 capture (100,814 bytes) of preparing-order run run_0cXa4mKxQw with policy event 2 selected and its matching recorded Bob explanation. The static sample is clearly labeled. The capture’s natural aspect ratio gives the desktop preview more height.

Changed: App.tsx, styles.css, screenshot asset, DESIGN.md, task 03 notes, README.md and this guide. Checks: client typecheck and production build passed (JS 232.01 kB / 67.37 kB gzip; CSS 38.74 kB / 8.83 kB gzip). Actual landing checked at 1440×1000, 768×1024 and 375×812: image loaded at its native dimensions, no pause button exists and no page overflow appeared. Short and long words were observed fitting their own capsule. git diff --check passed. Capture run was reset through the scoped UI control, then its API GET returned 404. The screenshot remains historical evidence of that actual synthetic run. No API/shared/MCP code changed or backend tests repeated.

Remaining: user visual review, real demo video, deployment/persistence and the separately disclosed Bob get_source issue. No Bob IDE task ran for this UI pass; existing consumption PNGs are saved and no new summary is due.


Previous workspace update — 2026-09-27: Enlarged the header logo (48px desktop / 40px phone) and wordmark (23px desktop / 20px phone). Extended the approved design through the remaining landing sections and footer, removed redundant heading labels, and put the transparent Bob mascot on white. Rebuilt /demo as a naturally scrolling application frame with a restrained sidebar, compact action panel and an ordered journey beside selected evidence on desktop; tablet/phone layouts stack these areas. Evidence stays visible while scrolling later steps on wide screens.

Changed this pass: client App.tsx and styles.css; DESIGN.md, task 03 notes, README.md and this guide. Checks: npm run typecheck -w packages/client passed; npm run build -w packages/client passed (JS 232.54 kB / 67.48 kB gzip, CSS 40.27 kB / 9.23 kB gzip); git diff --check passed. The last full automated baseline remains 66/66 tests and all four package typechecks from the preceding commit; API/shared/MCP source was unchanged this pass. No backend tests were repeated for these layout changes.

Actual landing and workspace renders were checked at 375, 768 and 1440px. No page horizontal overflow was observed. Preparing cancellation produced nine events, one synthetic notification and worker skip; shipped cancellation produced three events, preserved shipped state and no cancellation notification. Both matched their recorded Bob explanations. Source tab returned numbered worker lines 460–476; observed data and comparison worked. UI reset cleared only this review tab’s two created runs (run__kazImYlaQ and run_xcA4OxhgsC). No prior visitor runs were reset. Full-page mobile capture had stitching artifacts; DOM counts and individual viewport renders confirmed one copy of each section/footer.

UI implementation is ready for user visual review and demo capture. The hero frame remains a labeled skeleton until a real capture/video is selected. Deployment, selected-host persistence and the disclosed Bob get_source discovery limitation remain separate gaps. Existing Bob consumption PNGs are saved; this Codex-only UI pass created no Bob session and needs no new consumption PNG. Save a new summary only when another Bob task/retry/review actually runs.


Previous first-screen update — 2026-09-27: User rejected the initial UI and authorized a focused first-screen rebuild against the supplied Notion reference. Rebuilt navigation, balanced two-line hero (“Understand what happens / and the [journey] behind it”), centered fully rounded rotating capsule, soft off-white canvas, pastel-green CTA and a 67%-width reserved workspace frame. The flat cancellation diagram is removed. Official Inter variable font is self-hosted with its license and preloaded; no package dependency was added.

This pass changed App.tsx, styles.css, client/index.html, public/fonts/InterVariable.woff2 and Inter-LICENSE.txt, DESIGN.md, README.md, this guide and task 03 notes. Verification: npm test passed 66/66 (43 API + 23 MCP); npm run typecheck passed all four packages; npm run build -w packages/client passed (JS 231.98 kB / 67.38 kB gzip; CSS 29.35 kB / 7.38 kB gzip). Initial sandbox build failed due Windows ancestor-directory permissions; rerunning outside the sandbox passed. git diff --check passed.

Actual landing renders were inspected at 1440×1000, 768×1024 and 375×812 using the browser’s documented viewport control. No horizontal overflow was observed; the font loaded, pause changed to resume, and the hero CTA opened /demo. The final accessible heading and full-opacity word transition were confirmed after rebuilding. Temporary viewport overrides were reset. Detector warnings for the chosen Inter family were retained to follow the reference; its skeleton border warning was resolved.

Remaining: user visual review of this first screen, separate workspace/lower-section redesign, real workspace screenshot or video, and full workspace responsive review. These checks apply to the landing page, not approval of the workspace. Checkpoint 03 remains open. Save ALL relevant Bob task consumption summary PNGs in bob_sessions/, including retries and reviews.


Earlier implementation status — 2026-09-27: The approved cream/pastel-green UI is implemented in React and served from the local API. It has a centered two-line hero with a multicolor rotating word pill, pastel-green CTA, centered navigation, five landing sections, a transparent IBM Bob mascot, and a separate naturally scrolling action workspace. The two synthetic cancellation outcomes, event journey, observed data, source excerpts, recorded analyses and comparison are wired to the real local API.

## Where I am

Current checkpoint: **03 UI implementation — landing and workspace rebuild ready for visual review and demo capture.** The final Bob summary is inspected and indexed. Bob confirms `get_source` still failed because its discovered schema omitted `sourceRevision`; it used `read_file` instead. Do not claim Bob called `get_source` successfully. Corrected records and their source references were independently validated by Codex; see docs/REVIEW-03.md.
Owner: Codex implements and reviews this UI checkpoint; the user operates genuine Bob IDE tasks.
Last passing checks: `npm test` → 66/66 (43 API + 23 MCP); `npm run typecheck` → all four packages clean; `npm run build` → shared, API, client and MCP clean; `npm run smoke:mcp` → MCP stdio initialize, discovery, list/get/source, error paths and 20 repeated DB calls passed; `git diff --check` → clean after final docs edits.
Local UI check: landing, mascot section and workspace were inspected in Chrome at the available desktop viewport (~1220px wide). Preparing and shipped flows, source lookup, Bob-analysis match, comparison, invalid citation/event/run, 404 handling, and scoped reset passed. Two persisted preparing-order test runs were reset by exact run ID; the shipped-order test ID was already 404. No other rows were reset. A 375/768/1440 visual pass is not claimed: the browser rejected the temporary narrow-preview URL under its URL safety policy, so no alternate viewport workaround was attempted.
The latest inspected Bob IDE summary is `bob_sessions/dcnstrct_task02b_bob_analysis_summary_final.png.png`, task `97e135f8b290f41a602bf35b18247040`, showing 6.20 Bobcoins. No demo-video asset or deployed visitor URL is confirmed.
Baseline commit: f58da4f (harness). Checkpoint 01 commit: 6a1e7d9. Verified MCP implementation commit: 0ce32b1. Task 02B evidence and review are recorded separately; corrected records passed independent source/revision checks, while Bob's get_source discovery issue remains disclosed.
Public repository: https://github.com/emmaGH1/Dcnstrct

## Planning history (superseded by the status above)

Latest palette selection: pastel-green light CTA/cream approved over OLED/blue; user requested neutral lighter journey markers, two-line centered hero/pill, 70–80% desktop preview width, stronger CTA with black circular arrow and nonredundant nav. Updated DESIGN/task 03 with overrides. Generated/refined conceptual image saved as ignored .hackathon/ui-previews/landing-pastel-refined.png; preview geometry remains approximate, headline wording adjustment remains proposed. No actual UI/assets/source behavior changed, no tests/build run. Documentation diff checked; runtime/responsive work remains Luna's task. Save ALL relevant Bob consumption-summary PNGs, including retries/reviews, in bob_sessions/.

Palette exploration follow-up: user requested pastel green light and OLED-style black alternatives using the earlier landing concept. Both generated/displayed and saved privately as .hackathon/ui-previews/landing-pastel-green.png and landing-oled-black.png. These are comparison options, not an approved replacement of DESIGN.md; await user selection. Generated preview text/events/logo redraws are illustrative only. No app source, actual mascot derivative, tests or builds changed. BUILD_GUIDE is the only tracked change; documentation diff checked. Continue saving all relevant Bob summary PNGs in bob_sessions/, including retries/reviews.

Latest UI feedback: user rejected initial teal theme/timid scale. Revised concept images saved privately as .hackathon/ui-previews/landing-concept-v2.png and workspace-concept-v2.png; DESIGN.md and task 03 now carry the overriding blue/cream direction, central pill, centered navigation, fuller editorial sections/footer and standalone mascot. Images displayed and visually inspected as concepts, not runtime verification. Mascot cutout derivative still needed; original asset unchanged. No app code/tests/build changed in this visual revision. Diff checks apply to documentation only; full UI implementation remains pending.

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

## Gaps and carried findings

- Bob's final summary is saved and inspected; task 02B displays 6.20 Bobcoins. Bob's get_source call remained blocked by its IDE schema, with read_file fallback disclosed.
- UI implementation and desktop flows are verified. Exact responsive screenshot review and independent checkpoint review remain open.
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
- [ ] 02 MCP: local stdio transport and Bob list/get/save calls verified; two source-linked analyses saved. Bob get_source remained unavailable; read_file fallback is documented.
- [ ] 03 UI: landing -> action -> journey -> explanation/source/evidence; recorded provenance; exact mobile/tablet/desktop visual checks and independent review. **← CURRENT**
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
| Next focused task | Independent checkpoint 03 review and exact responsive visual checks when an approved viewport method is available |
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
