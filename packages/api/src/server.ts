/**
 * server.ts — Express entry point
 */
import express from "express";
import cors from "cors";
import { getDb } from "./db";
import { buildRouter } from "./routes";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

const app = express();
app.use(cors());
app.use(express.json());

const db = getDb();
app.use("/api", buildRouter(db));

app.listen(PORT, () => {
  console.log(`[dcnstrct-api] listening on http://localhost:${PORT}`);
});

export default app;
