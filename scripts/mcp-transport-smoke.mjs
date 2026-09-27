import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dcnstrct-mcp-smoke-"));
const dbPath = path.join(tempDir, "smoke.sqlite");
let api;
let client;
let transport;

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

async function waitForApi(url, child) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error("API process exited before becoming ready");
    try {
      const response = await fetch(`${url}/api/scenarios`);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("API did not become ready within 8 seconds");
}

function parseToolJson(result) {
  const block = result.content?.find((item) => item.type === "text");
  if (!block) throw new Error("MCP tool returned no text result");
  return JSON.parse(block.text);
}

try {
  const port = await freePort();
  const apiUrl = `http://127.0.0.1:${port}`;
  const env = Object.fromEntries(Object.entries({
    ...process.env,
    DB_PATH: dbPath,
    PORT: String(port),
  }).filter(([, value]) => value !== undefined));
  const tsx = path.join(root, "node_modules/tsx/dist/cli.mjs");

  api = spawn(process.execPath, [tsx, "packages/api/src/server.ts"], {
    cwd: root,
    env,
    stdio: ["ignore", "ignore", "pipe"],
  });
  let apiStderr = "";
  api.stderr.setEncoding("utf8").on("data", (chunk) => { apiStderr += chunk; });
  await waitForApi(apiUrl, api);

  const runIds = [];
  for (const scenarioId of ["cancel_preparing", "cancel_shipped"]) {
    const response = await fetch(`${apiUrl}/api/runs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId }),
    });
    if (!response.ok) throw new Error(`Could not create ${scenarioId} run: ${response.status}`);
    runIds.push((await response.json()).runId);
  }

  transport = new StdioClientTransport({
    command: process.execPath,
    args: [tsx, "packages/mcp/src/index.ts"],
    cwd: root,
    env,
  });
  client = new Client({ name: "dcnstrct-transport-smoke", version: "1.0.0" });
  await client.connect(transport);

  const toolNames = (await client.listTools()).tools.map((tool) => tool.name).sort();
  const expectedTools = ["get_run", "get_source", "list_runs", "save_analysis"];
  if (JSON.stringify(toolNames) !== JSON.stringify(expectedTools)) {
    throw new Error(`Unexpected MCP tools: ${toolNames.join(", ")}`);
  }

  const listed = parseToolJson(await client.callTool({ name: "list_runs", arguments: { limit: 5 } }));
  if (listed.length !== 2) throw new Error(`Expected two runs, found ${listed.length}`);

  for (const runId of runIds) {
    const run = parseToolJson(await client.callTool({ name: "get_run", arguments: { runId } }));
    if (run.status !== "completed") throw new Error(`Run ${runId} was not finalized`);
    const source = parseToolJson(await client.callTool({
      name: "get_source",
      arguments: {
        file: "packages/api/src/runs.ts",
        startLine: 1,
        endLine: 5,
        sourceRevision: run.sourceRevision,
      },
    }));
    if (source.sourceRevision !== run.sourceRevision || !source.text) {
      throw new Error(`Source read did not match run ${runId}`);
    }
  }

  const missingRun = await client.callTool({
    name: "get_run",
    arguments: { runId: "run_missing_transport_smoke" },
  });
  if (!missingRun.isError) throw new Error("Missing run was not rejected over stdio");

  const invalidAnalysis = await client.callTool({
    name: "save_analysis",
    arguments: { analysis: "{}" },
  });
  if (!invalidAnalysis.isError) throw new Error("Invalid analysis was not rejected over stdio");

  for (let i = 0; i < 20; i += 1) {
    const repeated = await client.callTool({ name: "list_runs", arguments: { limit: 5 } });
    if (repeated.isError) throw new Error("Repeated MCP database call failed");
  }

  console.log("MCP stdio smoke passed: initialize, discover tools, list/get/read, error paths, and 20 repeated DB-backed calls.");
} catch (error) {
  console.error(error);
  if (api?.stderr) console.error(api.stderr.read()?.toString() ?? "");
  process.exitCode = 1;
} finally {
  if (client) await client.close().catch(() => {});
  else if (transport) await transport.close().catch(() => {});
  if (api && api.exitCode === null) {
    api.kill();
    await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(undefined), 1500);
      api.once("exit", () => { clearTimeout(timeout); resolve(undefined); });
    });
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
}
