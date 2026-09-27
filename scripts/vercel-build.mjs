import { spawnSync } from "node:child_process";

// Vercel serves the client; a separate persistent service owns the real API.
const raw = process.env.VITE_API_ORIGIN;
let origin;
try {
  const url = new URL(raw ?? "");
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error();
  origin = url.origin;
} catch {
  console.error("Set VITE_API_ORIGIN to your deployed HTTPS backend origin, without /api, credentials, query or fragment.");
  process.exit(1);
}
if (!process.env.npm_execpath) throw new Error("Run this through npm run build:vercel.");
const result = spawnSync(process.execPath, [process.env.npm_execpath, "run", "build", "-w", "packages/client"], {
  stdio: "inherit", env: { ...process.env, VITE_API_ORIGIN: origin },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
