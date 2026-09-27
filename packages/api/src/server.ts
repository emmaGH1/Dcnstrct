/**
 * server.ts — Express entry point
 */
import express from "express";
import cors from "cors";
import { getDb } from "./db";
import { buildRouter } from "./routes";
import { buildPresentationRouter } from "./presentation";
import path from "node:path";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

const app = express();
app.use(cors());
app.use(express.json());

const db = getDb();
app.use("/api", buildRouter(db));
const repoRoot = path.resolve(__dirname, "../../..");
app.use("/api", buildPresentationRouter(db, repoRoot));

const clientBuild = path.resolve(__dirname, "../../client/dist");
app.use(express.static(clientBuild));
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path === "/api" || req.path.startsWith("/api/") || path.extname(req.path)) { next(); return; }
  res.sendFile(path.join(clientBuild, "index.html"), (error) => { if (error) next(error); });
});

app.listen(PORT, () => {
  console.log(`[dcnstrct-api] listening on http://localhost:${PORT}`);
});

export default app;
