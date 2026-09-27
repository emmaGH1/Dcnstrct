/**
 * db.ts — SQLite schema bootstrap using built-in node:sqlite (Node 24+)
 *
 * SOURCE_ALLOWLIST: packages/api/src/db.ts
 *
 * node:sqlite is a stable built-in module in Node 24; no native build required.
 * DatabaseSync provides a synchronous API matching what runs.ts expects.
 *
 * All tables are keyed on runId so concurrent runs never share rows.
 * Tests create an isolated in-memory database via createTestDb().
 */
// node:sqlite is a built-in; no npm package needed
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");
import fs from "fs";
import path from "path";

export type Db = InstanceType<typeof DatabaseSync>;

const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, "..", "data", "dcnstrct.db");

let _db: Db | null = null;

export function getDb(): Db {
  if (_db) return _db;

  if (DB_PATH !== ":memory:") {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  _db = new DatabaseSync(DB_PATH);
  applySchema(_db);
  return _db;
}

/** Called by tests to get an isolated in-memory db */
export function createTestDb(): Db {
  const db = new DatabaseSync(":memory:");
  applySchema(db);
  return db;
}

function applySchema(db: Db): void {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS orders (
      id          TEXT PRIMARY KEY,
      run_id      TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      item        TEXT NOT NULL,
      quantity    INTEGER NOT NULL,
      status      TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fulfillment_jobs (
      id           TEXT PRIMARY KEY,
      run_id       TEXT NOT NULL,
      order_id     TEXT NOT NULL,
      status       TEXT NOT NULL,
      created_at   TEXT NOT NULL,
      started_at   TEXT,
      completed_at TEXT,
      skip_reason  TEXT
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id         TEXT PRIMARY KEY,
      run_id     TEXT NOT NULL,
      order_id   TEXT NOT NULL,
      type       TEXT NOT NULL,
      message    TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS runs (
      id                   TEXT PRIMARY KEY,
      scenario_id          TEXT NOT NULL,
      scenario_fingerprint TEXT NOT NULL,
      source_revision      TEXT NOT NULL,
      status               TEXT NOT NULL,
      started_at           TEXT NOT NULL,
      completed_at         TEXT,
      cancel_accepted      INTEGER,
      refusal_reason       TEXT
    );

    CREATE TABLE IF NOT EXISTS run_events (
      id            TEXT PRIMARY KEY,
      run_id        TEXT NOT NULL,
      sequence      INTEGER NOT NULL,
      parent_id     TEXT,
      role          TEXT NOT NULL,
      kind          TEXT NOT NULL,
      label         TEXT NOT NULL,
      outcome       TEXT NOT NULL,
      observed_data TEXT NOT NULL,
      source_file   TEXT NOT NULL,
      source_start  INTEGER NOT NULL,
      source_end    INTEGER NOT NULL,
      source_rev    TEXT NOT NULL,
      before_state  TEXT,
      after_state   TEXT,
      timestamp     TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_run ON orders(run_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_run ON fulfillment_jobs(run_id);
    CREATE INDEX IF NOT EXISTS idx_notifs_run ON notifications(run_id);
    CREATE INDEX IF NOT EXISTS idx_events_run ON run_events(run_id, sequence);
  `);
}
