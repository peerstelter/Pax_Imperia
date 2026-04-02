import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { tickFactionResources } from './factionEngine.js';
import { updateFogOfWar } from './fogOfWar.js';
import { tickLogistics } from './logistics.js';
import { applyWarExhaustion } from './warExhaustion.js';
import { tickOpinionDecay, tickTreatyOpinionBonuses } from './opinionEngine.js';
import { tradeGoldTick, vassalTributeTick } from './diplomacyEngine.js';
import { checkDiplomaticVictory } from './electionEngine.js';
import { runAiDecisions } from './aiDecisionEngine.js';
import { tickNetworkDecay } from './spyNetwork.js';
import { resolveAction } from './intrigueEngine.js';
import { INTRIGUE_PUPPET_THRESHOLD } from '@pax-imperia/shared';

interface GameRow { id: string; turn: number; player_faction: string; winner: string | null }
interface IntrigueRow {
  id: string;
  type: string;
  source_faction_id: string;
  target_faction_id: string;
  target_province_id: string | null;
  success_chance: number;
}
interface ShadowRow { source_faction: string; target_faction: string; influence: number }

/**
 * Advance the game by one turn.
 *
 * Order of operations:
 *  1. Resolve pending intrigue actions
 *  2. Apply resource ticks to all factions
 *  3. Increment turn counter
 *  4. Append a turn_log entry
 *  5. Check victory conditions (server-side only)
 *
 * Returns the new turn number and any events that fired.
 */
export function advanceTurn(db: Database.Database, gameId: string): {
  newTurn: number;
  events: string[];
  winner?: string;
} {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as GameRow | undefined;
  if (!game) throw new Error('Game not found');
  if (game.winner) throw new Error('Game already ended');

  const events: string[] = [];

  db.transaction(() => {
    // 0. AI decisions (before resource tick so they act on current state)
    runAiDecisions(db, gameId);

    // 1. Resolve pending intrigue actions
    resolveIntrigueActions(db, gameId, game.turn, events);

    // 2. Logistics (attrition, supply cost) — before resource tick so shortfalls show
    tickLogistics(db, gameId, game.turn);

    // 3. Opinion decay + treaty bonuses
    tickOpinionDecay(db, gameId);
    tickTreatyOpinionBonuses(db, gameId);

    // 4. War exhaustion effects (morale drain, gold penalty)
    applyWarExhaustion(db, gameId);

    // 4a. Treaty economic effects (trade gold, vassal tribute)
    tradeGoldTick(db, gameId);
    vassalTributeTick(db, gameId);

    // 4b. Spy network decay
    tickNetworkDecay(db, gameId);

    // 4c. Resource tick
    tickFactionResources(db, gameId);

    // 3. Increment turn
    db.prepare('UPDATE games SET turn = turn + 1, updated_at = datetime(\'now\') WHERE id = ?').run(gameId);

    // 5. Update fog of war for the player faction
    updateFogOfWar(db, gameId, game.player_faction);

    // 6. Log turn end
    db.prepare(
      `INSERT INTO turn_log (id, game_id, turn, type, description, data)
       VALUES (?, ?, ?, 'turn_end', ?, '{}')`,
    ).run(randomUUID(), gameId, game.turn, `Turn ${game.turn} ended`);
  })();

  // 5. Victory check (outside transaction so we read updated state)
  const winner = checkVictory(db, gameId);
  if (winner) {
    db.prepare('UPDATE games SET winner = ? WHERE id = ?').run(winner.factionId, gameId);
    events.push(`Victory: ${winner.factionId} wins via ${winner.path}`);
  }

  const updated = db.prepare('SELECT turn FROM games WHERE id = ?').get(gameId) as { turn: number };
  return { newTurn: updated.turn, events, winner: winner?.factionId };
}

// ── Intrigue resolution ───────────────────────────────────────────────────────

function resolveIntrigueActions(
  db: Database.Database,
  gameId: string,
  turn: number,
  events: string[],
): void {
  const actions = db
    .prepare(`SELECT * FROM intrigue_actions WHERE game_id = ? AND status = 'pending'`)
    .all(gameId) as IntrigueRow[];

  for (const action of actions) {
    const { events: actionEvents } = resolveAction(db, gameId, action, turn);
    events.push(...actionEvents);
  }
}

// ── Victory check ─────────────────────────────────────────────────────────────

interface VictoryResult { factionId: string; path: 'war' | 'diplomacy' | 'intrigue' }

function checkVictory(db: Database.Database, gameId: string): VictoryResult | null {
  const totalProvinces = (
    db.prepare('SELECT COUNT(*) as c FROM provinces WHERE game_id = ?').get(gameId) as { c: number }
  ).c;
  const warThreshold = Math.ceil(totalProvinces * 0.6);

  // War victory
  const warRows = db
    .prepare(
      `SELECT owner_id, COUNT(*) as cnt FROM provinces WHERE game_id = ? GROUP BY owner_id HAVING cnt >= ?`,
    )
    .all(gameId, warThreshold) as { owner_id: string; cnt: number }[];

  if (warRows.length > 0) {
    return { factionId: warRows[0].owner_id, path: 'war' };
  }

  // Intrigue victory — faction with 75%+ shadow influence over 4+ other factions
  const shadowRows = db
    .prepare(
      `SELECT source_faction, COUNT(*) as puppets
       FROM shadow_influence WHERE game_id = ? AND influence >= ?
       GROUP BY source_faction HAVING puppets >= 4`,
    )
    .all(gameId, INTRIGUE_PUPPET_THRESHOLD) as { source_faction: string; puppets: number }[];

  if (shadowRows.length > 0) {
    return { factionId: shadowRows[0].source_faction, path: 'intrigue' };
  }

  // Diplomacy victory — Imperial Election (faction needs votes from 3+ factions with opinion ≥ 50)
  const electionWinner = checkDiplomaticVictory(db, gameId);
  if (electionWinner) {
    return { factionId: electionWinner, path: 'diplomacy' };
  }

  return null;
}
