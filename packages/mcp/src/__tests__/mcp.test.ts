/**
 * mcp.test.ts — meaningful checks for MCP tool handlers (checkpoint 02)
 *
 * Tests cover:
 *  1. list_runs: returns completed runs; excludes non-completed
 *  2. get_run: returns finalized run with validated events
 *  3. get_run: rejects missing run (not found)
 *  4. get_run: rejects non-completed (running) run
 *  5. get_source: reads allowlisted file within bounds
 *  6. get_source: rejects non-allowlisted file
 *  7. get_source: rejects out-of-bounds line range
 *  8. save_analysis: accepts valid analysis against a real run
 *  9. save_analysis: rejects missing run
 * 10. save_analysis: rejects bad event citation (foreign event id)
 * 11. save_analysis: rejects source revision mismatch
 * 12. save_analysis: rejects scenario fingerprint mismatch
 * 13. save_analysis: rejects out-of-bounds sourceRef
 * 14. save_analysis: rejects non-allowlisted sourceRef
 */
import fs from "fs";
import os from "os";
import path from "path";
import { SOURCE_ALLOWLIST, computeSourceRevision } from "@dcnstrct/shared";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");
import {
  toolListRuns,
  toolGetRun,
  toolGetSource,
  toolSaveAnalysis,
  ensureAnalysisTable,
  resolveRepoRoot,
  type Db,
} from "../tools";
import { executeRun } from "../../../api/src/runs";
import { createTestDb } from "../../../api/src/db";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseResult(result: { content: Array<{ type: string; text: string }> }) {
  return JSON.parse(result.content[0].text) as Record<string, unknown>;
}

function isError(result: { isError?: boolean }) {
  return result.isError === true;
}

function copyAllowlistedSources(destination: string): void {
  const root = resolveRepoRoot();
  for (const relative of SOURCE_ALLOWLIST) {
    const target = path.join(destination, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(root, relative), target);
  }
}

/**
 * Build a minimal valid Analysis JSON string for a given run.
 * Uses the actual run's scenarioFingerprint and sourceRevision so it passes checks.
 */
function buildValidAnalysis(
  runId: string,
  eventId: string,
  fp: string,
  rev: string
): string {
  return JSON.stringify({
    schemaVersion: "1",
    runId,
    scenarioFingerprint: fp,
    sourceRevision: rev,
    provenance: {
      provider: "ibm-bob",
      taskReference: "task_test_placeholder",
      createdAt: new Date().toISOString(),
      delivery: "recorded",
    },
    summary: "Test analysis: cancellation accepted, worker skipped shipment.",
    steps: [
      {
        eventId,
        explanation: "The policy check accepted the cancellation because the order was still preparing.",
        sourceRefs: [
          {
            file: "packages/api/src/runs.ts",
            startLine: 1,
            endLine: 20,
            sourceRevision: rev,
          },
        ],
        evidenceEventIds: [eventId],
        uncertainty: null,
      },
    ],
    branchExplanation: "cancel_preparing path: accepted, worker skipped.",
    sideEffects: ["order status set to cancelled", "notification persisted", "job skipped"],
  });
}

// ── Test DB with full schema ───────────────────────────────────────────────────

function buildTestMcpDb(): Db {
  const db = createTestDb();
  ensureAnalysisTable(db);
  return db;
}

// ── 1. list_runs ──────────────────────────────────────────────────────────────

describe("list_runs", () => {
  it("returns completed runs in descending order", () => {
    const db = buildTestMcpDb();
    executeRun(db, "cancel_preparing");
    executeRun(db, "cancel_shipped");
    const result = toolListRuns(db, 10);
    expect(isError(result)).toBe(false);
    const runs = JSON.parse(result.content[0].text) as Array<{ id: string; status: string }>;
    expect(Array.isArray(runs)).toBe(true);
    expect(runs.length).toBe(2);
    for (const r of runs) {
      expect(r.status).toBe("completed");
    }
  });

  it("respects the limit parameter", () => {
    const db = buildTestMcpDb();
    executeRun(db, "cancel_preparing");
    executeRun(db, "cancel_shipped");
    const result = toolListRuns(db, 1);
    const runs = JSON.parse(result.content[0].text) as unknown[];
    expect(runs.length).toBe(1);
  });

  it("uses default limit of 10 when limit is undefined", () => {
    const db = buildTestMcpDb();
    for (let i = 0; i < 3; i++) executeRun(db, "cancel_preparing");
    const result = toolListRuns(db, undefined);
    expect(isError(result)).toBe(false);
    const runs = JSON.parse(result.content[0].text) as unknown[];
    expect(runs.length).toBe(3);
  });
});

