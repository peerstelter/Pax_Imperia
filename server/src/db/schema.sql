-- Pax Imperia SQLite Schema
-- All game state is stored per game_id to support multiple concurrent saves.

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ── Core game session ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS games (
  id             TEXT PRIMARY KEY,
  player_faction TEXT NOT NULL,
  turn           INTEGER NOT NULL DEFAULT 1,
  winner         TEXT,                       -- faction id, NULL until game ends
  victory_path   TEXT,                       -- 'war' | 'diplomacy' | 'intrigue'
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Factions ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS factions (
  id          TEXT NOT NULL,
  game_id     TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL,
  gold        INTEGER NOT NULL DEFAULT 100,
  food        INTEGER NOT NULL DEFAULT 50,
  manpower    INTEGER NOT NULL DEFAULT 200,
  personality TEXT NOT NULL DEFAULT 'aggressive',  -- aggressive|expansionist|isolationist|merchant
  is_player   INTEGER NOT NULL DEFAULT 0,          -- 1 = human player
  PRIMARY KEY (id, game_id)
);

-- ── Provinces ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS provinces (
  id              TEXT NOT NULL,
  game_id         TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  owner_id        TEXT NOT NULL,
  biome           TEXT NOT NULL DEFAULT 'default', -- default|steppe|desert|isles|tundra
  garrison        INTEGER NOT NULL DEFAULT 0,
  fort_level      INTEGER NOT NULL DEFAULT 0,      -- 0–5
  strategic_value INTEGER NOT NULL DEFAULT 1,      -- 1–3
  adjacent_ids    TEXT NOT NULL DEFAULT '[]',      -- JSON array of province ids
  is_revealed     INTEGER NOT NULL DEFAULT 0,      -- fog of war
  PRIMARY KEY (id, game_id)
);

-- ── Armies ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS armies (
  id           TEXT NOT NULL,
  game_id      TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  faction_id   TEXT NOT NULL,
  province_id  TEXT NOT NULL,
  commander_id TEXT,
  formation    TEXT NOT NULL DEFAULT '{}',         -- JSON: {frontLine, secondRank, flanks}
  PRIMARY KEY (id, game_id)
);

-- ── Units (belong to an army) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS units (
  id        TEXT NOT NULL,
  game_id   TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  army_id   TEXT NOT NULL,
  type      TEXT NOT NULL,    -- cavalry|polearms|archers|heavy_infantry|light_infantry
  variant   TEXT,             -- biome-specific sub-type
  count     INTEGER NOT NULL DEFAULT 0,
  morale    INTEGER NOT NULL DEFAULT 100,
  attack    INTEGER NOT NULL DEFAULT 10,
  defense   INTEGER NOT NULL DEFAULT 10,
  speed     INTEGER NOT NULL DEFAULT 5,
  PRIMARY KEY (id, game_id)
);

-- ── Commanders ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS commanders (
  id         TEXT NOT NULL,
  game_id    TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  faction_id TEXT NOT NULL,
  attack     INTEGER NOT NULL DEFAULT 5,
  defense    INTEGER NOT NULL DEFAULT 5,
  maneuver   INTEGER NOT NULL DEFAULT 5,
  is_alive   INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (id, game_id)
);

-- ── Diplomatic relations ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS diplomatic_relations (
  game_id    TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  faction_a  TEXT NOT NULL,
  faction_b  TEXT NOT NULL,
  opinion    INTEGER NOT NULL DEFAULT 0,   -- -100 to +100
  treaties   TEXT NOT NULL DEFAULT '[]',   -- JSON array of DiplomacyType
  PRIMARY KEY (game_id, faction_a, faction_b)
);

-- ── Intrigue actions ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS intrigue_actions (
  id                  TEXT NOT NULL,
  game_id             TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  type                TEXT NOT NULL,   -- spy|assassinate|sabotage|bribe|propaganda|blackmail
  source_faction_id   TEXT NOT NULL,
  target_faction_id   TEXT NOT NULL,
  target_province_id  TEXT,
  success_chance      REAL NOT NULL DEFAULT 0.5,
  status              TEXT NOT NULL DEFAULT 'pending',  -- pending|success|failure|discovered
  turn                INTEGER NOT NULL,
  PRIMARY KEY (id, game_id)
);

-- ── Turn log ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS turn_log (
  id          TEXT NOT NULL,
  game_id     TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  turn        INTEGER NOT NULL,
  type        TEXT NOT NULL,
  description TEXT NOT NULL,
  faction_id  TEXT,
  province_id TEXT,
  data        TEXT NOT NULL DEFAULT '{}',  -- JSON payload
  PRIMARY KEY (id, game_id)
);

-- ── Shadow influence ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shadow_influence (
  game_id          TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  source_faction   TEXT NOT NULL,
  target_faction   TEXT NOT NULL,
  influence        INTEGER NOT NULL DEFAULT 0,  -- 0–100; ≥75 = puppet
  PRIMARY KEY (game_id, source_faction, target_faction)
);

-- ── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_provinces_game ON provinces(game_id);
CREATE INDEX IF NOT EXISTS idx_armies_game ON armies(game_id);
CREATE INDEX IF NOT EXISTS idx_units_army ON units(army_id, game_id);
CREATE INDEX IF NOT EXISTS idx_turn_log_game_turn ON turn_log(game_id, turn);
CREATE INDEX IF NOT EXISTS idx_intrigue_game ON intrigue_actions(game_id);
