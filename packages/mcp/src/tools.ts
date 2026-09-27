/**
 * packages/mcp/src/tools.ts — pure tool handler logic for Dcnstrct MCP
 *
 * SOURCE_ALLOWLIST: packages/mcp/src/tools.ts
 *
 * Each exported function corresponds to an MCP tool. They receive a Db instance
 * and validated arguments, perform all validation, and return a result object.
 * This separation makes the handlers testable without the MCP transport layer.
 */
import fs from "fs";
import path from "path";
import {
  SOURCE_ALLOWLIST,
  SourceRefSchema,
  AnalysisSchema,
  RunEventSchema,
  computeSourceRevision,
} from "@dcnstrct/shared";
import type { Analysis } from "@dcnstrct/shared";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");
export type Db = InstanceType<typeof DatabaseSync>;

// ── DB row types ─────────────────────────────────────────────────────────────

export type RunSummaryRow = {
  id: string;
  scenario_id: string;
  scenario_fingerprint: string;
  source_revision: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  cancel_accepted: number | null;
  refusal_reason: string | null;
};

type EventRow = {
  id: string;
  sequence: number;
  parent_id: string | null;
  role: string;
  kind: string;
  label: string;
  outcome: string;
  observed_data: string;
  source_file: string;
  source_start: number;
  source_end: number;
  source_rev: string;
  before_state: string | null;
  after_state: string | null;
  timestamp: string;
};

// ── Tool result shape (mirrors MCP CallToolResult) ───────────────────────────

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

function ok(obj: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] };
}

function err(obj: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(obj) }], isError: true };
}

// ── DB helpers ────────────────────────────────────────────────────────────────

export function listCompletedRuns(db: Db, limit: number): RunSummaryRow[] {
  return db
    .prepare(
      `SELECT id, scenario_id, scenario_fingerprint, source_revision, status,
              started_at, completed_at, cancel_accepted, refusal_reason
       FROM runs WHERE status = 'completed'
       ORDER BY completed_at DESC LIMIT ?`
    )
    .all(limit) as RunSummaryRow[];
}

export function getRunRow(db: Db, runId: string): RunSummaryRow | null {
  return (
    (db
      .prepare(
        `SELECT id, scenario_id, scenario_fingerprint, source_revision, status,
                started_at, completed_at, cancel_accepted, refusal_reason
         FROM runs WHERE id = ?`
      )
      .get(runId) as RunSummaryRow | undefined) ?? null
  );
}

function getRunEvents(db: Db, runId: string): EventRow[] {
  return db
    .prepare(
      `SELECT id, sequence, parent_id, role, kind, label, outcome,
              observed_data, source_file, source_start, source_end, source_rev,
              before_state, after_state, timestamp
       FROM run_events WHERE run_id = ? ORDER BY sequence ASC`
    )
    .all(runId) as EventRow[];
}

function getRunEventIds(db: Db, runId: string): Set<string> {
  const rows = db
    .prepare(`SELECT id FROM run_events WHERE run_id = ?`)
    .all(runId) as Array<{ id: string }>;
  return new Set(rows.map((r) => r.id));
}

