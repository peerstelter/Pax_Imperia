import { Router, Request, Response } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

// GET /api/faction/:gameId — all factions in a game
router.get('/:gameId', (req: Request, res: Response) => {
  const db = getDb();
  const factions = db.prepare('SELECT * FROM factions WHERE game_id = ?').all(req.params.gameId);
  return res.json(factions);
});

// GET /api/faction/:gameId/:factionId — single faction
router.get('/:gameId/:factionId', (req: Request, res: Response) => {
  const db = getDb();
  const faction = db
    .prepare('SELECT * FROM factions WHERE game_id = ? AND id = ?')
    .get(req.params.gameId, req.params.factionId);
  if (!faction) return res.status(404).json({ error: 'Faction not found' });
  return res.json(faction);
});

// PATCH /api/faction/:gameId/:factionId — update resources
router.patch('/:gameId/:factionId', (req: Request, res: Response) => {
  const { gold, food, manpower } = req.body as { gold?: number; food?: number; manpower?: number };
  const db = getDb();

  const sets: string[] = [];
  const vals: unknown[] = [];
  if (gold !== undefined) { sets.push('gold = ?'); vals.push(gold); }
  if (food !== undefined) { sets.push('food = ?'); vals.push(food); }
  if (manpower !== undefined) { sets.push('manpower = ?'); vals.push(manpower); }

  if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });

  vals.push(req.params.gameId, req.params.factionId);
  db.prepare(`UPDATE factions SET ${sets.join(', ')} WHERE game_id = ? AND id = ?`).run(...vals);
  return res.status(204).send();
});

export default router;
