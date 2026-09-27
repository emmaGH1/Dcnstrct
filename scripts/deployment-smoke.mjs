import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "dcnstrct-deploy-"));
const socket = net.createServer();
await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
const port = socket.address().port;
await new Promise((resolve) => socket.close(resolve));
const origin = "http://127.0.0.1:" + port;
let child;
let output = "";
async function start() {
  child = spawn(process.execPath, ["packages/api/dist/server.js"], {
    cwd: root, env: { ...process.env, NODE_ENV: "production", PORT: String(port), DB_PATH: path.join(temp, "demo.db") },
    stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
  });
  child.stdout.on("data", (data) => { output += data; });
  child.stderr.on("data", (data) => { output += data; });
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("API exited: " + output);
    try {
      const response = await fetch(origin + "/api/scenarios", { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch { /* Wait for this isolated server to listen. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("API startup timed out: " + output);
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  const exited = once(child, "exit");
  child.kill();
  await exited;
}
async function request(route, { body, expected = 200 } = {}) {
  const response = await fetch(origin + route, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, expected, route);
  return response.json();
}
try {
  await start();
  const preflight = await fetch(origin + "/api/runs", { method: "OPTIONS", headers: {
    Origin: "https://dcnstrct.example", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type",
  } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), "*");
  assert(preflight.headers.get("access-control-allow-methods").includes("POST"));
  const scenarios = await request("/api/scenarios");
  assert.equal(scenarios.length, 2);
  const ids = [];
  const originals = [];
  for (const scenarioId of ["cancel_preparing", "cancel_shipped"]) {
    const { runId } = await request("/api/runs", { body: { scenarioId }, expected: 201 });
    ids.push(runId);
    const result = await request("/api/runs/" + runId);
    originals.push(result);
    assert.equal(result.run.status, "completed");
    assert.equal(result.run.cancelAccepted, scenarioId === "cancel_preparing");
    assert.equal(result.notifications.length, scenarioId === "cancel_preparing" ? 1 : 0);
    assert.equal(result.orders[0].status, scenarioId === "cancel_preparing" ? "cancelled" : "shipped");
    assert.equal(result.run.events.length, scenarioId === "cancel_preparing" ? 9 : 3);
    if (scenarioId === "cancel_preparing") assert(result.run.events.some((event) => event.kind === "worker_skip"));
    const analysis = await request("/api/runs/" + runId + "/analysis");
    assert.equal(analysis.status, "available");
    assert.equal(analysis.recording.provenance.delivery, "recorded");
    const event = result.run.events[1];
    const source = await request("/api/runs/" + runId + "/source/" + event.id + "/0");
    assert.equal(source.sourceRevision, result.run.sourceRevision);
    assert(source.lines.length > 0);
  }
  await request("/api/demo/reset", { body: {}, expected: 403 });
  await stop();
  await start();
  for (let i = 0; i < ids.length; i++) {
    assert.deepEqual(await request("/api/runs/" + ids[i]), originals[i]);
    assert.equal((await request("/api/runs/" + ids[i] + "/analysis")).status, "available");
  }
  await request("/api/demo/reset", { body: { runId: ids[0] } });
  await request("/api/runs/" + ids[0], { expected: 404 });
  assert.deepEqual(await request("/api/runs/" + ids[1]), originals[1]);
  await request("/api/demo/reset", { body: { runId: ids[1] } });
  console.log("PASS: production cancellation paths, recorded/source matches, disk persistence across process restart, global-reset refusal and scoped reset isolation.");
} finally {
  await stop();
  // This directory was created exclusively by this check; remove only its files.
  for (const name of await fs.readdir(temp)) await fs.unlink(path.join(temp, name));
  await fs.rmdir(temp);
}
