import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import {
  AnalysisSchema,
  RunSchema,
  SOURCE_ALLOWLIST,
  computeSourceRevision,
} from "@dcnstrct/shared";
import type { Analysis, Run, SourceRef } from "@dcnstrct/shared";
import { loadRun } from "./runs";
import type { Db } from "./db";

const APPROVED_RECORDS: Record<string, string> = {
  cancel_preparing: "ana_xXlmH_gNhP_65l701tq",
  cancel_shipped: "ana_kvqcWMxMEB_7anise9a",
};
const MAX_LINES = 80;
const RUN_ID_KEYS = new Set(["id", "runId", "orderId", "jobId", "notificationId"]);
const TIMESTAMP_KEYS = new Set(["createdAt", "updatedAt", "startedAt", "completedAt", "timestamp"]);

type AnalysisRecord = { analysisId: string; analysis: Analysis; run: Run };
type AvailableAnalysis = {
  record: AnalysisRecord;
  eventMap: Array<{ recordedEventId: string; runEventId: string }>;
};

function collectRunIds(run: Run): Set<string> {
  const ids = new Set<string>([run.id, ...run.events.map((event) => event.id)]);
  const collect = (value: unknown): void => {
    if (Array.isArray(value)) { value.forEach(collect); return; }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (RUN_ID_KEYS.has(key) && typeof child === "string") ids.add(child);
      collect(child);
    }
  };
  collect(run.beforeState);
  collect(run.afterState);
  run.events.forEach((event) => {
    collect(event.observedData);
    collect(event.before);
    collect(event.after);
  });
  return ids;
}

function normalize(value: unknown, runIds: Set<string>): unknown {
  if (typeof value === "string") {
    return [...runIds].sort((a, b) => b.length - a.length).reduce((result, id) => result.replaceAll(id, "<run-id>"), value);
  }
  if (Array.isArray(value)) return value.map((entry) => normalize(entry, runIds));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, child]) => {
      if (RUN_ID_KEYS.has(key) && typeof child === "string" && runIds.has(child)) return [key, "<run-id>"];
      if (TIMESTAMP_KEYS.has(key) && typeof child === "string" && !Number.isNaN(Date.parse(child))) return [key, "<timestamp>"];
      return [key, normalize(child, runIds)];
    }));
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function matchRecord(record: AnalysisRecord, liveRun: Run, currentRevision: string): AvailableAnalysis | string {
  if (record.analysis.runId !== record.run.id || record.analysis.scenarioFingerprint !== record.run.scenarioFingerprint || record.analysis.sourceRevision !== record.run.sourceRevision) {
    return "The saved interpretation does not match its original run.";
  }
  if (liveRun.status !== "completed") return "The current run is not complete.";
  if (record.run.scenarioFingerprint !== liveRun.scenarioFingerprint) return "This scenario has no matching recorded interpretation.";
  if (record.run.sourceRevision !== currentRevision || liveRun.sourceRevision !== currentRevision) return "The source has changed since this interpretation was recorded.";
  if (record.run.sourceRevision !== liveRun.sourceRevision) return "The source revision differs from the recorded run.";

  const original = RunSchema.safeParse(record.run);
  if (!original.success) return "The saved run record is invalid.";
  const analysis = AnalysisSchema.safeParse(record.analysis);
  if (!analysis.success) return "The saved interpretation is invalid.";

  const oldEvents = record.run.events;
  const newEvents = liveRun.events;
  if (oldEvents.length !== newEvents.length) return "The current run has a different event sequence.";
  const oldById = new Map(oldEvents.map((event) => [event.id, event]));
  const runIds = new Set([...collectRunIds(record.run), ...collectRunIds(liveRun)]);
  const eventMap: AvailableAnalysis["eventMap"] = [];

  for (let i = 0; i < oldEvents.length; i += 1) {
    const oldEvent = oldEvents[i];
    const newEvent = newEvents[i];
    if (oldEvent.sequence !== newEvent.sequence || oldEvent.role !== newEvent.role || oldEvent.kind !== newEvent.kind || oldEvent.outcome !== newEvent.outcome || oldEvent.label !== newEvent.label) {
      return "The current run has a different event sequence.";
    }
    const oldParentSequence = oldEvent.parentId ? oldById.get(oldEvent.parentId)?.sequence ?? -1 : null;
    const newParentSequence = newEvent.parentId ? newEvents.find((event) => event.id === newEvent.parentId)?.sequence ?? -1 : null;
    if (oldParentSequence !== newParentSequence || !same(normalize(oldEvent.observedData, runIds), normalize(newEvent.observedData, runIds)) || !same(normalize(oldEvent.before, runIds), normalize(newEvent.before, runIds)) || !same(normalize(oldEvent.after, runIds), normalize(newEvent.after, runIds)) || !same(oldEvent.sourceRef, newEvent.sourceRef)) {
      return "The current run's observations differ from the recorded scenario.";
    }
    eventMap.push({ recordedEventId: oldEvent.id, runEventId: newEvent.id });
  }

  const eventIds = new Set(oldEvents.map((event) => event.id));
  for (const step of record.analysis.steps) {
    if (!eventIds.has(step.eventId) || step.evidenceEventIds.some((id) => !eventIds.has(id))) return "The saved interpretation cites an event outside its run.";
    if (step.sourceRefs.some((ref) => !validSourceRef(ref, currentRevision))) return "The saved interpretation contains an invalid source reference.";
  }

  return { record, eventMap };
}

