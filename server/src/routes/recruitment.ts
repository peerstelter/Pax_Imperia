import { Router, Request, Response } from 'express';
import { getDb } from '../db/database.js';
import { recruit } from '../engine/recruitment.js';
import { getWarExhaustion, recruitmentRateMod } from '../engine/warExhaustion.js';
import { recruitableTroops } from '@pax-imperia/shared';
import type { TroopType, Biome } from '@pax-imperia/shared';

const router = Router();

// GET /api/recruit/:gameId/:provinceId — list recruitable troop types
router.get('/:gameId/:provinceId', (req: Request, res: Response) => {
  const db  = getDb();
  const row = db.prepare('SELECT biome FROM provinces WHERE game_id = ? AND id = ?')
    .get(req.params.gameId, req.params.provinceId) as { biome: Biome } | undefined;
  if (!row) return res.status(404).json({ error: 'Province not found' });
  return res.json({ biome: row.biome, available: recruitableTroops(row.biome) });
});

// POST /api/recruit — queue a recruitment order
router.post('/', (req: Request, res: Response) => {
  const { gameId, factionId, provinceId, troopType, count } = req.body as {
    gameId: string; factionId: string; provinceId: string; troopType: TroopType; count: number;
  };
  if (!gameId || !factionId || !provinceId || !troopType || !count)
    return res.status(400).json({ error: 'gameId, factionId, provinceId, troopType, count required' });

  const db = getDb();

  // Apply war exhaustion recruitment penalty to the requested count
  const exhaustion = getWarExhaustion(db, gameId, factionId);
  const rateMod    = recruitmentRateMod(exhaustion);
  const effectiveCount = Math.max(1, Math.floor(count * rateMod));

  const result = recruit(db, gameId, { factionId, provinceId, troopType, count: effectiveCount });
  return result.ok
    ? res.status(201).json({ ...result, requestedCount: count, effectiveCount, exhaustion, rateMod })
    : res.status(400).json(result);
});

export default router;
