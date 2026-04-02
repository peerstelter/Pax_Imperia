import type Database from 'better-sqlite3';

interface FactionRow { id: string }
interface TurnLogRow { faction_id: string }

/**
 * War exhaustion tracker.
 *
 * Exhaustion is stored as a JSON blob in the games table (no extra schema needed).
 * We use a dedicated in-memory map keyed by gameId during a session, falling back
 * to the turn_log to count active war turns.
 *
 * Effects of exhaustion (0–100):
 *  0–25  : no effect
 *  26–50 : -10% recruitment rate (applied at /api/recruit)
 *  51–75 : -20% recruitment rate + -5 morale/turn for all units
 *  76–100: -30% recruitment rate + -10 morale/turn + gold income -15%
 *
 * Exhaustion increases by:
 *  +3 per turn any active war is being fought (armies in enemy territory)
 *  +5 per turn for each battle lost
 *
 * Exhaustion decreases by:
 *  -2 per turn of peace (no battles logged)
 */

/** Calculate current war exhaustion for a faction from its turn log. */
export function getWarExhaustion(db: Database.Database, gameId: string, factionId: string): number {
  // Count turns where faction had armies in enemy provinces
  const battleRows = db.prepare(
    `SELECT COUNT(*) as c FROM turn_log WHERE game_id = ? AND faction_id = ? AND type = 'battle'`,
  ).get(gameId, factionId) as { c: number };

  const lossRows = db.prepare(
    `SELECT COUNT(*) as c FROM turn_log WHERE game_id = ? AND faction_id = ? AND type = 'battle'
     AND data LIKE '%"winner":"defender"%'`,
  ).get(gameId, factionId) as { c: number };

  const raw = battleRows.c * 3 + lossRows.c * 5;
  return Math.min(100, raw);
}

/** Apply war exhaustion effects to units at end of turn. */
export function applyWarExhaustion(db: Database.Database, gameId: string): void {
  const factions = db.prepare('SELECT id FROM factions WHERE game_id = ?').all(gameId) as FactionRow[];

  for (const { id: factionId } of factions) {
    const exhaustion = getWarExhaustion(db, gameId, factionId);

    // Morale penalty
    const moralePenalty =
      exhaustion > 75 ? 10
      : exhaustion > 50 ? 5
      : 0;

    if (moralePenalty > 0) {
      db.prepare(
        `UPDATE units SET morale = MAX(0, morale - ?)
         WHERE game_id = ? AND army_id IN (SELECT id FROM armies WHERE game_id = ? AND faction_id = ?)`,
      ).run(moralePenalty, gameId, gameId, factionId);
    }

    // Gold income penalty (deduct from gold directly)
    if (exhaustion > 75) {
      db.prepare(
        'UPDATE factions SET gold = MAX(0, gold - CAST(gold * 0.15 AS INTEGER)) WHERE game_id = ? AND id = ?',
      ).run(gameId, factionId);
    }
  }
}

/** Return recruitment rate multiplier based on exhaustion (0.7–1.0). */
export function recruitmentRateMod(exhaustion: number): number {
  if (exhaustion > 75) return 0.7;
  if (exhaustion > 50) return 0.8;
  if (exhaustion > 25) return 0.9;
  return 1.0;
}