function validSourceRef(ref: SourceRef, revision: string): boolean {
  return (SOURCE_ALLOWLIST as readonly string[]).includes(ref.file)
    && ref.sourceRevision === revision
    && Number.isInteger(ref.startLine)
    && Number.isInteger(ref.endLine)
    && ref.startLine > 0
    && ref.endLine >= ref.startLine
    && ref.endLine - ref.startLine < MAX_LINES;
}

function loadApprovedRecord(repoRoot: string, scenarioId: string): AnalysisRecord | null {
  const approvedId = APPROVED_RECORDS[scenarioId];
  if (!approvedId) return null;
  try {
    const file = path.join(repoRoot, "bob_sessions", "task02b", "corrected-records.json");
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as { records?: unknown[] };
    const row = parsed.records?.find((candidate): candidate is AnalysisRecord => {
      if (!candidate || typeof candidate !== "object") return false;
      return (candidate as { analysisId?: unknown }).analysisId === approvedId;
    });
    if (!row) return null;
    const analysis = AnalysisSchema.parse(row.analysis);
    const run = RunSchema.parse(row.run);
    if (analysis.runId !== run.id || run.scenarioId !== scenarioId) return null;
    return { analysisId: row.analysisId, analysis, run };
  } catch {
    return null;
  }
}

function getAvailable(repoRoot: string, liveRun: Run): AvailableAnalysis | string {
  let currentRevision: string;
  try {
    currentRevision = computeSourceRevision(repoRoot);
  } catch {
    return "Current source could not be verified.";
  }
  const record = loadApprovedRecord(repoRoot, liveRun.scenarioId);
  if (!record) return "No reviewed recorded interpretation is available for this scenario.";
  return matchRecord(record, liveRun, currentRevision);
}

export function buildPresentationRouter(db: Db, repoRoot: string): Router {
  const router = Router();

  router.get("/runs/:id/analysis", (req, res) => {
    const run = loadRun(db, req.params.id);
    if (!run) { res.status(404).json({ error: "Run not found" }); return; }
    const match = getAvailable(repoRoot, run);
    if (typeof match === "string") {
      res.json({ status: "unavailable", runId: run.id, reason: match, recording: null, eventMap: [] });
      return;
    }
    res.json({
      status: "available",
      runId: run.id,
      reason: null,
      eventMap: match.eventMap,
      recording: {
        id: match.record.analysisId,
        originalRunId: match.record.run.id,
        provenance: match.record.analysis.provenance,
        analysis: match.record.analysis,
      },
    });
  });

  router.get("/runs/:id/source/:eventId/:citationIndex", (req, res) => {
    const run = loadRun(db, req.params.id);
    if (!run) { res.status(404).json({ error: "Run not found" }); return; }
    const event = run.events.find((candidate) => candidate.id === req.params.eventId);
    if (!event) { res.status(404).json({ error: "Event not found" }); return; }

    const match = getAvailable(repoRoot, run);
    const refs = [event.sourceRef];
    if (typeof match !== "string") {
      const recordedId = match.eventMap.find((item) => item.runEventId === event.id)?.recordedEventId;
      const step = recordedId && match.record.analysis.steps.find((item) => item.eventId === recordedId);
      if (step) refs.push(...step.sourceRefs);
    }
    const uniqueRefs = refs.filter((ref, index) => refs.findIndex((candidate) => same(candidate, ref)) === index);
    const citationIndex = Number(req.params.citationIndex);
    if (!Number.isInteger(citationIndex) || citationIndex < 0 || citationIndex >= uniqueRefs.length) {
      res.status(400).json({ error: "Invalid citation index" });
      return;
    }
    const ref = uniqueRefs[citationIndex];
    if (!validSourceRef(ref, run.sourceRevision)) {
      res.status(409).json({ error: "Source reference is stale or invalid" });
      return;
    }

    try {
      if (computeSourceRevision(repoRoot) !== run.sourceRevision) {
        res.status(409).json({ error: "Source changed after this run" });
        return;
      }
      const root = path.resolve(repoRoot);
      const absolute = path.resolve(root, ref.file);
      if (!absolute.startsWith(root + path.sep)) { res.status(400).json({ error: "Invalid source path" }); return; }
      const allLines = fs.readFileSync(absolute, "utf8").split(/\r?\n/);
      if (ref.endLine > allLines.length) { res.status(409).json({ error: "Source reference exceeds current file bounds" }); return; }
      const lines = allLines.slice(ref.startLine - 1, ref.endLine).map((text, offset) => ({ number: ref.startLine + offset, text }));
      if (computeSourceRevision(repoRoot) !== run.sourceRevision) { res.status(409).json({ error: "Source changed while it was being read" }); return; }
      res.json({ file: ref.file, startLine: ref.startLine, endLine: ref.endLine, sourceRevision: ref.sourceRevision, lines });
    } catch {
      res.status(500).json({ error: "Could not read cited source" });
    }
  });

  return router;
}