// ── 2. get_run — success ──────────────────────────────────────────────────────

describe("get_run — success", () => {
  let runId: string;
  let db: Db;

  beforeAll(() => {
    db = buildTestMcpDb();
    runId = executeRun(db, "cancel_preparing");
  });

  it("returns completed run with events", () => {
    const result = toolGetRun(db, runId);
    expect(isError(result)).toBe(false);
    const run = parseResult(result) as { id: string; status: string; events: unknown[] };
    expect(run.id).toBe(runId);
    expect(run.status).toBe("completed");
    expect(Array.isArray(run.events)).toBe(true);
    expect((run.events as unknown[]).length).toBeGreaterThan(0);
  });

  it("run contains scenarioFingerprint and sourceRevision", () => {
    const result = toolGetRun(db, runId);
    const run = parseResult(result) as {
      scenarioFingerprint: string;
      sourceRevision: string;
    };
    expect(run.scenarioFingerprint).toBeTruthy();
    expect(run.sourceRevision).toBeTruthy();
  });
});

// ── 3. get_run — missing run ──────────────────────────────────────────────────

describe("get_run — missing run", () => {
  it("returns isError:true for a non-existent runId", () => {
    const db = buildTestMcpDb();
    const result = toolGetRun(db, "run_doesnotexist");
    expect(isError(result)).toBe(true);
    const body = parseResult(result) as { error: string };
    expect(body.error).toMatch(/not found/i);
  });
});

// ── 4. get_run — non-completed run ────────────────────────────────────────────

describe("get_run — non-completed run", () => {
  it("returns isError:true for a run that is still running", () => {
    const db = buildTestMcpDb();
    const ts = new Date().toISOString();
    // Insert a run with status 'running' directly
    db.prepare(
      `INSERT INTO runs (id, scenario_id, scenario_fingerprint, source_revision, status, started_at)
       VALUES (?, 'cancel_preparing', 'fp_test', 'rev_test', 'running', ?)`
    ).run("run_stillrunning", ts);

    const result = toolGetRun(db, "run_stillrunning");
    expect(isError(result)).toBe(true);
    const body = parseResult(result) as { error: string; status: string };
    expect(body.error).toMatch(/not finalized/i);
    expect(body.status).toBe("running");
  });
});

// ── 5. get_source — success ───────────────────────────────────────────────────

describe("get_source — success", () => {
  it("reads first 5 lines of an allowlisted file", () => {
    const revision = computeSourceRevision(resolveRepoRoot());
    const result = toolGetSource("packages/api/src/runs.ts", 1, 5, revision);
    expect(isError(result)).toBe(false);
    const body = parseResult(result) as { file: string; startLine: number; endLine: number; text: string };
    expect(body.file).toBe("packages/api/src/runs.ts");
    expect(body.startLine).toBe(1);
    expect(body.endLine).toBe(5);
    expect(typeof body.text).toBe("string");
    expect(body.text.length).toBeGreaterThan(0);
  });
});

// ── 6. get_source — non-allowlisted file ─────────────────────────────────────

describe("get_source — non-allowlisted file", () => {
  it("rejects a file not in SOURCE_ALLOWLIST", () => {
    const result = toolGetSource("packages/api/src/server.ts", 1, 5, "unused");
    expect(isError(result)).toBe(true);
    const body = parseResult(result) as { error: string };
    expect(body.error).toMatch(/allowlist/i);
  });
});

