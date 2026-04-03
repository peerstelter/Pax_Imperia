import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

// ── Event definitions ─────────────────────────────────────────────────────────

interface RandomEvent {
  type: string;
  description: string;
  probability: number;  // per turn, per faction
  apply: (db: Database.Database, gameId: string, factionId: string, turn: number) => string;
}

const RANDOM_EVENTS: RandomEvent[] = [
  {
    type: 'plague',
    description: 'A deadly plague sweeps through the land',
    probability: 0.025,   // ~once per 40 turns per faction (balanced down from 0.04)
    apply(db, gameId, factionId, turn) {
      // Reduce all armies' unit counts by 15%
      const armies = db
        .prepare('SELECT id FROM armies WHERE game_id = ? AND faction_id = ?')
        .all(gameId, factionId) as { id: string }[];
      for (const army of armies) {
        db.prepare(`UPDATE units SET count = MAX(0, CAST(count * 0.85 AS INTEGER)) WHERE game_id = ? AND army_id = ?`)
          .run(gameId, army.id);
      }
      // Manpower loss
      db.prepare('UPDATE factions SET manpower = MAX(0, CAST(manpower * 0.85 AS INTEGER)) WHERE game_id = ? AND id = ?')
        .run(gameId, factionId);
      return `Plague in ${factionId}: -15% troops and manpower`;
    },
  },
  {
    type: 'famine',
    description: 'Crops fail; food stores are depleted',
    probability: 0.04,   // ~once per 25 turns per faction
    apply(db, gameId, factionId, turn) {
      db.prepare('UPDATE factions SET food = MAX(0, food - 50) WHERE game_id = ? AND id = ?')
        .run(gameId, factionId);
      // Morale penalty to all units
      db.prepare(
        `UPDATE units SET morale = MAX(20, morale - 15)
         WHERE game_id = ? AND army_id IN (SELECT id FROM armies WHERE game_id = ? AND faction_id = ?)`,
      ).run(gameId, gameId, factionId);
      return `Famine in ${factionId}: -50 food, -15 morale on all units`;
    },
  },
  {
    type: 'succession_crisis',
    description: 'A disputed succession destabilises the realm',
    probability: 0.03,
    apply(db, gameId, factionId, turn) {
      // Gold drain (nobles demand rewards to support claimant)
      db.prepare('UPDATE factions SET gold = MAX(0, gold - 80) WHERE game_id = ? AND id = ?')
        .run(gameId, factionId);
      // Opinion drops with all neighbours
      db.prepare(
        `UPDATE diplomatic_relations
         SET opinion = MAX(-100, opinion - 10)
         WHERE game_id = ? AND (faction_a = ? OR faction_b = ?)`,
      ).run(gameId, factionId, factionId);
      return `Succession crisis in ${factionId}: -80 gold, -10 opinion with all neighbours`;
    },
  },
  {
    type: 'bumper_harvest',
    description: 'An exceptional harvest fills the granaries',
    probability: 0.06,
    apply(db, gameId, factionId, turn) {
      db.prepare('UPDATE factions SET food = MIN(9999, food + 60) WHERE game_id = ? AND id = ?')
        .run(gameId, factionId);
      return `Bumper harvest in ${factionId}: +60 food`;
    },
  },
  {
    type: 'trade_windfall',
    description: 'Merchants return with unexpected riches',
    probability: 0.06,
    apply(db, gameId, factionId, turn) {
      db.prepare('UPDATE factions SET gold = MIN(9999, gold + 100) WHERE game_id = ? AND id = ?')
        .run(gameId, factionId);
      return `Trade windfall for ${factionId}: +100 gold`;
    },
  },
];

// ── Per-turn random event tick ────────────────────────────────────────────────

/**
 * Roll random events for all factions and apply consequences.
 * Returns list of event descriptions for the turn log.
 */
export function tickRandomEvents(db: Database.Database, gameId: string): string[] {
  const factions = db
    .prepare('SELECT id, name FROM factions WHERE game_id = ?')
    .all(gameId) as { id: string; name: string }[];

  const game = db.prepare('SELECT turn FROM games WHERE id = ?').get(gameId) as { turn: number };
  const factionNames = new Map(factions.map((f) => [f.id, f.name]));
  const events: string[] = [];

  for (const { id: factionId } of factions) {
    for (const evt of RANDOM_EVENTS) {
      if (Math.random() < evt.probability) {
        const rawDesc = evt.apply(db, gameId, factionId, game.turn);
        // Replace faction ID with display name in event message
        const factionName = factionNames.get(factionId) ?? factionId;
        const description = rawDesc.replace(factionId, factionName);
        events.push(description);

        db.prepare(
          `INSERT INTO turn_log (id, game_id, turn, type, description, faction_id, data)
           VALUES (?, ?, ?, ?, ?, ?, '{}')`,
        ).run(randomUUID(), gameId, game.turn, evt.type, description, factionId);

        break; // At most one event per faction per turn
      }
    }
  }

  return events;
}
