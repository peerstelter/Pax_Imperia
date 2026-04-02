import { Router, Request, Response } from 'express';
import { getDb } from '../db/database.js';
import type { IntrigueActionType } from '@pax-imperia/shared';
import { buildSpyNetwork, getNetworkStrength, listNetworks } from '../engine/spyNetwork.js';
import { queueIntrigueAction } from '../engine/intrigueEngine.js';

const router = Router();

// GET /api/intrigue/:gameId — all intrigue actions for a game
router.get('/:gameId', (req: Request, res: Response) => {
  const db = getDb();
  const actions = db
    .prepare('SELECT * FROM intrigue_actions WHERE game_id = ?')
    .all(req.params.gameId);
  return res.json(actions);
});

// POST /api/intrigue/action — queue an intrigue action (resolved on turn end)
router.post('/action', (req: Request, res: Response) => {
  const { gameId, type, sourceFactionId, targetFactionId, targetProvinceId } = req.body as {
    gameId: string;
    type: IntrigueActionType;
    sourceFactionId: string;
    targetFactionId: string;
    targetProvinceId?: string;
  };
  if (!gameId || !type || !sourceFactionId || !targetFactionId) {
    return res.status(400).json({ error: 'gameId, type, sourceFactionId, targetFactionId required' });
  }

  const db = getDb();
  if (!db.prepare('SELECT id FROM games WHERE id = ?').get(gameId))
    return res.status(404).json({ error: 'Game not found' });

  const result = queueIntrigueAction(db, gameId, type, sourceFactionId, targetFactionId, targetProvinceId);
  return res.status(201).json(result);
});

// POST /api/intrigue/network/build — place an agent in a province
router.post('/network/build', (req: Request, res: Response) => {
  const { gameId, factionId, provinceId } = req.body as {
    gameId: string; factionId: string; provinceId: string;
  };
  if (!gameId || !factionId || !provinceId)
    return res.status(400).json({ error: 'gameId, factionId, provinceId required' });

  const db = getDb();
  const result = buildSpyNetwork(db, gameId, factionId, provinceId);
  return result.ok ? res.status(201).json(result) : res.status(400).json(result);
});

// GET /api/intrigue/network/:gameId/:factionId — list all networks for a faction
router.get('/network/:gameId/:factionId', (req: Request, res: Response) => {
  const db = getDb();
  return res.json(listNetworks(db, req.params.gameId, req.params.factionId));
});

// GET /api/intrigue/network/:gameId/:factionId/:provinceId — get a specific network
router.get('/network/:gameId/:factionId/:provinceId', (req: Request, res: Response) => {
  const db = getDb();
  return res.json(getNetworkStrength(db, req.params.gameId, req.params.factionId, req.params.provinceId));
});

export default router;
