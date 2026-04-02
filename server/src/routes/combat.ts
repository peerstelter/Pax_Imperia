import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../db/database.js';
import { resolveCombat } from '../engine/combatResolver.js';
import { resolveSiegeTurn, initSiege } from '../engine/siegeEngine.js';
import { declareWar, makePeace, formAlliance, breakAlliance } from '../engine/warDiplomacy.js';
import { buildDefaultFormation } from '@pax-imperia/shared';
import type { Unit, Commander } from '@pax-imperia/shared';
import type { SiegeWeaponType } from '@pax-imperia/shared';

const router = Router();

// POST /api/combat/declare — declare war with call-to-arms
router.post('/declare', (req: Request, res: Response) => {
  const { gameId, attackerId, defenderId, casusBelli } = req.body as {
    gameId: string; attackerId: string; defenderId: string; casusBelli: 'claim' | 'revenge' | 'expansion';
  };
  if (!gameId || !attackerId || !defenderId || !casusBelli)
    return res.status(400).json({ error: 'gameId, attackerId, defenderId, casusBelli required' });

  const db = getDb();
  if (!db.prepare('SELECT id FROM games WHERE id = ?').get(gameId))
    return res.status(404).json({ error: 'Game not found' });

  const result = declareWar(db, gameId, attackerId, defenderId, casusBelli);
  return res.status(201).json(result);
});

// POST /api/combat/peace — negotiate a peace settlement
router.post('/peace', (req: Request, res: Response) => {
  const { gameId, winnerId, loserId, term } = req.body as {
    gameId: string; winnerId: string; loserId: string; term: 'annex' | 'tribute' | 'vassalize' | 'white_peace';
  };
  if (!gameId || !winnerId || !loserId || !term)
    return res.status(400).json({ error: 'gameId, winnerId, loserId, term required' });

  const db = getDb();
  makePeace(db, gameId, winnerId, loserId, term);
  return res.status(200).json({ message: `Peace (${term}) concluded` });
});

// POST /api/combat/alliance — form or break an alliance
router.post('/alliance', (req: Request, res: Response) => {
  const { gameId, factionA, factionB, action, type } = req.body as {
    gameId: string; factionA: string; factionB: string;
    action: 'form' | 'break'; type?: 'defensive' | 'offensive';
  };
  if (!gameId || !factionA || !factionB || !action)
    return res.status(400).json({ error: 'gameId, factionA, factionB, action required' });

  const db = getDb();
  if (action === 'form') {
    const result = formAlliance(db, gameId, factionA, factionB, type ?? 'defensive');
    return result.ok ? res.status(200).json(result) : res.status(400).json(result);
  } else {
    breakAlliance(db, gameId, factionA, factionB);
    return res.status(200).json({ message: 'Alliance dissolved' });
  }
});

// POST /api/combat/resolve — resolve a field battle between two armies
router.post('/resolve', (req: Request, res: Response) => {
  const { gameId, attackerArmyId, defenderArmyId, terrain, ambush } = req.body as {
    gameId: string;
    attackerArmyId: string;
    defenderArmyId: string;
    terrain?: import('@pax-imperia/shared').TerrainType;
    ambush?: boolean;
  };
  if (!gameId || !attackerArmyId || !defenderArmyId) {
    return res.status(400).json({ error: 'gameId, attackerArmyId, defenderArmyId required' });
  }

  const db = getDb();

  // Load armies from DB
  const atkRow = db.prepare('SELECT * FROM armies WHERE game_id = ? AND id = ?').get(gameId, attackerArmyId) as { id: string; faction_id: string; province_id: string; commander_id: string | null; formation: string } | undefined;
  const defRow = db.prepare('SELECT * FROM armies WHERE game_id = ? AND id = ?').get(gameId, defenderArmyId) as { id: string; faction_id: string; province_id: string; commander_id: string | null; formation: string } | undefined;
  if (!atkRow || !defRow) return res.status(404).json({ error: 'Army not found' });

  // Load units for each army
  const loadUnits = (armyId: string): Unit[] =>
    (db.prepare('SELECT * FROM units WHERE game_id = ? AND army_id = ?').all(gameId, armyId) as {
      type: Unit['type']; variant: string | null; count: number; morale: number; attack: number; defense: number; speed: number
    }[]).map((r) => ({
      type: r.type,
      variant: r.variant ?? undefined,
      count: r.count,
      morale: r.morale,
      attack: r.attack,
      defense: r.defense,
      speed: r.speed,
    }));

  const atkUnits = loadUnits(attackerArmyId);
  const defUnits = loadUnits(defenderArmyId);

  const atkFormation = atkRow.formation !== '{}' ? JSON.parse(atkRow.formation) : buildDefaultFormation(atkUnits);
  const defFormation = defRow.formation !== '{}' ? JSON.parse(defRow.formation) : buildDefaultFormation(defUnits);

  // Load optional commanders
  const loadCommander = (id: string | null): Commander | undefined => {
    if (!id) return undefined;
    const c = db.prepare('SELECT * FROM commanders WHERE game_id = ? AND id = ?').get(gameId, id) as {
      id: string; name: string; faction_id: string; attack: number; defense: number; maneuver: number; is_alive: number
    } | undefined;
    if (!c || !c.is_alive) return undefined;
    return { id: c.id, name: c.name, factionId: c.faction_id, attack: c.attack, defense: c.defense, maneuver: c.maneuver, isAlive: true };
  };

  const result = resolveCombat(
    { id: atkRow.id, factionId: atkRow.faction_id, provinceId: atkRow.province_id, units: atkUnits, formation: atkFormation },
    { id: defRow.id, factionId: defRow.faction_id, provinceId: defRow.province_id, units: defUnits, formation: defFormation },
    loadCommander(atkRow.commander_id),
    loadCommander(defRow.commander_id),
    { terrain, ambush },
  );

  // Persist survivor counts back to units table
  const updateUnit = db.prepare('UPDATE units SET count = ?, morale = ? WHERE game_id = ? AND army_id = ? AND type = ?');
  db.transaction(() => {
    for (const u of result.attackerSurvivors) updateUnit.run(u.count, u.morale, gameId, attackerArmyId, u.type);
    for (const u of result.defenderSurvivors) updateUnit.run(u.count, u.morale, gameId, defenderArmyId, u.type);
  })();

  // Log battle
  const game = db.prepare('SELECT turn FROM games WHERE id = ?').get(gameId) as { turn: number };
  db.prepare(
    `INSERT INTO turn_log (id, game_id, turn, type, description, faction_id, data)
     VALUES (?, ?, ?, 'battle', ?, ?, ?)`,
  ).run(
    randomUUID(), gameId, game.turn,
    `Battle: ${atkRow.faction_id} ${result.winner === 'attacker' ? 'won' : result.winner === 'defender' ? 'lost' : 'drew'} vs ${defRow.faction_id}`,
    atkRow.faction_id,
    JSON.stringify({ winner: result.winner, attackerCasualties: result.totalAttackerCasualties, defenderCasualties: result.totalDefenderCasualties }),
  );

  return res.json(result);
});

