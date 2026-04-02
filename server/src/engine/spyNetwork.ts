import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

// Max agents per province network; each costs 50 gold and takes 1 turn to place.
export const MAX_AGENTS = 3;
export const AGENT_COST = 50;
// Each agent slot adds this to base success chance for intrigue actions
export const AGENT_SUCCESS_BONUS = 0.1;
// Networks decay by 2 strength points per turn without maintenance
export const NETWORK_DECAY_PER_TURN = 2;

interface NetworkRow { agents: number; strength: number }

// ── Build / reinforce a network ───────────────────────────────────────────────

/**
 * Spend gold to place an agent in a target province.
 * Costs AGENT_COST gold and cannot exceed MAX_AGENTS.
 * Strength grows by 20 per agent placed (capped at 100).
 */
export function buildSpyNetwork(
  db: Database.Database,
  gameId: string,
  factionId: string,
  provinceId: string,
): { ok: boolean; reason?: string; agents?: number; strength?: number } {
  const faction = db
    .prepare('SELECT gold FROM factions WHERE game_id = ? AND id = ?')
    .get(gameId, factionId) as { gold: number } | undefined;
  if (!faction) return { ok: false, reason: 'Faction not found' };
  if (faction.gold < AGENT_COST) return { ok: false, reason: `Need ${AGENT_COST} gold` };

  const game = db.prepare('SELECT turn FROM games WHERE id = ?').get(gameId) as { turn: number };

  // Ensure row exists
  db.prepare(
    `INSERT OR IGNORE INTO spy_networks (game_id, faction_id, province_id, agents, strength, turn_built)
     VALUES (?, ?, ?, 0, 0, ?)`,
  ).run(gameId, factionId, provinceId, game.turn);

  const net = db
    .prepare('SELECT agents, strength FROM spy_networks WHERE game_id = ? AND faction_id = ? AND province_id = ?')
    .get(gameId, factionId, provinceId) as NetworkRow;

  if (net.agents >= MAX_AGENTS) return { ok: false, reason: `Network full (${MAX_AGENTS} agents max)` };

  const newAgents = net.agents + 1;
  const newStrength = Math.min(100, net.strength + 20);

  db.prepare(
    'UPDATE spy_networks SET agents = ?, strength = ? WHERE game_id = ? AND faction_id = ? AND province_id = ?',
  ).run(newAgents, newStrength, gameId, factionId, provinceId);

  db.prepare('UPDATE factions SET gold = gold - ? WHERE game_id = ? AND id = ?')
    .run(AGENT_COST, gameId, factionId);

  db.prepare(
    `INSERT INTO turn_log (id, game_id, turn, type, description, faction_id, province_id, data)
     VALUES (?, ?, ?, 'spy_network_built', ?, ?, ?, ?)`,
  ).run(
    randomUUID(), gameId, game.turn,
    `${factionId} placed agent in ${provinceId} (agents: ${newAgents}, strength: ${newStrength})`,
    factionId, provinceId,
    JSON.stringify({ agents: newAgents, strength: newStrength }),
  );

  return { ok: true, agents: newAgents, strength: newStrength };
}

// ── Query ─────────────────────────────────────────────────────────────────────

/** Return network strength (0 if none) and derived discovery chance. */
export function getNetworkStrength(
  db: Database.Database,
  gameId: string,
  factionId: string,
  provinceId: string,
): { strength: number; agents: number; discoveryChance: number } {
  const net = db
    .prepare('SELECT agents, strength FROM spy_networks WHERE game_id = ? AND faction_id = ? AND province_id = ?')
    .get(gameId, factionId, provinceId) as NetworkRow | undefined;

  const agents = net?.agents ?? 0;
  const strength = net?.strength ?? 0;
  // Higher network strength = lower discovery chance (enemy is less alert)
  const discoveryChance = Math.max(0.05, 0.4 - strength * 0.003);
  return { strength, agents, discoveryChance };
}

/**
 * Get the success-chance bonus granted by a network in a province.
 * Used by the intrigue action engine when rolling success.
 */
export function networkSuccessBonus(
  db: Database.Database,
  gameId: string,
  factionId: string,
  provinceId: string,
): number {
  const net = db
    .prepare('SELECT agents FROM spy_networks WHERE game_id = ? AND faction_id = ? AND province_id = ?')
    .get(gameId, factionId, provinceId) as { agents: number } | undefined;
  return (net?.agents ?? 0) * AGENT_SUCCESS_BONUS;
}

// ── Per-turn decay ────────────────────────────────────────────────────────────

/**
 * Each turn, networks lose NETWORK_DECAY_PER_TURN strength.
 * At 0 strength the row is removed (network collapsed).
 */
export function tickNetworkDecay(db: Database.Database, gameId: string): void {
  db.prepare(
    `UPDATE spy_networks SET strength = MAX(0, strength - ?)
     WHERE game_id = ?`,
  ).run(NETWORK_DECAY_PER_TURN, gameId);

  // Remove fully collapsed networks
  db.prepare(
    `DELETE FROM spy_networks WHERE game_id = ? AND strength = 0`,
  ).run(gameId);
}

// ── All networks for a faction ────────────────────────────────────────────────

export function listNetworks(
  db: Database.Database,
  gameId: string,
  factionId: string,
): { provinceId: string; agents: number; strength: number }[] {
  return (db
    .prepare('SELECT province_id, agents, strength FROM spy_networks WHERE game_id = ? AND faction_id = ?')
    .all(gameId, factionId) as { province_id: string; agents: number; strength: number }[])
    .map((r) => ({ provinceId: r.province_id, agents: r.agents, strength: r.strength }));
}
