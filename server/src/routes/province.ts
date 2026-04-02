import { Router, Request, Response } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

// GET /api/province/:gameId — all provinces (fog of war filtered for player)
router.get('/:gameId', (req: Request, res: Response) => {
  const db = getDb();
  const provinces = db.prepare('SELECT * FROM provinces WHERE game_id = ?').all(req.params.gameId);
  return res.json(provinces);
});

// GET /api/province/:gameId/:provinceId — single province detail
router.get('/:gameId/:provinceId', (req: Request, res: Response) => {
  const db = getDb();
  const province = db
    .prepare('SELECT * FROM provinces WHERE game_id = ? AND id = ?')
    .get(req.params.gameId, req.params.provinceId);
  if (!province) return res.status(404).json({ error: 'Province not found' });
  return res.json(province);
});

// PATCH /api/province/:gameId/:provinceId — update owner, garrison, fort
router.patch('/:gameId/:provinceId', (req: Request, res: Response) => {
  const { ownerId, garrison, fortLevel, isRevealed } = req.body as {
    ownerId?: string;
    garrison?: number;
    fortLevel?: number;
    isRevealed?: boolean;
  };
  const db = getDb();

  const sets: string[] = [];
  const vals: unknown[] = [];
  if (ownerId !== undefined)    { sets.push('owner_id = ?');    vals.push(ownerId); }
  if (garrison !== undefined)   { sets.push('garrison = ?');    vals.push(garrison); }
  if (fortLevel !== undefined)  { sets.push('fort_level = ?');  vals.push(fortLevel); }
  if (isRevealed !== undefined) { sets.push('is_revealed = ?'); vals.push(isRevealed ? 1 : 0); }

  if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });

  vals.push(req.params.gameId, req.params.provinceId);
  db.prepare(`UPDATE provinces SET ${sets.join(', ')} WHERE game_id = ? AND id = ?`).run(...vals);
  return res.status(204).send();
});

export default router;