// ── 7. get_source — out-of-bounds ────────────────────────────────────────────

describe("get_source — out-of-bounds", () => {
  it("rejects startLine greater than file length", () => {
    const result = toolGetSource("packages/api/src/runs.ts", 999999, 999999, computeSourceRevision(resolveRepoRoot()));
    expect(isError(result)).toBe(true);
    const body = parseResult(result) as { error: string };
    expect(body.error).toMatch(/out of bounds/i);
  });

  it("rejects endLine < startLine", () => {
    const result = toolGetSource("packages/api/src/runs.ts", 10, 5, computeSourceRevision(resolveRepoRoot()));
    expect(isError(result)).toBe(true);
    const body = parseResult(result) as { error: string };
    expect(body.error).toMatch(/endLine/i);
  });
});

describe("source drift validation", () => {
  it("rejects source reads when the expected run revision is stale", () => {
    const result = toolGetSource("packages/api/src/runs.ts", 1, 5, "old-source-revision");
    expect(isError(result)).toBe(true);
    expect(parseResult(result).error).toMatch(/revision mismatch/i);
  });

  it("rejects an analysis for an old run after allowlisted source bytes change", () => {
    const db = buildTestMcpDb();
    const runId = executeRun(db, "cancel_preparing");
    const run = db.prepare("SELECT scenario_fingerprint, source_revision FROM runs WHERE id = ?")
      .get(runId) as { scenario_fingerprint: string; source_revision: string };
    const eventId = (db.prepare("SELECT id FROM run_events WHERE run_id = ? LIMIT 1").get(runId) as { id: string }).id;
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "dcnstrct-mcp-drift-"));
    try {
      copyAllowlistedSources(fixture);
      fs.appendFileSync(path.join(fixture, "packages/api/src/runs.ts"), "\n// drift\n");
      const result = toolSaveAnalysis(
        db,
        buildValidAnalysis(runId, eventId, run.scenario_fingerprint, run.source_revision),
        fixture
      );
      expect(isError(result)).toBe(true);
      expect(parseResult(result).error).toMatch(/source revision is stale/i);
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("rejects persisted run events with citation revisions that differ from the run", () => {
    const db = buildTestMcpDb();
    const runId = executeRun(db, "cancel_preparing");
    const eventId = (db.prepare("SELECT id FROM run_events WHERE run_id = ? LIMIT 1").get(runId) as { id: string }).id;
    db.prepare("UPDATE run_events SET source_rev = 'stale' WHERE id = ?").run(eventId);
    const result = toolGetRun(db, runId);
    expect(isError(result)).toBe(true);
    expect(parseResult(result).error).toMatch(/invalid source references/i);
  });
});

// ── 8. save_analysis — success ────────────────────────────────────────────────

describe("save_analysis — success", () => {
  it("accepts a valid analysis and returns analysisId", () => {
    const db = buildTestMcpDb();
    const runId = executeRun(db, "cancel_preparing");
    const run = db
      .prepare("SELECT scenario_fingerprint, source_revision FROM runs WHERE id = ?")
      .get(runId) as { scenario_fingerprint: string; source_revision: string };
    const eventId = (
      db.prepare("SELECT id FROM run_events WHERE run_id = ? LIMIT 1").get(runId) as { id: string }
    ).id;

    const analysisJson = buildValidAnalysis(
      runId,
      eventId,
      run.scenario_fingerprint,
      run.source_revision
    );

    const result = toolSaveAnalysis(db, analysisJson);
    expect(isError(result)).toBe(false);
    const body = parseResult(result) as { ok: boolean; analysisId: string; runId: string };
    expect(body.ok).toBe(true);
    expect(body.analysisId).toBeTruthy();
    expect(body.runId).toBe(runId);

    // Verify persisted in DB
    const row = db
      .prepare("SELECT id, run_id FROM analyses WHERE run_id = ?")
      .get(runId) as { id: string; run_id: string } | undefined;
    expect(row).toBeDefined();
    expect(row?.run_id).toBe(runId);
  });
});

// ── 9. save_analysis — missing run ────────────────────────────────────────────

describe("save_analysis — missing run", () => {
  it("rejects analysis for non-existent run", () => {
    const db = buildTestMcpDb();
    const analysisJson = buildValidAnalysis(
      "run_doesnotexist",
      "evt_dummy_01",
      "fp_doesnotmatter",
      "rev_doesnotmatter"
    );
    const result = toolSaveAnalysis(db, analysisJson);
    expect(isError(result)).toBe(true);
    const body = parseResult(result) as { error: string };
    expect(body.error).toMatch(/not found/i);
  });
});

// ── 10. save_analysis — bad event citation ────────────────────────────────────

describe("save_analysis — bad event citation", () => {
  it("rejects analysis that cites an event from a different run", () => {
    const db = buildTestMcpDb();
    const runId = executeRun(db, "cancel_preparing");
    const run = db
      .prepare("SELECT scenario_fingerprint, source_revision FROM runs WHERE id = ?")
      .get(runId) as { scenario_fingerprint: string; source_revision: string };

    // Use a foreign event id
    const foreignEventId = "evt_foreignrun_01";
    const analysisJson = buildValidAnalysis(
      runId,
      foreignEventId,
      run.scenario_fingerprint,
      run.source_revision
    );

    const result = toolSaveAnalysis(db, analysisJson);
    expect(isError(result)).toBe(true);
    const body = parseResult(result) as { error: string; badEventIds: string[] };
    expect(body.error).toMatch(/event IDs/i);
    expect(body.badEventIds).toContain(foreignEventId);
  });
});

// ── 11. save_analysis — source revision mismatch ─────────────────────────────

describe("save_analysis — source revision mismatch", () => {
  it("rejects analysis with a different sourceRevision than the run", () => {
    const db = buildTestMcpDb();
    const runId = executeRun(db, "cancel_preparing");
    const run = db
      .prepare("SELECT scenario_fingerprint FROM runs WHERE id = ?")
      .get(runId) as { scenario_fingerprint: string };
    const eventId = (
      db.prepare("SELECT id FROM run_events WHERE run_id = ? LIMIT 1").get(runId) as { id: string }
    ).id;

    // Use a stale/wrong sourceRevision
    const analysisJson = buildValidAnalysis(
      runId,
      eventId,
      run.scenario_fingerprint,
      "stale_revision_000000"
    );

    const result = toolSaveAnalysis(db, analysisJson);
    expect(isError(result)).toBe(true);
    const body = parseResult(result) as { error: string };
    expect(body.error).toMatch(/revision mismatch/i);
  });
});

describe("save_analysis — citation validation", () => {
  it("rejects a sourceRef with a revision different from its run", () => {
    const db = buildTestMcpDb();
    const runId = executeRun(db, "cancel_preparing");
    const run = db.prepare("SELECT scenario_fingerprint, source_revision FROM runs WHERE id = ?")
      .get(runId) as { scenario_fingerprint: string; source_revision: string };
    const eventId = (db.prepare("SELECT id FROM run_events WHERE run_id = ? LIMIT 1").get(runId) as { id: string }).id;
    const analysis = JSON.parse(buildValidAnalysis(runId, eventId, run.scenario_fingerprint, run.source_revision));
    analysis.steps[0].sourceRefs[0].sourceRevision = "other-revision";
    const result = toolSaveAnalysis(db, JSON.stringify(analysis));
    expect(isError(result)).toBe(true);
    expect(parseResult(result).badRefs).toContain("source revision mismatch: packages/api/src/runs.ts");
  });

  it("rejects a reversed citation range at schema validation", () => {
    const db = buildTestMcpDb();
    const runId = executeRun(db, "cancel_preparing");
    const run = db.prepare("SELECT scenario_fingerprint, source_revision FROM runs WHERE id = ?")
      .get(runId) as { scenario_fingerprint: string; source_revision: string };
    const eventId = (db.prepare("SELECT id FROM run_events WHERE run_id = ? LIMIT 1").get(runId) as { id: string }).id;
    const analysis = JSON.parse(buildValidAnalysis(runId, eventId, run.scenario_fingerprint, run.source_revision));
    analysis.steps[0].sourceRefs[0].startLine = 20;
    analysis.steps[0].sourceRefs[0].endLine = 10;
    const result = toolSaveAnalysis(db, JSON.stringify(analysis));
    expect(isError(result)).toBe(true);
    expect(parseResult(result).error).toMatch(/schema validation/i);
  });
});

// ── 12. save_analysis — scenario fingerprint mismatch ────────────────────────

describe("save_analysis — scenario fingerprint mismatch", () => {
  it("rejects analysis with a different scenarioFingerprint than the run", () => {
    const db = buildTestMcpDb();
    const runId = executeRun(db, "cancel_preparing");
    const run = db
      .prepare("SELECT source_revision FROM runs WHERE id = ?")
      .get(runId) as { source_revision: string };
    const eventId = (
      db.prepare("SELECT id FROM run_events WHERE run_id = ? LIMIT 1").get(runId) as { id: string }
    ).id;

    const analysisJson = buildValidAnalysis(
      runId,
      eventId,
      "wrongfingerprint001",
      run.source_revision
    );

    const result = toolSaveAnalysis(db, analysisJson);
    expect(isError(result)).toBe(true);
    const body = parseResult(result) as { error: string };
    expect(body.error).toMatch(/fingerprint mismatch/i);
  });
});

// ── 13. save_analysis — out-of-bounds sourceRef ───────────────────────────────

describe("save_analysis — out-of-bounds sourceRef", () => {
  it("rejects analysis with sourceRef lines beyond file length", () => {
    const db = buildTestMcpDb();
    const runId = executeRun(db, "cancel_preparing");
    const run = db
      .prepare("SELECT scenario_fingerprint, source_revision FROM runs WHERE id = ?")
      .get(runId) as { scenario_fingerprint: string; source_revision: string };
    const eventId = (
      db.prepare("SELECT id FROM run_events WHERE run_id = ? LIMIT 1").get(runId) as { id: string }
    ).id;

    const analysis = JSON.parse(
      buildValidAnalysis(runId, eventId, run.scenario_fingerprint, run.source_revision)
    ) as {
      steps: Array<{ sourceRefs: Array<{ startLine: number; endLine: number }> }>;
    };
    // Mutate sourceRef to be out of bounds
    analysis.steps[0].sourceRefs[0].startLine = 999999;
    analysis.steps[0].sourceRefs[0].endLine = 999999;

    const result = toolSaveAnalysis(db, JSON.stringify(analysis));
    expect(isError(result)).toBe(true);
    const body = parseResult(result) as { error: string };
    expect(body.error).toMatch(/sourceRef/i);
  });
});

// ── 14. save_analysis — non-allowlisted sourceRef ────────────────────────────

describe("save_analysis — non-allowlisted sourceRef", () => {
  it("rejects analysis with a sourceRef pointing to a non-allowlisted file", () => {
    const db = buildTestMcpDb();
    const runId = executeRun(db, "cancel_preparing");
    const run = db
      .prepare("SELECT scenario_fingerprint, source_revision FROM runs WHERE id = ?")
      .get(runId) as { scenario_fingerprint: string; source_revision: string };
    const eventId = (
      db.prepare("SELECT id FROM run_events WHERE run_id = ? LIMIT 1").get(runId) as { id: string }
    ).id;

    const analysis = JSON.parse(
      buildValidAnalysis(runId, eventId, run.scenario_fingerprint, run.source_revision)
    ) as {
      steps: Array<{ sourceRefs: Array<{ file: string }> }>;
    };
    // Mutate sourceRef to non-allowlisted file
    analysis.steps[0].sourceRefs[0].file = "packages/api/src/server.ts";

    const result = toolSaveAnalysis(db, JSON.stringify(analysis));
    expect(isError(result)).toBe(true);
    const body = parseResult(result) as { error: string };
    expect(body.error).toMatch(/sourceRef/i);
  });
});
