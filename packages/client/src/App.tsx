/**
 * App.tsx — minimal scaffold for checkpoint 01
 *
 * Functional but intentionally spare. Full UI follows in checkpoint 03.
 * Demonstrates the API contract: select a scenario, run it, poll until done,
 * display the raw event list so the execution core is verifiable.
 */
import React, { useState } from "react";
import type { Run, Notification, Order, Scenario } from "@dcnstrct/shared";

const API = "/api";

type RunResult = { run: Run; notifications: Notification[]; orders: Order[] };

async function fetchScenarios(): Promise<Scenario[]> {
  const res = await fetch(`${API}/scenarios`);
  if (!res.ok) throw new Error("Failed to load scenarios");
  return res.json() as Promise<Scenario[]>;
}

async function postRun(scenarioId: string): Promise<string> {
  const res = await fetch(`${API}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId }),
  });
  if (!res.ok) throw new Error(`Run creation failed: ${res.status}`);
  const body = (await res.json()) as { runId: string };
  return body.runId;
}

async function fetchRun(runId: string): Promise<RunResult> {
  const res = await fetch(`${API}/runs/${runId}`);
  if (!res.ok) throw new Error(`Failed to fetch run ${runId}`);
  return res.json() as Promise<RunResult>;
}

async function resetDemo(runId?: string): Promise<void> {
  const res = await fetch(`${API}/demo/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(runId ? { runId } : {}),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Reset failed: ${res.status}`);
  }
}

export default function App() {
  const [scenarios, setScenarios] = useState<Scenario[] | null>(null);
  const [selectedId, setSelectedId] = useState<string>("cancel_preparing");
  const [result, setResult] = useState<RunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadScenarios() {
    try {
      const s = await fetchScenarios();
      setScenarios(s);
    } catch (e) {
      setError(String(e));
    }
  }

  async function runScenario() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const runId = await postRun(selectedId);
      const data = await fetchRun(runId);
      setResult(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    try {
      await resetDemo(result?.run.id);
      setResult(null);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: 4 }}>Dcnstrct — scaffold</h1>
      <p style={{ color: "#666", marginTop: 0 }}>
        Checkpoint 01 — execution core. Full UI follows in checkpoint 03.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={loadScenarios}>Load scenarios</button>
        {scenarios && (
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        )}
        <button onClick={runScenario} disabled={loading}>
          {loading ? "Running…" : "Execute run"}
        </button>
        <button onClick={handleReset} style={{ marginLeft: "auto" }}>
          Reset demo
        </button>
      </div>

      {error && (
        <pre style={{ background: "#fee", padding: 8, borderRadius: 4, color: "#c00" }}>
          {error}
        </pre>
      )}

      {result && (
        <div>
          <h2 style={{ fontSize: "1.1rem" }}>
            Run {result.run.id} — {result.run.status}
            {result.run.cancelAccepted !== null && (
              <span style={{ marginLeft: 8, color: result.run.cancelAccepted ? "green" : "red" }}>
                ({result.run.cancelAccepted ? "accepted" : "refused"})
              </span>
            )}
          </h2>

          {result.run.refusalReason && (
            <p style={{ color: "#c00" }}>⛔ {result.run.refusalReason}</p>
          )}

          <h3>Events ({result.run.events.length})</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                <th style={{ padding: "4px 8px" }}>#</th>
                <th style={{ padding: "4px 8px" }}>Role</th>
                <th style={{ padding: "4px 8px" }}>Kind</th>
                <th style={{ padding: "4px 8px" }}>Outcome</th>
                <th style={{ padding: "4px 8px" }}>Label</th>
                <th style={{ padding: "4px 8px" }}>Source</th>
              </tr>
            </thead>
            <tbody>
              {result.run.events.map((evt) => (
                <tr key={evt.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "4px 8px" }}>{evt.sequence}</td>
                  <td style={{ padding: "4px 8px" }}>{evt.role}</td>
                  <td style={{ padding: "4px 8px" }}>{evt.kind}</td>
                  <td style={{ padding: "4px 8px", color: evt.outcome === "refused" ? "red" : evt.outcome === "skipped" ? "orange" : "green" }}>
                    {evt.outcome}
                  </td>
                  <td style={{ padding: "4px 8px" }}>{evt.label}</td>
                  <td style={{ padding: "4px 8px", color: "#555", fontSize: "0.8rem" }}>
                    {evt.sourceRef.file}:{evt.sourceRef.startLine}–{evt.sourceRef.endLine}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {result.notifications.length > 0 && (
            <>
              <h3>Notifications ({result.notifications.length})</h3>
              <ul>
                {result.notifications.map((n) => (
                  <li key={n.id}>
                    [{n.type}] {n.message}
                  </li>
                ))}
              </ul>
            </>
          )}

          <h3>Raw JSON</h3>
          <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4, overflowX: "auto", fontSize: "0.75rem" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
