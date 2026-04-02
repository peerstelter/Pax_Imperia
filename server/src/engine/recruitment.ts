import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { getTroopStats, recruitableTroops } from '@pax-imperia/shared';
import { createUnit } from './unitFactory.js';
import type { TroopType, Biome } from '@pax-imperia/shared';

interface ProvinceRow { id: string; biome: Biome; owner_id: string }
interface FactionRow  { id: string; gold: number; manpower: number }
interface ArmyRow     { id: string }

export interface RecruitOrder {
  factionId: string;
  provinceId: string;
  troopType: TroopType;
  count: number;      // in hundreds
}

export interface RecruitResult {
  ok: boolean;
  armyId?: string;
  unitId?: string;
  goldSpent?: number;
  manpowerSpent?: number;
  reason?: string;
}

/**
 * Recruit troops in a province.
 * - Deducts gold + manpower from faction.
 * - Creates (or adds to) the faction's army in that province.
 * - Training time is enforced by the turn log (turn engine picks it up).
 */
export function recruit(
  db: Database.Database,
  gameId: string,
  order: RecruitOrder,
): RecruitResult {
  const { factionId, provinceId, troopType, count } = order;

  const province = db
    .prepare('SELECT id, biome, owner_id FROM provinces WHERE game_id = ? AND id = ?')
    .get(gameId, provinceId) as ProvinceRow | undefined;

  if (!province) return { ok: false, reason: 'Province not found' };
  if (province.owner_id !== factionId) return { ok: false, reason: 'Province not owned by faction' };

  const available = recruitableTroops(province.biome);
  if (!available.includes(troopType)) {
    return { ok: false, reason: `${troopType} not recruitable in ${province.biome} biome` };
  }

  const stats     = getTroopStats(troopType);
  const goldCost  = Math.ceil((count / 100) * stats.recruitCost);
  const manCost   = Math.ceil((count / 100) * stats.manpowerCost);

  const faction = db
    .prepare('SELECT id, gold, manpower FROM factions WHERE game_id = ? AND id = ?')
    .get(gameId, factionId) as FactionRow | undefined;

  if (!faction) return { ok: false, reason: 'Faction not found' };
  if (faction.gold < goldCost) return { ok: false, reason: `Insufficient gold (need ${goldCost}, have ${faction.gold})` };
  if (faction.manpower < manCost) return { ok: false, reason: `Insufficient manpower (need ${manCost}, have ${faction.manpower})` };

  // Deduct resources
  db.prepare('UPDATE factions SET gold = gold - ?, manpower = manpower - ? WHERE game_id = ? AND id = ?')
    .run(goldCost, manCost, gameId, factionId);

  // Find or create army in province
  let army = db
    .prepare('SELECT id FROM armies WHERE game_id = ? AND faction_id = ? AND province_id = ?')
    .get(gameId, factionId, provinceId) as ArmyRow | undefined;

  const armyId = army?.id ?? randomUUID();
  if (!army) {
    db.prepare(
      'INSERT INTO armies (id, game_id, faction_id, province_id, formation) VALUES (?, ?, ?, ?, ?)',
    ).run(armyId, gameId, factionId, provinceId, '{}');
  }

  // Add unit (or increase existing unit count)
  const unit = createUnit(troopType, count, province.biome);
  const existing = db
    .prepare('SELECT id, count FROM units WHERE game_id = ? AND army_id = ? AND type = ? AND (variant = ? OR (variant IS NULL AND ? IS NULL))')
    .get(gameId, armyId, troopType, unit.variant ?? null, unit.variant ?? null) as { id: string; count: number } | undefined;

  let unitId: string;
  if (existing) {
    unitId = existing.id;
    db.prepare('UPDATE units SET count = count + ? WHERE game_id = ? AND id = ?')
      .run(count, gameId, existing.id);
  } else {
    unitId = randomUUID();
    db.prepare(
      'INSERT INTO units (id, game_id, army_id, type, variant, count, morale, attack, defense, speed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(unitId, gameId, armyId, unit.type, unit.variant ?? null, unit.count, unit.morale, unit.attack, unit.defense, unit.speed);
  }

  // Log recruitment (training completes after trainingTurns)
  const game = db.prepare('SELECT turn FROM games WHERE id = ?').get(gameId) as { turn: number };
  db.prepare(
    `INSERT INTO turn_log (id, game_id, turn, type, description, faction_id, province_id, data)
     VALUES (?, ?, ?, 'recruitment', ?, ?, ?, ?)`,
  ).run(
    randomUUID(), gameId, game.turn,
    `${factionId} recruited ${count} ${troopType} in ${provinceId}`,
    factionId, provinceId,
    JSON.stringify({ troopType, count, goldCost, manCost, readyTurn: game.turn + stats.trainingTurns }),
  );

  return { ok: true, armyId, unitId, goldSpent: goldCost, manpowerSpent: manCost };
}
