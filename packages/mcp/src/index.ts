#!/usr/bin/env node
/**
 * packages/mcp/src/index.ts — local stdio MCP server for Dcnstrct
 *
 * Tools:
 *   list_runs        — list completed runs (most recent first)
 *   get_run          — fetch a single finalized run with events
 *   get_source       — read bounded lines from an allowlisted source file
 *   save_analysis    — persist a validated structured analysis tied to a run
 *
 * Transport: local stdio (STDIO transport per IBM Bob docs).
 * Connect via .bob/mcp.json in the project root (see docs/BUILD_GUIDE.md).
 *
 * No hosted inference API is used or implied. Bob reads actual captured runs
 * via these tools and saves explanations with explicit provenance.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import path from "path";
import { toolListRuns, toolGetRun, toolGetSource, toolSaveAnalysis } from "./tools";

// ── DB access ─────────────────────────────────────────────────────────────────

// node:sqlite is a built-in; no npm package
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");

const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, "../../api/data/dcnstrct.db");

function openDb() {
  return new DatabaseSync(DB_PATH);
}

function withDatabase<T>(run: (db: ReturnType<typeof openDb>) => T): T {
  const db = openDb();
  try {
    return run(db);
  } finally {
    db.close();
  }
}

// ── Pre-declared input schemas (avoids deep type inference at registerTool call sites) ────
// TypeScript TS2589 "type instantiation is excessively deep" occurs when chained Zod
// methods are inlined in registerTool's inputSchema argument. Pre-declaring them breaks
// the inference depth.

const limitSchema = z.number().int().min(1).max(50).optional();
const runIdSchema = z.string();
const sourceFileSchema = z.string();
const sourceStartSchema = z.number().int().min(1);
const sourceEndSchema = z.number().int().min(1);
const sourceRevisionSchema = z.string().min(1);
const analysisStringSchema = z.string();

// ── MCP server ───────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "dcnstrct-mcp",
  version: "0.1.0",
});

// ── tool: list_runs ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(server.registerTool as (...args: any[]) => unknown)(
  "list_runs",
  {
    description:
      "List completed runs from the Dcnstrct database, most recent first. " +
      "Only finalized (status=completed) runs are returned. " +
      "Returns id, scenarioId, scenarioFingerprint, sourceRevision, completedAt, cancelAccepted.",
    inputSchema: { limit: limitSchema },
  },
  async ({ limit }: { limit?: number }) => {
    return withDatabase((db) => toolListRuns(db, limit));
  }
);

// ── tool: get_run ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(server.registerTool as (...args: any[]) => unknown)(
  "get_run",
  {
    description:
      "Fetch a single finalized run with all its events. " +
      "Rejects runs that are not completed (status must be 'completed'). " +
      "Events are validated against the RunEvent schema. " +
      "Returns the full run object including events, beforeState, afterState.",
    inputSchema: { runId: runIdSchema },
  },
  async ({ runId }: { runId: string }) => {
    return withDatabase((db) => toolGetRun(db, runId));
  }
);

// ── tool: get_source ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(server.registerTool as (...args: any[]) => unknown)(
  "get_source",
  {
    description:
      "Read a bounded range of lines from an allowlisted source file. " +
      "The file must be in SOURCE_ALLOWLIST (relative to repo root). " +
      "Line numbers are 1-based inclusive. " +
      "Pass sourceRevision copied from get_run; rejects stale runs and reads actual on-disk content including uncommitted edits.",
    inputSchema: {
      file: sourceFileSchema,
      startLine: sourceStartSchema,
      endLine: sourceEndSchema,
      sourceRevision: sourceRevisionSchema,
    },
  },
  async ({ file, startLine, endLine, sourceRevision }: {
    file: string;
    startLine: number;
    endLine: number;
    sourceRevision: string;
  }) => {
    return toolGetSource(file, startLine, endLine, sourceRevision);
  }
);

// ── tool: save_analysis ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(server.registerTool as (...args: any[]) => unknown)(
  "save_analysis",
  {
    description:
      "Persist a validated structured analysis for a finalized run. " +
      "Validations: run must be completed; scenarioFingerprint must match the run; " +
      "sourceRevision must match both the run and current source; eventIds must belong " +
      "to that run; every sourceRef must match the revision, allowlist and line bounds. " +
      "Schema: schemaVersion, runId, scenarioFingerprint, sourceRevision, provenance, " +
      "summary, steps, branchExplanation, sideEffects. " +
      "Schema validity does not prove Bob authorship — provenance.taskReference must " +
      "be a genuine IBM Bob task reference recorded by the human operator.",
    inputSchema: {
      analysis: analysisStringSchema,
    },
  },
  async ({ analysis }: { analysis: string }) => {
    return withDatabase((db) => toolSaveAnalysis(db, analysis));
  }
);

// ── Start ────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr only — stdout is the MCP protocol channel
  process.stderr.write("dcnstrct-mcp: stdio transport ready\n");
}

main().catch((err) => {
  process.stderr.write(`dcnstrct-mcp: fatal error: ${String(err)}\n`);
  process.exit(1);
});
