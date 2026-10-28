-- Wrencher playtest profiles. Safe to run more than once.
CREATE TABLE IF NOT EXISTS players (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  name_key   TEXT NOT NULL UNIQUE,          -- lowercased name, for lookup
  pin_hash   TEXT,                          -- NULL after an admin reset: next login sets a new PIN
  pin_salt   TEXT,
  fails      INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,  -- unix ms
  created_at INTEGER NOT NULL,
  last_seen  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  player_id  INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_player ON sessions(player_id);
CREATE TABLE IF NOT EXISTS saves (
  player_id  INTEGER PRIMARY KEY,
  data       TEXT NOT NULL,                 -- JSON: {shop:{coins,upg}, best, bestScore}
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS runs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id  INTEGER NOT NULL,
  ending     TEXT NOT NULL,                 -- gulag | retire | america
  reason     TEXT,
  shift      INTEGER,
  score      INTEGER,
  coins      INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS runs_player ON runs(player_id);
CREATE TABLE IF NOT EXISTS feedback (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id  INTEGER,
  text       TEXT NOT NULL,
  context    TEXT,                          -- JSON: where in the game they were
  created_at INTEGER NOT NULL
);