// POST /api/combat/siege — resolve one turn of a siege
router.post('/siege', (req: Request, res: Response) => {
  const { gameId, attackerArmyId, defenderProvinceId, weapons, attemptAssault, defenderSortie } = req.body as {
    gameId: string;
    attackerArmyId: string;
    defenderProvinceId: string;
    weapons: SiegeWeaponType[];
    attemptAssault: boolean;
    defenderSortie: boolean;
  };
  if (!gameId || !attackerArmyId || !defenderProvinceId) {
    return res.status(400).json({ error: 'gameId, attackerArmyId, defenderProvinceId required' });
  }

  const db = getDb();

  const province = db.prepare('SELECT fort_level, garrison, owner_id FROM provinces WHERE game_id = ? AND id = ?')
    .get(gameId, defenderProvinceId) as { fort_level: number; garrison: number; owner_id: string } | undefined;
  if (!province) return res.status(404).json({ error: 'Province not found' });

  const atkRow = db.prepare('SELECT * FROM armies WHERE game_id = ? AND id = ?').get(gameId, attackerArmyId) as { id: string; faction_id: string; province_id: string; commander_id: string | null; formation: string } | undefined;
  if (!atkRow) return res.status(404).json({ error: 'Attacking army not found' });

  // Build a synthetic defender army from garrison
  const defArmy = {
    id: 'garrison',
    factionId: province.owner_id,
    provinceId: defenderProvinceId,
    units: [{ type: 'heavy_infantry' as const, count: province.garrison, morale: 80, attack: 14, defense: 18, speed: 5 }],
    formation: buildDefaultFormation([{ type: 'heavy_infantry', count: province.garrison, morale: 80, attack: 14, defense: 18, speed: 5 }]),
  };

  const atkUnits: Unit[] = (db.prepare('SELECT * FROM units WHERE game_id = ? AND army_id = ?').all(gameId, attackerArmyId) as {
    type: Unit['type']; variant: string | null; count: number; morale: number; attack: number; defense: number; speed: number
  }[]).map((r) => ({ type: r.type, variant: r.variant ?? undefined, count: r.count, morale: r.morale, attack: r.attack, defense: r.defense, speed: r.speed }));

  const atkFormation = atkRow.formation !== '{}' ? JSON.parse(atkRow.formation) : buildDefaultFormation(atkUnits);
  const atkArmy = { id: atkRow.id, factionId: atkRow.faction_id, provinceId: atkRow.province_id, units: atkUnits, formation: atkFormation };

  const siegeState = initSiege(province.fort_level);
  const result = resolveSiegeTurn(siegeState, atkArmy, defArmy, weapons ?? [], { attemptAssault, defenderSortie }, undefined, undefined);

  // If attacker won the assault, reduce garrison and optionally fort level
  if (result.assaultResult?.winner === 'attacker') {
    db.prepare('UPDATE provinces SET garrison = 0 WHERE game_id = ? AND id = ?').run(gameId, defenderProvinceId);
  }

  return res.json(result);
});

export default router;
