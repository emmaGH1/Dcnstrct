import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScenarioSchema, ScenarioIdSchema, RunSchema, type Run, type RunEvent, type Scenario, type ScenarioId } from "@dcnstrct/contracts";
import { AnalysisResponseSchema, RunResultSchema, SourceExcerptSchema, type AnalysisResponse, type SourceExcerpt } from "@dcnstrct/ui-contracts";

const API = "/api";
const WORDS = [
  { word: "journey", tone: "lavender" }, { word: "logic", tone: "sand" },
  { word: "decisions", tone: "peach" }, { word: "effects", tone: "sage" }, { word: "evidence", tone: "sky" },
] as const;
type RunResult = ReturnType<typeof RunResultSchema.parse>;
type Page = "landing" | "workspace";
type DetailTab = "explanation" | "source" | "observed";
type Loadable<T> = { status: "loading" } | { status: "ready"; value: T } | { status: "error"; message: string };
type RunCollection = Partial<Record<ScenarioId, RunResult>>;

function messageOf(error: unknown): string { return error instanceof Error ? error.message : String(error); }
async function fetchJson<T>(url: string, schema: { parse(value: unknown): T }): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }
  return schema.parse(await response.json());
}
const ScenarioListSchema = ScenarioSchema.array();
const RunIdSchema = RunSchema.shape.id;