export function ensureAnalysisTable(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS analyses (
      id         TEXT PRIMARY KEY,
      run_id     TEXT NOT NULL,
      data       TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_analyses_run ON analyses(run_id);
  `);
}

function saveAnalysisRow(db: Db, analysisId: string, runId: string, data: string): void {
  ensureAnalysisTable(db);
  db.prepare(
    `INSERT OR REPLACE INTO analyses (id, run_id, data, created_at) VALUES (?, ?, ?, ?)`
  ).run(analysisId, runId, data, new Date().toISOString());
}

// ── Path utilities ────────────────────────────────────────────────────────────

export function isAllowlisted(file: string): boolean {
  return (SOURCE_ALLOWLIST as readonly string[]).includes(file);
}

/**
 * Resolve the monorepo root relative to this file's location.
 * In dist/ (compiled): __dirname = packages/mcp/dist → root is three levels up
 * In src/ (ts-jest tests): __dirname = packages/mcp/src → root is three levels up
 * Both have 3 path components from workspace root: packages/<pkg>/<dir>
 */
export function resolveRepoRoot(): string {
  return path.resolve(__dirname, "../../..");
}

function sourceRevisionAt(root: string): string {
  return computeSourceRevision(root);
}

export function readBoundedSource(
  relFile: string,
  startLine: number,
  endLine: number,
  repoRootOverride?: string
): string {
  const root = repoRootOverride ?? resolveRepoRoot();
  const abs = path.join(root, relFile);
  const lines = fs.readFileSync(abs, "utf8").split(/\r?\n/);
  if (startLine < 1 || endLine < startLine || endLine > lines.length) {
    throw new Error(
      `Line range ${startLine}–${endLine} is out of bounds (file has ${lines.length} lines)`
    );
  }
  return lines.slice(startLine - 1, endLine).join("\n");
}

function nanoid8(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ── Tool handlers ─────────────────────────────────────────────────────────────

export function toolListRuns(db: Db, limit: number | undefined, repoRoot = resolveRepoRoot()): ToolResult {
  let currentRevision: string;
  try {
    currentRevision = sourceRevisionAt(repoRoot);
  } catch (e) {
    return err({ error: "Current source cannot be verified", detail: e instanceof Error ? e.message : String(e) });
  }
  const rows = listCompletedRuns(db, limit ?? 10);
  const runs = rows.map((r) => ({
    id: r.id,
    scenarioId: r.scenario_id,
    scenarioFingerprint: r.scenario_fingerprint,
    sourceRevision: r.source_revision,
    sourceCurrent: r.source_revision === currentRevision,
    status: r.status,
    completedAt: r.completed_at,
    cancelAccepted: r.cancel_accepted === null ? null : r.cancel_accepted === 1,
    refusalReason: r.refusal_reason,
  }));
  return ok(runs);
}

export function toolGetRun(db: Db, runId: string, repoRoot = resolveRepoRoot()): ToolResult {
  const row = getRunRow(db, runId);
  if (!row) return err({ error: "Run not found", runId });
  if (row.status !== "completed") {
    return err({ error: "Run is not finalized", runId, status: row.status });
  }

  let currentRevision: string;
  try {
    currentRevision = sourceRevisionAt(repoRoot);
  } catch (e) {
    return err({ error: "Current source cannot be verified", detail: e instanceof Error ? e.message : String(e) });
  }
  if (row.source_revision !== currentRevision) {
    return err({
      error: "Run source revision is stale; rerun the scenario against the current source",
      runRevision: row.source_revision,
      currentRevision,
    });
  }

  const eventRows = getRunEvents(db, runId);
  const parseErrors: string[] = [];
  const events = eventRows.map((r) => {
    const parsed = RunEventSchema.safeParse({
      id: r.id,
      sequence: r.sequence,
      parentId: r.parent_id,
      role: r.role,
      kind: r.kind,
      label: r.label,
      outcome: r.outcome,
      observedData: JSON.parse(r.observed_data) as Record<string, unknown>,
      sourceRef: {
        file: r.source_file,
        startLine: r.source_start,
        endLine: r.source_end,
        sourceRevision: r.source_rev,
      },
      before: r.before_state ? (JSON.parse(r.before_state) as Record<string, unknown>) : null,
      after: r.after_state ? (JSON.parse(r.after_state) as Record<string, unknown>) : null,
      timestamp: r.timestamp,
    });
    if (!parsed.success) {
      parseErrors.push(`event ${r.id}: ${parsed.error.message}`);
      return null;
    }
    return parsed.data;
  });

  if (parseErrors.length > 0) {
    return err({ error: "Event schema validation failed", parseErrors });
  }

  const badSourceRefs: string[] = [];
  for (const event of events) {
    if (!event) continue;
    const sourceRef = event.sourceRef;
    if (!isAllowlisted(sourceRef.file)) {
      badSourceRefs.push(`${event.id}: source file is not allowlisted (${sourceRef.file})`);
      continue;
    }
    if (sourceRef.sourceRevision !== row.source_revision) {
      badSourceRefs.push(`${event.id}: source revision does not match its run`);
      continue;
    }
    try {
      readBoundedSource(sourceRef.file, sourceRef.startLine, sourceRef.endLine, repoRoot);
    } catch (e) {
      badSourceRefs.push(`${event.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (badSourceRefs.length > 0) {
    return err({ error: "Run contains invalid source references", badSourceRefs });
  }
  try {
    if (sourceRevisionAt(repoRoot) !== row.source_revision) {
      return err({ error: "Source changed while the run was being read; retry after rerunning it" });
    }
  } catch (e) {
    return err({ error: "Current source cannot be verified", detail: e instanceof Error ? e.message : String(e) });
  }

  const triggerEvt = events.find((e) => e?.role === "trigger");
  const completionEvt = [...events].reverse().find((e) => e?.role === "completion");

  return ok({
    id: row.id,
    scenarioId: row.scenario_id,
    scenarioFingerprint: row.scenario_fingerprint,
    sourceRevision: row.source_revision,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    cancelAccepted: row.cancel_accepted === null ? null : row.cancel_accepted === 1,
    refusalReason: row.refusal_reason,
    events,
    beforeState: triggerEvt?.before ?? null,
    afterState: completionEvt?.after ?? null,
  });
}

export function toolGetSource(
  file: string,
  startLine: number,
  endLine: number,
  expectedSourceRevision: string,
  repoRootOverride?: string
): ToolResult {
  if (!isAllowlisted(file)) {
    return err({ error: "File not in SOURCE_ALLOWLIST", file, allowlist: [...SOURCE_ALLOWLIST] });
  }
  if (endLine < startLine) {
    return err({ error: "endLine must be >= startLine", startLine, endLine });
  }
  try {
    const repoRoot = repoRootOverride ?? resolveRepoRoot();
    const currentRevision = sourceRevisionAt(repoRoot);
    if (expectedSourceRevision !== currentRevision) {
      return err({
        error: "Source revision mismatch; refresh the run before reading source",
        expectedRevision: expectedSourceRevision,
        currentRevision,
      });
    }
    const text = readBoundedSource(file, startLine, endLine, repoRoot);
    if (sourceRevisionAt(repoRoot) !== currentRevision) {
      return err({ error: "Source changed while being read; retry with a fresh run" });
    }
    return ok({ file, startLine, endLine, sourceRevision: currentRevision, text });
  } catch (e) {
    return err({
      error: e instanceof Error ? e.message : String(e),
      file,
      startLine,
      endLine,
    });
  }
}

export function toolSaveAnalysis(
  db: Db,
  analysisJson: string,
  repoRootOverride?: string
): ToolResult {
  let analysis: Analysis;
  try {
    analysis = AnalysisSchema.parse(JSON.parse(analysisJson));
  } catch (e) {
    return err({
      error: "Analysis failed schema validation",
      detail: e instanceof Error ? e.message : String(e),
    });
  }

  const row = getRunRow(db, analysis.runId);
  if (!row) return err({ error: "Run not found", runId: analysis.runId });
  if (row.status !== "completed") {
    return err({
      error: "Cannot save analysis for unfinished run",
      runId: analysis.runId,
      status: row.status,
    });
  }

  if (analysis.scenarioFingerprint !== row.scenario_fingerprint) {
    return err({
      error: "Scenario fingerprint mismatch — analysis was prepared against a different scenario",
      analysisFp: analysis.scenarioFingerprint,
      runFp: row.scenario_fingerprint,
    });
  }

  if (analysis.sourceRevision !== row.source_revision) {
    return err({
      error: "Source revision mismatch — analysis was prepared against different source",
      analysisRev: analysis.sourceRevision,
      runRev: row.source_revision,
      note: "Re-run the scenario and regenerate the analysis against the current source.",
    });
  }

  const root = repoRootOverride ?? resolveRepoRoot();
  let currentRevision: string;
  try {
    currentRevision = sourceRevisionAt(root);
  } catch (e) {
    return err({ error: "Current source cannot be verified", detail: e instanceof Error ? e.message : String(e) });
  }
  if (row.source_revision !== currentRevision) {
    return err({
      error: "Run source revision is stale; rerun the scenario before saving analysis",
      runRevision: row.source_revision,
      currentRevision,
    });
  }

  // All event ids must belong to this run
  const ownedIds = getRunEventIds(db, analysis.runId);
  const badEventIds: string[] = [];
  for (const step of analysis.steps) {
    if (!ownedIds.has(step.eventId)) badEventIds.push(step.eventId);
    for (const eId of step.evidenceEventIds) {
      if (!ownedIds.has(eId)) badEventIds.push(eId);
    }
  }
  if (badEventIds.length > 0) {
    return err({
      error: "Analysis references event IDs that do not belong to this run",
      badEventIds: [...new Set(badEventIds)],
      runId: analysis.runId,
    });
  }

  // All sourceRefs must be allowlisted and within bounds
  const badRefs: string[] = [];
  for (const step of analysis.steps) {
    for (const sr of step.sourceRefs) {
      const srParsed = SourceRefSchema.safeParse(sr);
      if (!srParsed.success) {
        badRefs.push(`invalid sourceRef shape: ${JSON.stringify(sr)}`);
        continue;
      }
      if (!isAllowlisted(srParsed.data.file)) {
        badRefs.push(`not allowlisted: ${srParsed.data.file}`);
        continue;
      }
      if (srParsed.data.sourceRevision !== row.source_revision) {
        badRefs.push(`source revision mismatch: ${srParsed.data.file}`);
        continue;
      }
      try {
        const abs = path.join(root, srParsed.data.file);
        const lineCount = fs.readFileSync(abs, "utf8").split(/\r?\n/).length;
        if (srParsed.data.startLine < 1 || srParsed.data.endLine > lineCount) {
          badRefs.push(
            `out of bounds ${srParsed.data.file}:${srParsed.data.startLine}-${srParsed.data.endLine} (file has ${lineCount} lines)`
          );
        }
      } catch {
        badRefs.push(`cannot read file for bounds check: ${srParsed.data.file}`);
      }
    }
  }
  if (badRefs.length > 0) {
    return err({ error: "Analysis contains invalid or out-of-bounds sourceRefs", badRefs });
  }
  try {
    if (sourceRevisionAt(root) !== row.source_revision) {
      return err({ error: "Source changed while validating the analysis; regenerate it against a fresh run" });
    }
  } catch (e) {
    return err({ error: "Current source cannot be verified", detail: e instanceof Error ? e.message : String(e) });
  }

  const analysisId = `ana_${analysis.runId.slice(4)}_${nanoid8()}`;
  saveAnalysisRow(db, analysisId, analysis.runId, JSON.stringify(analysis));

  return ok({
    ok: true,
    analysisId,
    runId: analysis.runId,
    scenarioFingerprint: analysis.scenarioFingerprint,
    sourceRevision: analysis.sourceRevision,
    note: "Schema validity confirms structure only. Provenance.taskReference must record the actual IBM Bob task used.",
  });
}
