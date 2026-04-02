import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../db/database.js';
import type { IntrigueActionType } from '@pax-imperia/shared';

const router = Router();

// GET /api/intrigue/:gameId — all intrigue actions for a game
router.get('/:gameId', (req: Request, res: Response) => {
  const db = getDb();
  const actions = db
    .prepare('SELECT * FROM intrigue_actions WHERE game_id = ?')
    .all(req.params.gameId);
  return res.json(actions);
});

// POST /api/intrigue/action — queue an intrigue action (resolved on turn end, Task 45)
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
  const game = db.prepare('SELECT turn FROM games WHERE id = ?').get(gameId) as { turn: number } | undefined;
  if (!game) return res.status(404).json({ error: 'Game not found' });

  const id = randomUUID();
  // Base success chance varies by action type (full logic in Task 45)
  const baseChance: Record<IntrigueActionType, number> = {
    spy: 0.7,
    assassinate: 0.3,
    sabotage: 0.5,
    bribe: 0.5,
    propaganda: 0.6,
    blackmail: 0.4,
  };

  db.prepare(
    `INSERT INTO intrigue_actions
       (id, game_id, type, source_faction_id, target_faction_id, target_province_id, success_chance, status, turn)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
  ).run(id, gameId, type, sourceFactionId, targetFactionId, targetProvinceId ?? null, baseChance[type], game.turn);

  return res.status(201).json({ id });
});

export default router;