async function loadRun(runId: string): Promise<RunResult> { return fetchJson(`${API}/runs/${encodeURIComponent(runId)}`, RunResultSchema); }
async function createRun(scenarioId: ScenarioId): Promise<string> {
  const response = await fetch(`${API}/runs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenarioId }) });
  if (!response.ok) throw new Error(`Could not run this scenario (${response.status})`);
  const payload = await response.json() as { runId?: unknown };
  return RunIdSchema.parse(payload.runId);
}
async function loadAnalysis(runId: string): Promise<AnalysisResponse> { return fetchJson(`${API}/runs/${encodeURIComponent(runId)}/analysis`, AnalysisResponseSchema); }
async function loadSource(runId: string, eventId: string, citationIndex: number): Promise<SourceExcerpt> {
  return fetchJson(`${API}/runs/${encodeURIComponent(runId)}/source/${encodeURIComponent(eventId)}/${citationIndex}`, SourceExcerptSchema);
}

function CircleArrow() { return <span className="circle-arrow" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M4 10h11M10 5l5 5-5 5" /></svg></span>; }
function Logo({ compact = false }: { compact?: boolean }) {
  return <a className={`brand${compact ? " brand-compact" : ""}`} href="/" data-route="landing" aria-label="Dcnstrct home"><img src="/brand/dcnstrct-logo.png" alt="" /><span>Dcnstrct</span></a>;
}

function WordPill() {
  const [wordIndex, setWordIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState === "visible");
  const pillRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    if (pillRef.current) observer.observe(pillRef.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const updateVisibility = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);
  useEffect(() => {
    if (paused || !inView || !pageVisible || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setWordIndex((value) => (value + 1) % WORDS.length), 3300);
    return () => window.clearInterval(timer);
  }, [paused, inView, pageVisible]);
  const current = WORDS[wordIndex];
  return <span className="pill-wrap" ref={pillRef}>
    <span className={`word-pill tone-${current.tone}`} aria-hidden="true" key={current.word}><span className="pill-dot" />{current.word}</span>
    <span className="sr-only">journey</span>
    <button className="motion-toggle" type="button" aria-label={paused ? "Resume changing headline word" : "Pause changing headline word"} onClick={() => setPaused((value) => !value)}><span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span></button>
  </span>;
}

function SiteHeader({ page, onNavigate }: { page: Page; onNavigate: (path: string) => void }) {
  if (page === "workspace") return <header className="site-header workspace-header">
    <Logo /><span className="workspace-header-label">Interactive workspace</span>
    <a className="back-link" href="/" onClick={(event) => { event.preventDefault(); onNavigate("/"); }}>Back to product <span aria-hidden="true">←</span></a>
  </header>;
  return <header className="site-header landing-header">
    <Logo /><nav className="landing-nav" aria-label="Main navigation"><a href="#product">Product</a><a href="https://github.com/emmaGH1/Dcnstrct" target="_blank" rel="noreferrer">Resources</a><a href="#bob">IBM Bob</a></nav>
    <a className="cta cta-small" href="/demo" onClick={(event) => { event.preventDefault(); onNavigate("/demo"); }}>Explore demo <CircleArrow /></a>
  </header>;
}

function WorkspacePreview() {
  return <figure className="preview-frame" aria-label="Reserved space for the workspace capture">
    <div className="preview-window-bar"><span className="window-dots" aria-hidden="true"><i /><i /><i /></span><span>Dcnstrct workspace</span><span className="preview-placeholder-label">Preview placeholder</span></div>
    <div className="preview-skeleton" aria-hidden="true">
      <div className="skeleton-sidebar"><span className="skeleton-brand" /><span /><span /><span /><span /></div>
      <div className="skeleton-main"><div className="skeleton-toolbar"><span /><span /></div><div className="skeleton-heading" /><div className="skeleton-subheading" /><div className="skeleton-columns"><div /><div /><div /></div></div>
    </div>
    <figcaption>A closer look at the workspace. Capture coming next.</figcaption>
  </figure>;
}

function Landing({ onNavigate }: { onNavigate: (path: string) => void }) {
  const go = (path: string) => (event: React.MouseEvent<HTMLAnchorElement>) => { event.preventDefault(); onNavigate(path); };
  return <>
    <SiteHeader page="landing" onNavigate={onNavigate} />
    <main className="landing-page">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-content"><h1 id="hero-title" aria-label="Understand what happens and the journey behind it."><span className="hero-line">Understand what happens</span><span className="hero-line hero-line-paired"><span className="hero-prefix">and the</span><WordPill /><span className="hero-suffix">behind it.</span></span></h1>
          <p className="hero-copy">Try an action. Follow what happened. Explore the evidence with IBM Bob.</p>
          <div className="hero-actions"><a className="cta cta-large" href="/demo" onClick={go("/demo")}>Explore demo <CircleArrow /></a></div>
        </div><div className="hero-preview" id="product"><WorkspacePreview /></div>
      </section>

      <section className="landing-section how-section" id="how-it-works">
        <div className="section-heading"><h2>From action to understanding.</h2><p>Follow one real action through the decisions and records it leaves behind.</p></div>
        <div className="how-layout"><p className="how-lead">You do the thing a user would do. Dcnstrct captures what the application actually does next, then helps you connect each step to evidence.</p>
          <div className="how-steps"><article><span className="neutral-number">01</span><div><h3>Try an action</h3><p>Cancel a synthetic order before fulfillment or after shipment.</p></div></article><article><span className="neutral-number">02</span><div><h3>Follow its journey</h3><p>See the policy decision, database changes, notification and worker outcome.</p></div></article><article><span className="neutral-number">03</span><div><h3>Inspect the evidence</h3><p>Move from an observed step to the source and a recorded IBM Bob explanation.</p></div></article></div>
        </div>
      </section>

      <section className="landing-section paths-section" id="paths">
        <div className="section-heading"><h2>Timing changes the outcome.</h2><p>Both paths begin with the same action. The order's state decides what happens next.</p></div>
        <div className="path-pair"><article className="path-card path-accepted"><div><span className="path-kicker">BEFORE FULFILLMENT</span><h3>Cancellation accepted</h3><p>The order is preparing, so cancellation is allowed. A notification is saved and the worker skips shipment after reading the current state.</p></div><a href="/demo?scenario=cancel_preparing" onClick={go("/demo?scenario=cancel_preparing")}>Explore this path <span aria-hidden="true">↗</span></a></article><article className="path-card path-refused"><div><span className="path-kicker">AFTER SHIPMENT</span><h3>Cancellation refused</h3><p>The order has shipped. The request is refused and the order stays shipped; the return boundary is explained.</p></div><a href="/demo?scenario=cancel_shipped" onClick={go("/demo?scenario=cancel_shipped")}>Explore this path <span aria-hidden="true">↗</span></a></article></div>
        <p className="synthetic-note">Synthetic sample scenarios. Each outcome is captured from an actual run.</p>
      </section>

      <section className="landing-section bob-section" id="bob">
        <div className="bob-copy"><h2>Evidence first. Explained with IBM Bob.</h2><p>Bob interpreted recorded events and relevant source during a real local MCP session. Each explanation points back to the run's events and source references.</p><p className="bob-disclosure">The explanations shown in the demo are recorded interpretations. They are matched against the current scenario and source revision before display.</p><a href="https://github.com/emmaGH1/Dcnstrct" target="_blank" rel="noreferrer" className="text-link">Explore the project <span aria-hidden="true">↗</span></a></div>
        <div className="bob-art-wrap"><img className="bob-art" src="/brand/ibm-bob-mascot-cutout.png" alt="IBM Bob mascot" /></div>
        <div className="bob-evidence"><article><span className="evidence-symbol" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 4v9h13m-5-5 5 5-5 5" /></svg></span><div><h3>Observed events</h3><p>What the run recorded at each step.</p></div></article><article><span className="evidence-symbol" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7zM14 3v5h4M10 12h5M10 16h5" /></svg></span><div><h3>Relevant source</h3><p>The allowlisted code behind an operation.</p></div></article></div>
      </section>

      <section className="final-invitation"><h2>Understand what happens behind an action.</h2><a className="cta cta-large" href="/demo" onClick={go("/demo")}>Explore demo <CircleArrow /></a></section>
    </main>
    <footer className="site-footer"><div className="footer-brand"><Logo compact /><p>Explore. Understand. Go further.</p></div><div className="footer-column"><h2>Explore</h2><a href="#how-it-works">How it works</a><a href="#paths">Cancellation paths</a><a href="/demo" onClick={go("/demo")}>Interactive demo</a></div><div className="footer-column"><h2>Project</h2><a href="https://github.com/emmaGH1/Dcnstrct" target="_blank" rel="noreferrer">GitHub repository</a><a href="#bob">IBM Bob workflow</a></div><p className="footer-note">Synthetic data for demonstration<br />Recorded IBM Bob interpretations</p></footer>
  </>;
}

function statusLabel(run: Run): string { if (run.status === "failed") return "Run failed"; if (run.status === "partial") return "Partial run"; return run.cancelAccepted ? "Cancellation accepted" : "Cancellation refused"; }

function StepRail({ events, selectedId, onSelect }: { events: RunEvent[]; selectedId: string | null; onSelect: (event: RunEvent) => void }) {
  if (!events.length) return <div className="empty-journey"><span className="empty-step-mark">→</span><p>Run the scenario to see its actual execution steps here.</p></div>;
  return <div className="journey-list" aria-label="Ordered run events">{events.map((event, index) => <button key={event.id} className={`journey-node${selectedId === event.id ? " is-selected" : ""}`} type="button" onClick={() => onSelect(event)} aria-pressed={selectedId === event.id}>
    <span className="journey-node-number">{index + 1}</span><span className="journey-node-copy"><strong>{event.label}</strong><small>{event.role.replaceAll("_", " ")}</small></span><span className={`outcome-tag outcome-${event.outcome}`}>{event.outcome}</span>
  </button>)}</div>;
}

function EventDetails({ runResult, event, delivery, deliveryLoad, tab, setTab, citationIndex, onCitation }: {
  runResult: RunResult; event: RunEvent; delivery: AnalysisResponse | null; deliveryLoad: Loadable<AnalysisResponse> | null;
  tab: DetailTab; setTab: (tab: DetailTab) => void; citationIndex: number; onCitation: (index: number) => void;
}) {
  const recordedEventId = delivery?.eventMap.find((entry) => entry.runEventId === event.id)?.recordedEventId;
  const analysis = delivery?.recording?.analysis;
  const step = analysis?.steps.find((item) => item.eventId === recordedEventId);
  const refs = useMemo(() => {
    const values = [event.sourceRef, ...(delivery?.status === "available" ? step?.sourceRefs ?? [] : [])];
    return values.filter((ref, index) => values.findIndex((other) => JSON.stringify(other) === JSON.stringify(ref)) === index);
  }, [event, delivery, step]);
  return <section className="event-details" aria-labelledby="event-detail-title">
    <div className="detail-heading"><div><p className="eyebrow">Selected event · {String(event.sequence).padStart(2, "0")}</p><h3 id="event-detail-title">{event.label}</h3></div><span className={`outcome-tag outcome-${event.outcome}`}>{event.outcome}</span></div>
    <div className="detail-tabs" role="tablist" aria-label="Event details">{(["explanation", "source", "observed"] as const).map((name) => <button key={name} type="button" role="tab" aria-selected={tab === name} className={tab === name ? "active" : ""} onClick={() => setTab(name)}>{name === "observed" ? "Observed data" : name[0].toUpperCase() + name.slice(1)}</button>)}</div>
    {tab === "explanation" && <div className="detail-body explanation-body">
      {deliveryLoad?.status === "loading" && <p className="inline-status">Checking for a matching recorded interpretation…</p>}
      {deliveryLoad?.status === "error" && <div className="unavailable-box"><strong>Interpretation could not be loaded.</strong><p>{deliveryLoad.message}</p></div>}
      {delivery?.status === "available" && delivery.recording && <><div className="recorded-by"><img src="/brand/ibm-bob-mascot-cutout.png" alt="" /><div><strong>Recorded IBM Bob interpretation</strong><span>Task {delivery.recording.provenance.taskReference} · {new Date(delivery.recording.provenance.createdAt).toLocaleDateString()}</span></div><span className="recorded-badge">Recorded</span></div>
        <p className="analysis-summary">{step?.explanation ?? delivery.recording.analysis.summary}</p>{step?.uncertainty && <p className="uncertainty"><strong>Uncertainty:</strong> {step.uncertainty}</p>}
        {step?.sourceRefs.length ? <button className="inline-source-link" type="button" onClick={() => { setTab("source"); onCitation(Math.min(1, refs.length - 1)); }}>Inspect {step.sourceRefs.length} cited source {step.sourceRefs.length === 1 ? "range" : "ranges"} <span aria-hidden="true">→</span></button> : null}
        <p className="evidence-links">Evidence events: {step?.evidenceEventIds.length ? step.evidenceEventIds.map((id) => delivery.eventMap.find((entry) => entry.recordedEventId === id)?.runEventId).map((id) => runResult.run.events.find((candidate) => candidate.id === id)?.sequence).filter((sequence): sequence is number => typeof sequence === "number").map((sequence) => `step ${sequence}`).join(", ") : "No step-specific evidence links supplied"}</p>
      </>}
      {delivery?.status === "unavailable" && <div className="unavailable-box"><strong>Recorded interpretation unavailable</strong><p>{delivery.reason ?? "No approved analysis matches this run."}</p><span>The live run and its source references are still available below.</span></div>}
      {!delivery && deliveryLoad?.status !== "loading" && <div className="unavailable-box"><strong>Recorded interpretation not loaded</strong><p>Run an action to check for a matching explanation.</p></div>}
    </div>}
    {tab === "source" && <div className="detail-body source-body"><div className="source-intro"><span>Allowlisted application source</span><span>Revision {event.sourceRef.sourceRevision.slice(0, 12)}</span></div>
      <div className="citation-list">{refs.map((ref, index) => <button type="button" className="citation-button" key={`${ref.file}:${ref.startLine}:${ref.endLine}`} onClick={() => onCitation(index)} aria-pressed={index === citationIndex}>{ref.file} · lines {ref.startLine}–{ref.endLine}{index === 0 ? " · event" : " · Bob citation"}</button>)}</div>
      <SourceViewer runId={runResult.run.id} eventId={event.id} citationIndex={Math.min(citationIndex, refs.length - 1)} />
    </div>}
    {tab === "observed" && <div className="detail-body observed-body"><div className="observation-note"><span className="observation-symbol" aria-hidden="true">↳</span><div><strong>Observed in this run</strong><span>These values come from the selected event's stored record.</span></div></div>
      <div className="data-grid"><DataObject title="Event data" value={event.observedData} /><DataObject title="Before" value={event.before} /><DataObject title="After" value={event.after} /></div>
      {event.kind === "run_complete" && <div className="notifications-block"><h4>Synthetic notifications saved for this run</h4>{runResult.notifications.length ? runResult.notifications.map((item) => <p key={item.id}><strong>{item.type.replaceAll("_", " ")}</strong> — {item.message}</p>) : <p>No cancellation notification was persisted.</p>}</div>}
    </div>}
  </section>;
}

function DataObject({ title, value }: { title: string; value: Record<string, unknown> | null }) {
  return <div className="data-object"><h4>{title}</h4>{value ? <dl>{Object.entries(value).map(([key, entry]) => <div key={key}><dt>{key.replaceAll(/([A-Z])/g, " $1").replaceAll("_", " ")}</dt><dd>{typeof entry === "string" ? entry : JSON.stringify(entry)}</dd></div>)}</dl> : <p>No snapshot recorded for this event.</p>}</div>;
}

function SourceViewer({ runId, eventId, citationIndex }: { runId: string; eventId: string; citationIndex: number }) {
  const [load, setLoad] = useState<Loadable<SourceExcerpt>>({ status: "loading" });
  useEffect(() => {
    const controller = new AbortController(); setLoad({ status: "loading" });
    loadSource(runId, eventId, citationIndex).then((value) => { if (!controller.signal.aborted) setLoad({ status: "ready", value }); }).catch((error: unknown) => { if (!controller.signal.aborted) setLoad({ status: "error", message: messageOf(error) }); });
    return () => controller.abort();
  }, [runId, eventId, citationIndex]);
  if (load.status === "loading") return <p className="inline-status">Loading the cited source…</p>;
  if (load.status === "error") return <div className="unavailable-box"><strong>Source excerpt unavailable</strong><p>{load.message}</p><span>The source changed or this citation could not be verified.</span></div>;
  return <div className="source-code"><div className="source-file-bar">{load.value.file}<span>Read-only excerpt</span></div><pre>{load.value.lines.map((line) => <span className="source-line" key={line.number}><i>{line.number}</i><code>{line.text || " "}</code></span>)}</pre></div>;
}

function CompareCard({ result, scenario }: { result: RunResult | undefined; scenario: Scenario }) {
  const beforeFulfillment = scenario.id === "cancel_preparing";
  if (!result) return <article className="compare-card compare-pending"><span className="path-kicker">{beforeFulfillment ? "BEFORE FULFILLMENT" : "AFTER SHIPMENT"}</span><h3>{beforeFulfillment ? "Cancellation before fulfillment" : "Cancellation after shipment"}</h3><p>Run this path to compare its actual outcome.</p><span className="compare-awaiting">Awaiting a real run</span></article>;
  const run = result.run; const skipped = run.events.some((event) => event.kind === "worker_skip"); const queued = run.events.some((event) => event.kind === "job_queue");
  const unchanged = JSON.stringify(run.beforeState) === JSON.stringify(run.afterState);
  return <article className={`compare-card${run.cancelAccepted ? " compare-accepted" : " compare-refused"}`}><span className="path-kicker">{beforeFulfillment ? "BEFORE FULFILLMENT" : "AFTER SHIPMENT"}</span><h3>{run.cancelAccepted ? "Cancellation accepted" : "Cancellation refused"}</h3>
    <ul className="compare-observations"><li>{run.cancelAccepted ? "Policy accepted the request" : "Policy refused the request"}</li><li>{run.afterState && typeof run.afterState.status === "string" ? `Observed order state: ${run.afterState.status}` : "No order snapshot returned"}</li><li>{queued ? "A synthetic fulfillment job was queued" : "No fulfillment job was queued"}</li><li>{skipped ? "Worker read the cancelled order and skipped shipment" : run.cancelAccepted ? "Worker ran; inspect the journey for its outcome" : "The worker was not invoked"}</li></ul>
    <span className="compare-result">{unchanged && !run.cancelAccepted ? "Observed state remained unchanged" : statusLabel(run)}</span>
  </article>;
}

function Workspace({ onNavigate }: { onNavigate: (path: string) => void }) {
  const queryScenario = new URLSearchParams(window.location.search).get("scenario");
  const initialScenario = ScenarioIdSchema.safeParse(queryScenario).success ? queryScenario as ScenarioId : "cancel_preparing";
  const [scenarios, setScenarios] = useState<Scenario[]>([]); const [selectedScenario, setSelectedScenario] = useState<ScenarioId>(initialScenario);
  const [runs, setRuns] = useState<RunCollection>({}); const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<DetailTab>("explanation"); const [citationIndex, setCitationIndex] = useState(0);
  const [analysisByRun, setAnalysisByRun] = useState<Record<string, Loadable<AnalysisResponse>>>({});
  const [pending, setPending] = useState(false); const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null);
  const journeyRef = useRef<HTMLElement>(null);
  const activeResult = runs[selectedScenario]; const activeRun = activeResult?.run ?? null;
  const selectedEvent = activeRun?.events.find((event) => event.id === selectedEventId) ?? activeRun?.events[0] ?? null;
  const activeDeliveryLoad = activeRun ? analysisByRun[activeRun.id] : null;
  const activeDelivery = activeDeliveryLoad?.status === "ready" ? activeDeliveryLoad.value : null;
  const scenariosById = useMemo(() => new Map(scenarios.map((scenario) => [scenario.id, scenario])), [scenarios]);

  useEffect(() => {
    let cancelled = false;
    fetchJson(`${API}/scenarios`, ScenarioListSchema).then(setScenarios).catch((reason: unknown) => setError(messageOf(reason)));
    const restore = async () => {
      const stored = sessionStorage.getItem("dcnstrct.runIds"); if (!stored) return;
      try {
        const ids = JSON.parse(stored) as Record<string, unknown>;
        const entries = Object.entries(ids).filter(([scenario, id]) => ScenarioIdSchema.safeParse(scenario).success && typeof id === "string" && RunIdSchema.safeParse(id).success);
        const restored = await Promise.all(entries.map(async ([scenario, id]) => { try { return [scenario, await loadRun(id as string)] as const; } catch { return null; } }));
        if (!cancelled) setRuns(Object.fromEntries(restored.filter(Boolean) as Array<readonly [string, RunResult]>) as RunCollection);
      } catch { sessionStorage.removeItem("dcnstrct.runIds"); }
    };
    void restore(); return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const ids = Object.fromEntries(Object.entries(runs).filter((entry): entry is [string, RunResult] => Boolean(entry[1])).map(([scenario, result]) => [scenario, result.run.id]));
    sessionStorage.setItem("dcnstrct.runIds", JSON.stringify(ids));
  }, [runs]);

  useEffect(() => {
    if (!activeRun || analysisByRun[activeRun.id]) return;
    let cancelled = false;
    const runId = activeRun.id;
    setAnalysisByRun((previous) => ({ ...previous, [runId]: { status: "loading" } }));
    loadAnalysis(runId).then((value) => { if (!cancelled) setAnalysisByRun((previous) => ({ ...previous, [runId]: { status: "ready", value } })); }).catch((reason: unknown) => { if (!cancelled) setAnalysisByRun((previous) => ({ ...previous, [runId]: { status: "error", message: messageOf(reason) } })); });
    return () => { cancelled = true; };
  }, [activeRun?.id]);

  useEffect(() => { if (selectedEventId && activeRun?.events.some((event) => event.id === selectedEventId)) return; setSelectedEventId(activeRun?.events[0]?.id ?? null); }, [activeRun?.id, activeRun?.events, selectedEventId]);

  async function runSelectedScenario(id = selectedScenario) {
    setPending(true); setError(null); setNotice(null);
    try {
      const runId = await createRun(id); let result = await loadRun(runId); let attempts = 0;
      while (result.run.status === "running" && attempts < 12) { await new Promise((resolve) => window.setTimeout(resolve, 450)); result = await loadRun(runId); attempts += 1; }
      setRuns((previous) => ({ ...previous, [id]: result })); setSelectedScenario(id); setSelectedEventId(result.run.events[0]?.id ?? null); setSelectedTab("explanation"); setCitationIndex(0);
      window.setTimeout(() => journeyRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }), 70);
      if (result.run.status === "running") setNotice("The run is still in progress. You can wait a moment or inspect the events already captured.");
    } catch (reason) { setError(messageOf(reason)); } finally { setPending(false); }
  }

  async function resetMyRuns() {
    const ownRuns = Object.values(runs).filter((value): value is RunResult => Boolean(value)); if (!ownRuns.length) return;
    setResetting(true); setError(null); setNotice(null); const failedIds: string[] = [];
    for (const result of ownRuns) {
      try { const response = await fetch(`${API}/demo/reset`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ runId: result.run.id }) }); if (!response.ok) throw new Error(`Reset failed (${response.status})`); }
      catch { failedIds.push(result.run.id); }
    }
    if (failedIds.length) { setError("Some runs could not be reset. The remaining runs are still listed so you can retry."); setRuns((previous) => Object.fromEntries(Object.entries(previous).filter(([, value]) => value && failedIds.includes(value.run.id))) as RunCollection); }
    else { setRuns({}); setSelectedEventId(null); setAnalysisByRun({}); setNotice("Your synthetic runs have been reset."); }
    setResetting(false);
  }

  function changeScenario(id: ScenarioId) { setSelectedScenario(id); setError(null); setNotice(null); setSelectedEventId(runs[id]?.run.events[0]?.id ?? null); setCitationIndex(0); window.history.replaceState({}, "", `/demo?scenario=${id}`); }
  const fallbackScenarios: Scenario[] = [{ id: "cancel_preparing", label: "Cancel before fulfillment", description: "", initialOrderStatus: "preparing" }, { id: "cancel_shipped", label: "Cancel after shipment", description: "", initialOrderStatus: "shipped" }];

  return <>
    <SiteHeader page="workspace" onNavigate={onNavigate} />
    <main className="workspace-page"><aside className="workspace-sidebar"><div className="sidebar-title">Order demo</div><p>Explore one action.</p><nav aria-label="Workspace sections"><a href="#try"><span>01</span> Try an action</a><a href="#journey"><span>02</span> Journey</a><a href="#evidence"><span>03</span> Evidence</a><a href="#compare"><span>04</span> Compare paths</a></nav><div className="sidebar-note"><span className="sidebar-status-dot" />Synthetic environment<br /><small>Recorded Bob explanations</small></div></aside><div className="workspace-content">
      <div className="workspace-intro"><div className="workspace-breadcrumb">Workspace <span>/</span> Order cancellation</div><h1>One action. The whole journey.</h1><p>Run a cancellation, follow what the application actually did, and inspect the evidence behind each step.</p></div>
      <section className="workspace-section action-section" id="try"><div className="workspace-section-title"><span className="section-marker">01</span><div><h2>Try an action</h2><p>Choose the order state, then submit a real cancellation request.</p></div></div>
        <div className="action-panel"><div className="scenario-picker"><span className="field-label">Scenario</span>{(scenarios.length ? scenarios : fallbackScenarios).map((scenario) => <button type="button" key={scenario.id} className={`scenario-choice${selectedScenario === scenario.id ? " is-active" : ""}`} aria-pressed={selectedScenario === scenario.id} onClick={() => changeScenario(scenario.id)}><span className="scenario-radio" aria-hidden="true" /><span><strong>{scenario.id === "cancel_preparing" ? "Before fulfillment" : "After shipment"}</strong><small>{scenario.initialOrderStatus === "preparing" ? "Order is preparing" : "Order has shipped"}</small></span></button>)}</div>
          <div className="order-preview"><span className="field-label">Synthetic order</span><div className="order-name">Demo item <span>× 1</span></div><div className="order-state-flow"><span>{String(activeResult?.run.beforeState?.status ?? scenariosById.get(selectedScenario)?.initialOrderStatus ?? (selectedScenario === "cancel_preparing" ? "preparing" : "shipped"))}</span><b aria-hidden="true">→</b><span className={activeResult ? `state-${String(activeResult.run.afterState?.status ?? "unknown")}` : "state-pending"}>{String(activeResult?.run.afterState?.status ?? "awaiting request")}</span></div><button className="cta cta-action" type="button" onClick={() => void runSelectedScenario()} disabled={pending || scenarios.length === 0}>{pending ? <><span className="button-spinner" />Running action…</> : "Run cancellation"}</button></div>
          <div className="action-outcome"><span className="field-label">Outcome</span>{activeResult ? <><strong className={`outcome-headline ${activeResult.run.cancelAccepted ? "accepted-text" : "refused-text"}`}>{statusLabel(activeResult.run)}</strong><ul><li>{activeResult.run.cancelAccepted ? "Order cancellation was accepted" : activeResult.run.refusalReason ?? "Order remains shipped"}</li><li>{activeResult.notifications.length ? `${activeResult.notifications.length} synthetic notification persisted` : "No cancellation notification persisted"}</li><li>{activeResult.run.events.some((event) => event.kind === "worker_skip") ? "Worker skipped shipment" : activeResult.run.events.some((event) => event.kind.startsWith("worker_")) ? "Worker completed the observed path" : "Worker was not invoked"}</li></ul></> : <p className="outcome-placeholder">The result will appear here after the real run completes.</p>}</div>
        </div><div className="action-controls"><span className="synthetic-note">No real orders or messages are involved.</span><button className="quiet-button" type="button" onClick={() => void resetMyRuns()} disabled={!Object.keys(runs).length || resetting}>{resetting ? "Resetting…" : "Reset my runs"}</button></div>
      </section>
      <div className="inspection-layout"><section className="workspace-section journey-section" id="journey" ref={journeyRef}><div className="workspace-section-title"><span className="section-marker">02</span><div><h2>Follow the journey</h2><p>Select a step to inspect what happened.</p></div></div>
        {activeRun && <div className="run-summary"><span>{activeRun.scenarioId === "cancel_preparing" ? "Before fulfillment" : "After shipment"}</span><span>Run {activeRun.id}</span><span className={`run-state run-${activeRun.status}`}>{activeRun.status}</span></div>}
        {pending && <div className="inline-status" role="status">Running the scenario and collecting its events…</div>}{notice && <div className="notice-box" role="status">{notice}</div>}{error && <div className="error-box" role="alert"><strong>Something interrupted the demo.</strong><span>{error}</span><button type="button" onClick={() => setError(null)}>Dismiss</button></div>}
        <StepRail events={activeRun?.events ?? []} selectedId={selectedEvent?.id ?? null} onSelect={(event) => { setSelectedEventId(event.id); setSelectedTab("explanation"); }} />
        {activeRun && <p className="worker-note">Worker execution is synchronous in this demo. The queued job is synthetic; this run does not demonstrate concurrent race safety.</p>}
      </section>
      <section className="workspace-section evidence-section" id="evidence"><div className="workspace-section-title"><span className="section-marker">03</span><div><h2>Inspect the evidence</h2><p>Explanation, source and data for the selected step.</p></div></div>
        {activeRun && selectedEvent ? <EventDetails runResult={activeResult!} event={selectedEvent} delivery={activeDelivery} deliveryLoad={activeDeliveryLoad ?? null} tab={selectedTab} setTab={setSelectedTab} citationIndex={citationIndex} onCitation={setCitationIndex} /> : <div className="evidence-empty"><span>←</span><p>Run a scenario, then choose any event in its journey.</p></div>}
      </section>
      </div><section className="workspace-section compare-section" id="compare"><div className="workspace-section-title"><span className="section-marker">04</span><div><h2>Compare the outcomes</h2><p>See how the same request changes when the order has shipped.</p></div></div>
        <div className="comparison-grid">{scenarios.length ? scenarios.map((scenario) => <CompareCard key={scenario.id} result={runs[scenario.id]} scenario={scenario} />) : <p className="inline-status">Loading the synthetic scenarios…</p>}</div>
        <div className="compare-actions"><button className="quiet-button" type="button" onClick={() => { const other = selectedScenario === "cancel_preparing" ? "cancel_shipped" : "cancel_preparing"; changeScenario(other); void runSelectedScenario(other); }} disabled={pending}>{pending ? "Running…" : `Run ${selectedScenario === "cancel_preparing" ? "after shipment" : "before fulfillment"}`}</button><button className="quiet-button" type="button" onClick={() => void resetMyRuns()} disabled={!Object.keys(runs).length || resetting}>Reset my runs</button></div>
      </section>
    </div></main>
    <footer className="workspace-footer"><Logo compact /><span>Synthetic data · Recorded interpretations · Source references are verified before display.</span><a href="https://github.com/emmaGH1/Dcnstrct" target="_blank" rel="noreferrer">GitHub</a></footer>
  </>;
}

export default function App() {
  const [page, setPage] = useState<Page>(window.location.pathname === "/demo" ? "workspace" : "landing");
  useEffect(() => { const update = () => setPage(window.location.pathname === "/demo" ? "workspace" : "landing"); window.addEventListener("popstate", update); return () => window.removeEventListener("popstate", update); }, []);
  function navigate(path: string) { window.history.pushState({}, "", path); setPage(path.startsWith("/demo") ? "workspace" : "landing"); window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
  return <div className="app-shell">{page === "workspace" ? <Workspace onNavigate={navigate} /> : <Landing onNavigate={navigate} />}</div>;
}
