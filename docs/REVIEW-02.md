# Task 02 review and Luna implementation record

GPT-6 Sol review. Application code was not changed. The saved `bob_sessions/dcnstrct_task02_mcp_summary.png` is readable, shows task ID `ec493d91c8e1d51a59dd6be74991a973` and consumption of 22.95 Bobcoins. This confirms session evidence, not successful MCP use.

GPT-6 Luna Extra High implemented findings 1–4. Review findings are resolved in code and covered by checks below. Genuine IBM Bob IDE tool use and saved analyses remain pending.

## Verified progress

The preparing job is now queued before cancellation, the worker is independently testable, ordinary fulfillment persists shipped order state, and the status read has its own event kind. Reset checks HTTP failure and supports a specific run. The preceding independent test run passed 36 API and 18 MCP tests. Genuine Bob tool invocation and saved explanations are still pending.

## Findings from the original review (now resolved)

1. **P1: source identity hashes the wrong directory.** `packages/api/src/scenarios.ts:65` resolves four parents from `packages/api/src`, reaching the directory above the repository. Confirmed by a read-only Node path reproduction: the resolved root is `.../GitHub`, and `packages/api/src/runs.ts` does not exist there. Lines 72–73 silently hash missing-file markers; source edits therefore cannot change the identity. Resolve the actual repo root for both source and compiled execution, fail closed if source cannot be read, and test that a real allowlisted byte change changes the hash. Test missing-file failure as well.

2. **P1: MCP accepts stale source evidence.** `packages/mcp/src/tools.ts:304` compares analysis only to the stored run's revision. `get_source` reads current disk content at line 259 without associating it with a run or source revision. An old run and matching old analysis can pass while citing newer code. Use the same content-identity implementation for API and MCP. Bind source reads to an expected revision and reject stale run/current-source/analysis combinations, including source edits while processes remain running. Alternatively retain immutable source snapshots. Test source drift without merely supplying an arbitrary wrong analysis revision.

3. **P2: invalid citation ranges and revisions are accepted.** `packages/mcp/src/tools.ts:347` checks only lower start bound and upper end bound; it does not reject end before start. The shared schema at `packages/shared/src/contracts.ts:6` also lacks this relation. Per-citation sourceRevision is not compared with the analysis/run revision. Reject reversed ranges and mismatched citation revisions, and validate persisted event sourceRefs beyond schema shape when exposing them through get_run. Test these cases explicitly.

4. **P2: MCP database handles are never closed.** `packages/mcp/src/index.ts:67`, 86 and 133 open a new SQLite handle for each invocation and return without closing it. Close each in finally, or use a single managed connection with shutdown cleanup. Verify repeated real transport calls and ensure errors also release resources.

## Implementation and verification

- Shared `computeSourceRevision(repoRoot)` hashes the actual allowlisted file bytes and throws when a source file is missing. API runs compute the revision at execution time and stamp that value on the run and events.
- MCP list/get/source/save operations recompute current source identity. Stale runs and reads are rejected; source reads require the run revision; analyses and each citation must match it. Source files are rechecked after reading to detect concurrent edits.
- Shared citation schema rejects reversed ranges. `get_run` checks persisted event source files, ranges and per-event revisions against the current run.
- MCP handlers close SQLite in `finally`, including tool errors.
- Worker sourceRef ranges were corrected to point at the moved operations.
- `npm test`: 61 passed (38 API, 23 MCP). `npm run typecheck`: all four packages pass. Shared, API and MCP builds pass. `npm run smoke:mcp` initialized the actual stdio server, discovered all tools, read both run records and a cited source range, exercised missing-run and invalid-analysis responses, then made 20 repeated database-backed calls.
- Full root `npm run build` passed shared and API builds and client TypeScript compilation, then Vite/esbuild hit the sandbox's parent-directory access denial. The MCP package build passed separately. No IBM Bob IDE connection or authorship was asserted by this smoke test.
- Task 01 summary images are now separately saved as `dcnstrct_task01_core_summary_part1.png` and `...part2.png`; the original completion-report images were restored. Task 02 summary is saved separately as `dcnstrct_task02_mcp_summary.png`.

## Next action

The four implementation findings are resolved. IBM's current IDE guide confirms project MCP settings live in `.bob/mcp.json`, project settings win on same-name conflicts, and stdio accepts `cwd` and `env` properties. The repository config points at this workspace root and the shared API database. See [IBM Bob's MCP setup guide](https://bob.ibm.com/docs/ide/configuration/mcp/mcp-in-bob).

Remaining work is a fresh, short Bob IDE task using `docs/bob-tasks/02b-bob-analysis.md`: invoke the connected tools on two fresh runs, save two evidence-linked analyses, and capture that task's consumption summary. Do not continue the old 100-turn task. Pause before broad UI work until the Bob evidence is reviewed.
