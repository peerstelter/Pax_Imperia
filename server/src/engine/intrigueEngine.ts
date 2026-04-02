import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import type { IntrigueActionType } from '@pax-imperia/shared';
import { networkSuccessBonus } from './spyNetwork.js';
import { adjustOpinion } from './opinionEngine.js';

// ── Base success chances per action type ──────────────────────────────────────

export const BASE_SUCCESS_CHANCE: Record<IntrigueActionType, number> = {
  spy:        0.70,
  assassinate: 0.30,
  sabotage:   0.50,
  bribe:      0.50,
  propaganda: 0.60,
  blackmail:  0.40,
};

// Discovery chance = 10% of success window (actions that fail by this margin are discovered)
const DISCOVERY_FRACTION = 0.10;

// ── Queue an action ───────────────────────────────────────────────────────────

/**
 * Queue an intrigue action. Success chance is adjusted by any network the
 * source faction has in the target province.
 */
export function queueIntrigueAction(
  db: Database.Database,
  gameId: string,
  type: IntrigueActionType,
  sourceFactionId: string,
  targetFactionId: string,
  targetProvinceId?: string,
): { id: string; successChance: number } {
  const game = db.prepare('SELECT turn FROM games WHERE id = ?').get(gameId) as { turn: number };

  let successChance = BASE_SUCCESS_CHANCE[type];

  // Network bonus: +10% per agent in the target province
  if (targetProvinceId) {
    successChance = Math.min(0.95, successChance + networkSuccessBonus(db, gameId, sourceFactionId, targetProvinceId));
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO intrigue_actions
       (id, game_id, type, source_faction_id, target_faction_id, target_province_id, success_chance, status, turn)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
  ).run(id, gameId, type, sourceFactionId, targetFactionId, targetProvinceId ?? null, successChance, game.turn);

  return { id, successChance };
}

// ── Resolve a single action ───────────────────────────────────────────────────

interface IntrigueRow {
  id: string;
  type: string;
  source_faction_id: string;
  target_faction_id: string;
  target_province_id: string | null;
  success_chance: number;
}

/**
 * Roll and resolve one pending intrigue action.
 * Returns the outcome and any events generated.
 */
export function resolveAction(
  db: Database.Database,
  gameId: string,
  action: IntrigueRow,
  turn: number,
): { status: 'success' | 'failure' | 'discovered'; events: string[] } {
  const roll = Math.random();
  const events: string[] = [];

  let status: 'success' | 'failure' | 'discovered';
  if (roll <= action.success_chance * DISCOVERY_FRACTION) {
    status = 'discovered';
  } else if (roll <= action.success_chance) {
    status = 'success';
  } else {
    status = 'failure';
  }

  db.prepare('UPDATE intrigue_actions SET status = ? WHERE id = ? AND game_id = ?')
    .run(status, action.id, gameId);

  if (status === 'success') {
    applyIntrigueSuccess(db, gameId, action, events);
  } else if (status === 'discovered') {
    // Opinion penalty when caught
    adjustOpinion(db, gameId, action.source_faction_id, action.target_faction_id, -15);
    events.push(`Intrigue discovered: ${action.source_faction_id} -15 opinion with ${action.target_faction_id}`);
  }

  db.prepare(
    `INSERT INTO turn_log (id, game_id, turn, type, description, faction_id, data)
     VALUES (?, ?, ?, 'intrigue_resolved', ?, ?, ?)`,
  ).run(
    randomUUID(), gameId, turn,
    `Intrigue ${action.type}: ${status}`,
    action.source_faction_id,
    JSON.stringify({ actionId: action.id, status }),
  );

  return { status, events };
}

// ── Success consequence dispatcher ────────────────────────────────────────────

function applyIntrigueSuccess(
  db: Database.Database,
  gameId: string,
  action: IntrigueRow,
  events: string[],
): void {
  switch (action.type) {
    case 'spy':
      // Reveal all provinces owned by target faction
      db.prepare(`UPDATE provinces SET is_revealed = 1 WHERE game_id = ? AND owner_id = ?`)
        .run(gameId, action.target_faction_id);
      events.push(`Spy success: ${action.source_faction_id} revealed ${action.target_faction_id}'s provinces`);
      break;

    case 'propaganda':
      if (action.target_province_id) {
        db.prepare(`UPDATE provinces SET garrison = MAX(0, garrison - 100) WHERE game_id = ? AND id = ?`)
          .run(gameId, action.target_province_id);
        events.push(`Propaganda success: garrison -100 in ${action.target_province_id}`);
      }
      break;

    case 'sabotage':
      if (action.target_province_id) {
        db.prepare(`UPDATE provinces SET fort_level = MAX(0, fort_level - 1) WHERE game_id = ? AND id = ?`)
          .run(gameId, action.target_province_id);
        events.push(`Sabotage success: fort level -1 in ${action.target_province_id}`);
      }
      break;

    case 'assassinate':
      // Kill a random living commander of the target faction
      {
        const commander = db
          .prepare(`SELECT id FROM commanders WHERE game_id = ? AND faction_id = ? AND is_alive = 1 ORDER BY RANDOM() LIMIT 1`)
          .get(gameId, action.target_faction_id) as { id: string } | undefined;
        if (commander) {
          db.prepare('UPDATE commanders SET is_alive = 0 WHERE game_id = ? AND id = ?')
            .run(gameId, commander.id);
          events.push(`Assassination success: commander ${commander.id} of ${action.target_faction_id} killed`);
        }
        // Shadow influence gain
        gainShadowInfluence(db, gameId, action.source_faction_id, action.target_faction_id, 15, events);
      }
      break;

    case 'bribe':
    case 'blackmail':
      gainShadowInfluence(db, gameId, action.source_faction_id, action.target_faction_id, 10, events);
      break;
  }
}

function gainShadowInfluence(
  db: Database.Database,
  gameId: string,
  source: string,
  target: string,
  amount: number,
  events: string[],
): void {
  db.prepare(
    `UPDATE shadow_influence SET influence = MIN(100, influence + ?)
     WHERE game_id = ? AND source_faction = ? AND target_faction = ?`,
  ).run(amount, gameId, source, target);
  events.push(`${source} shadow influence +${amount} on ${target}`);
}
