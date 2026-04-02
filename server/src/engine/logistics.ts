import type Database from 'better-sqlite3';

interface ArmyRow { id: string; faction_id: string; province_id: string }
interface ProvinceRow { biome: string; owner_id: string }
interface UnitRow { id: string; count: number; morale: number; type: string }
interface FactionRow { id: string; gold: number; food: number }

/**
 * Per-turn logistics tick for all armies.
 *
 * Attrition rules:
 *  1. Armies in friendly territory: no attrition
 *  2. Armies in enemy territory:    5% troop loss per turn (supply lines cut)
 *  3. Armies in Tundra biome:       additional 5% loss in winter (turn % 4 === 0)
 *  4. Reindeer Cavalry variant:     immune to Tundra winter penalty
 *
 * Supply cost: each 100 troops costs 1 food/turn.
 * If faction has no food, armies take 10% morale hit per turn instead.
 */
export function tickLogistics(db: Database.Database, gameId: string, turn: number): void {
  const armies   = db.prepare('SELECT id, faction_id, province_id FROM armies WHERE game_id = ?').all(gameId) as ArmyRow[];
  const factions = new Map(
    (db.prepare('SELECT id, gold, food FROM factions WHERE game_id = ?').all(gameId) as FactionRow[])
      .map((f) => [f.id, f]),
  );
  const provinces = new Map(
    (db.prepare('SELECT id, biome, owner_id FROM provinces WHERE game_id = ?').all(gameId) as (ProvinceRow & { id: string })[])
      .map((p) => [p.id, p]),
  );

  const isWinter = turn % 4 === 0;

  for (const army of armies) {
    const province = provinces.get(army.province_id);
    if (!province) continue;

    const faction = factions.get(army.faction_id);
    if (!faction) continue;

    const units = db.prepare('SELECT id, count, morale, type FROM units WHERE game_id = ? AND army_id = ?')
      .all(gameId, army.id) as UnitRow[];
    if (units.length === 0) continue;

    const totalTroops = units.reduce((s, u) => s + u.count, 0);
    const foodCost    = Math.ceil(totalTroops / 100);

    // Supply deduction
    const hasSupply = faction.food >= foodCost;
    if (hasSupply) {
      db.prepare('UPDATE factions SET food = food - ? WHERE game_id = ? AND id = ?')
        .run(foodCost, gameId, army.faction_id);
      factions.set(army.faction_id, { ...faction, food: faction.food - foodCost });
    }

    // Attrition in enemy territory
    const inEnemyTerritory = province.owner_id !== army.faction_id;
    const tundraWinter     = province.biome === 'tundra' && isWinter;

    for (const unit of units) {
      let attritionRate   = 0;
      let moralePenalty   = 0;

      if (inEnemyTerritory) attritionRate += 0.05;
      if (tundraWinter && unit.type !== 'cavalry' && !(unit as UnitRow & { variant?: string }).hasOwnProperty('variant')) {
        attritionRate += 0.05;
      }
      if (!hasSupply) moralePenalty += 10;

      const lost   = Math.floor(unit.count * attritionRate);
      const newCnt = Math.max(0, unit.count - lost);
      const newMrl = Math.max(0, unit.morale - moralePenalty);

      if (lost > 0 || moralePenalty > 0) {
        db.prepare('UPDATE units SET count = ?, morale = ? WHERE game_id = ? AND id = ?')
          .run(newCnt, newMrl, gameId, unit.id);
      }
    }
  }
}
