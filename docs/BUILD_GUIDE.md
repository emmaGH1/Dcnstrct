# Dcnstrct — start here

Last verified September 27, 2026, 01:50 WAT. Checkpoint 01 review passed for tests/typecheck/build; a Bob follow-up is required for two semantics gaps. Update after every checkpoint.

## Where I am

Current checkpoint: 01 review — resolve listed gaps before MCP.
Owner: user operating Bob IDE; Codex maintains harness and reviews after Bob stops.
Next action: start a fresh Bob follow-up from docs/bob-tasks/02-mcp.md; ask it to fix source revision and address worker_ship coverage before MCP work.
Last passing checks: `npm test` → 31/31 including citation allowlist/path/bounds; `npm run typecheck` → all packages clean; `npm run build` → all packages and Vite production bundle pass outside the filesystem sandbox; `git diff --check` clean.
Baseline commit: f58da4f (harness). Checkpoint 01 commit: pending after Bob follows up on source revision and unreachable worker_ship claim.
Public repository: https://github.com/emmaGH1/Dcnstrct

## Runtime notes

- SQLite: uses built-in `node:sqlite` (Node 24.16+). No native build required, no better-sqlite3.
- DB_PATH: defaults to `packages/api/data/dcnstrct.db` (created on first run). Set `DB_PATH=:memory:` for ephemeral/test.
- SOURCE_REVISION: defaults to `"dev"`; source edits will not invalidate recorded analyses unless configured. Fix this before saved Bob analysis.
- PORT: API defaults to `3001`. Client dev server runs on `3000` with proxy to `:3001`.

## Quick start (after checkpoint 01)

```sh
npm install
# Terminal 1
npm run dev -w packages/api
# Terminal 2
npm run dev -w packages/client
# Open http://localhost:3000
```

## Checks (checkpoint 01)

```sh
# Run all tests
npm run test -w packages/api
# → 31 passed, 31 total

# Typecheck all packages
npm run typecheck -w packages/shared
npm run typecheck -w packages/api
npm run typecheck -w packages/client
# → all pass with no output

# Build shared (needed before api production build)
npm run build -w packages/shared
```

Gaps at checkpoint 01 exit:
- Normal `worker_ship` branch exists but is unreachable in the two cancellation scenarios and has no test; do not claim that behavior is verified.
- The simulated fulfillment phase runs synchronously inside the request; it is not a separately scheduled asynchronous worker.
- No Bob MCP session yet; analysis unavailable. Checkpoint 02 deliverable. Normal worker_ship branch is not exercised; execution is synchronous inside request. Fix or narrow the claim before submission.
- UI is a minimal functional scaffold (raw event table). Checkpoint 03 deliverable.

## Targets — September 27, Lagos/WAT

| Target | Exit evidence |
| --- | --- |
| 01:50–02:00 | Bob follow-up: source revision, honest worker_ship coverage and summary capture |
| 10:00 | Hard feature freeze target; preserve time for submission |
| 10:00–12:30 | MCP if core is safe, then integrated UI and deployment |
| 12:30–14:00 | Video, deck, cover, statements and public checks |
| 14:00 | Internal submission target |
| 16:00 | Official deadline: 15:00 UTC / 11 AM ET |

Targets are not promises. If core/MCP slips, cut animations and landing extras; keep two real paths, Bob evidence and judge access. No fabricated fallback.

## Checkpoints

- [x] Name/scope/assets and Bob harness prepared.
- [ ] 01 Core review: test source citation assertion; close source revision gap; test or narrow worker_ship claim.
- [ ] 02 MCP: actual tools called in Bob; source analysis saved; invalid citations rejected.
- [ ] 03 UI: landing -> action -> journey -> explanation/source/evidence; recorded provenance; mobile.
- [ ] 04 Online: fresh visitor path, persistence, repeat/reset and errors checked.
- [ ] 05 Package: all relevant summaries, README, attribution, deck, cover, video and statements.
- [ ] 06 Submission: links/limits checked and actual confirmation saved.

Check boxes only with verified exit evidence, not an agent's assertion.

## After EVERY relevant Bob task

1. Review changed files and actual check results; commit a verified checkpoint.
2. Bob Tasks -> select project task -> click task header -> screenshot session consumption summary.
3. Save readable PNG in bob_sessions/: dcnstrct_task01_core_summary.png. Include member alias for multiple builders.
4. Index contribution, files/commit and PNG in bob_sessions/README.md. Include relevant retries and reviews, not only successes.
5. Update this guide; tell Codex Bob finished so review can begin.

Bob Shell and watsonx are optional. Shell/terminal/app screenshots supplement, never replace required IDE summaries. Subscription screenshot does not prove building.

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

Sources: [event](https://lablab.ai/ai-hackathons/ibm-bob-2-hackathon), [guide](https://lablab-ibm-bob-2-hackathon-guide.s3.us.cloud-object-storage.appdomain.cloud/index.html). Inspect actual submission form before final delivery.

## Fill-in progress log

| Time WAT | Task | Actual commands/result | Commit | Summary PNG | Next action/blocker |
| --- | --- | --- | --- | --- | --- |
| 01:50 WAT | 01 Core review | `npm test` 31/31 incl. citation path/bounds checks; typecheck all packages clean; production build passes outside sandbox; diff check clean | pending | completion report pages captured; required consumption summary pending | resolve source revision/worker coverage; then MCP |

Current task: 01 Core — Bob reports complete; Codex review is still in progress.
What worked: node:sqlite (built-in) removes native build dependency; ts-jest moduleNameMapper resolves shared package; all 31 tests pass first run after typecheck fixes.
What failed: better-sqlite3 native build (no MSVC/Visual Studio on this machine) — switched to node:sqlite. rootDir tsconfig constraint needed removal for workspace cross-package imports.
Files to inspect: packages/api/src/runs.ts (execution core), packages/api/src/__tests__/core.test.ts (all checks), packages/shared/src/contracts.ts (runtime contracts).
Next single action: Ask Bob to fix source revision and test/narrow worker_ship, then complete MCP using the same task.
