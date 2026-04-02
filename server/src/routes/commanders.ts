import { Router, Request, Response } from 'express';
import { getDb } from '../db/database.js';
import { hireCommander, assignCommander } from '../engine/commanderEngine.js';

const router = Router();

// GET /api/commanders/:gameId — list all commanders
router.get('/:gameId', (req: Request, res: Response) => {
  const db = getDb();
  return res.json(db.prepare('SELECT * FROM commanders WHERE game_id = ?').all(req.params.gameId));
});

// POST /api/commanders/hire — hire a new commander (200 gold)
router.post('/hire', (req: Request, res: Response) => {
  const { gameId, factionId, name, attack, defense, maneuver } = req.body as {
    gameId: string; factionId: string; name: string;
    attack: number; defense: number; maneuver: number;
  };
  if (!gameId || !factionId || !name) return res.status(400).json({ error: 'gameId, factionId, name required' });

  const db     = getDb();
  const result = hireCommander(db, gameId, { name, factionId, attack: attack ?? 5, defense: defense ?? 5, maneuver: maneuver ?? 5 });
  return result.ok ? res.status(201).json(result) : res.status(400).json(result);
});

// POST /api/commanders/assign — assign commander to army
router.post('/assign', (req: Request, res: Response) => {
  const { gameId, commanderId, armyId } = req.body as { gameId: string; commanderId: string; armyId: string };
  if (!gameId || !commanderId || !armyId) return res.status(400).json({ error: 'gameId, commanderId, armyId required' });

  assignCommander(getDb(), gameId, commanderId, armyId);
  return res.status(204).send();
});

export default router;
