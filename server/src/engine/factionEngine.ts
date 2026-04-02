import type Database from 'better-sqlite3';
import type { FactionPersonality } from '@pax-imperia/shared';

interface FactionRow {
  id: string;
  game_id: string;
  name: string;
  color: string;
  gold: number;
  food: number;
  manpower: number;
  personality: FactionPersonality;
  is_player: number;
}

interface ProvinceCount {
  owner_id: string;
  count: number;
}

/**
 * Per-turn resource tick for all factions in a game.
 *
 * Gold income  = 20 × province count  (trade + taxation)
 * Food income  = 15 × province count
 * Manpower regen = 10 × province count (capped at starting manpower)
 *
 * Personality modifiers:
 *  merchant     → gold ×1.5
 *  expansionist → manpower ×1.2
 *  isolationist → food ×1.3
 *  aggressive   → manpower ×1.1, food ×0.9
 */
export function tickFactionResources(db: Database.Database, gameId: string): void {
  const factions = db
    .prepare('SELECT * FROM factions WHERE game_id = ?')
    .all(gameId) as FactionRow[];

  const provinceCounts = db
    .prepare('SELECT owner_id, COUNT(*) as count FROM provinces WHERE game_id = ? GROUP BY owner_id')
    .all(gameId) as ProvinceCount[];

  const countMap = new Map(provinceCounts.map((r) => [r.owner_id, r.count]));

  const update = db.prepare(
    'UPDATE factions SET gold = ?, food = ?, manpower = ? WHERE game_id = ? AND id = ?',
  );

  db.transaction(() => {
    for (const faction of factions) {
      const provinces = countMap.get(faction.id) ?? 0;

      let goldTick     = 20 * provinces;
      let foodTick     = 15 * provinces;
      let manpowerTick = 10 * provinces;

      switch (faction.personality) {
        case 'merchant':     goldTick     *= 1.5; break;
        case 'expansionist': manpowerTick *= 1.2; break;
        case 'isolationist': foodTick     *= 1.3; break;
        case 'aggressive':   manpowerTick *= 1.1; foodTick *= 0.9; break;
      }

      update.run(
        Math.floor(faction.gold + goldTick),
        Math.floor(faction.food + foodTick),
        Math.floor(faction.manpower + manpowerTick),
        gameId,
        faction.id,
      );
    }
  })();
}
