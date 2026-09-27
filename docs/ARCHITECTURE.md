# Architecture contract

Planned stack: React/TypeScript/Vite; Node/TypeScript API; SQLite persisted orders, jobs, notifications and runs; local stdio MCP using official SDK. One deployable Node service serves built frontend. Commands/versions become authoritative after verification.

Flow: user action -> actual instrumented operations -> worker -> finalized run -> Bob reads run and bounded source via MCP -> validated structured analysis -> explorable UI. Prove genuine Bob tool use before broad UI work. No assumed Bob inference API. Hosted judges use real sample operations and clearly labeled recorded interpretations; Bob credentials stay local.

## Shared contracts — require runtime validation
Run: id, scenarioId, scenarioFingerprint, sourceRevision, status, startedAt, completedAt, events, beforeState, afterState.
Event: id, sequence, parentId/null, role, kind, label, outcome, observedData, sourceRef.
SourceRef: allowlisted relative file, startLine, endLine, sourceRevision.
Analysis: schemaVersion, runId, scenarioFingerprint, sourceRevision, provenance {provider: ibm-bob, taskReference, createdAt, delivery: recorded}, summary, steps [{eventId, explanation, sourceRefs, evidenceEventIds, uncertainty}], branchExplanation, sideEffects.
No invented model ID. Schema validity does not prove authorship; preserve actual Bob session reference.

## API and tools
GET /api/scenarios; POST /api/runs {scenarioId}; GET /api/runs/:id; POST /api/demo/reset. Isolated synthetic state per run, never shared global orders. Poll until actual worker completion.
MCP: list_runs, get_run, get_source, save_analysis. Source reads restricted to allowlist/bounded lines; no arbitrary execution/private files. Reject missing runs, bad event references, unfinished runs and mismatched revisions.

Recorded interpretation reuse requires identical scenario fingerprint/source revision and validated event-role remapping. Otherwise analysis is unavailable. Saved original runs remain explicitly recorded. Failed workers yield partial/failed runs, never fabricated completion.

Deployment gate: prove persistent writable SQLite on chosen host early; select supported persistence if needed before filming. No unannounced in-memory replacement. Synthetic data only.

## Deployment preparation — 2026-09-27

The selected hosted shape is a Vercel static Vite client plus one Render Docker API with a persistent /data disk and DB_PATH=/data/dcnstrct.db. The client compiles VITE_API_ORIGIN into its /api requests; unset origins preserve the same-origin local setup. The guarded Vercel build requires an HTTPS origin. Render retains actual allowlisted source and corrected recorded analyses; source bytes are pinned to LF across checkouts. No local SQLite database is packaged. The existing public synthetic API supports cross-origin requests. Local production restart/persistence and CORS preflight checks pass; actual hosted routing and persistent-disk checks remain pending until user deployment. See DEPLOYMENT.md.
