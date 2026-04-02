import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../db/database.js';
import { seedGame, FACTION_DEFS } from '../db/seeder.js';

const router = Router();

// GET /api/game/:id — load full game state
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  const factions = db.prepare('SELECT * FROM factions WHERE game_id = ?').all(req.params.id);
  const provinces = db.prepare('SELECT * FROM provinces WHERE game_id = ?').all(req.params.id);
  const armies = db.prepare('SELECT * FROM armies WHERE game_id = ?').all(req.params.id);
  const relations = db.prepare('SELECT * FROM diplomatic_relations WHERE game_id = ?').all(req.params.id);

  return res.json({ game, factions, provinces, armies, relations });
});

// GET /api/game/factions — list available starting factions
router.get('/factions', (_req: Request, res: Response) => {
  return res.json(FACTION_DEFS.map(({ id, name, color, personality, isPlayer }) => ({
    id, name, color, personality, isPlayer,
  })));
});

// POST /api/game — create and seed a new game
router.post('/', (req: Request, res: Response) => {
  const { playerFactionId } = req.body as { playerFactionId?: string };
  if (!playerFactionId) return res.status(400).json({ error: 'playerFactionId required' });

  const db = getDb();
  const id = randomUUID();

  db.prepare(
    'INSERT INTO games (id, player_faction, turn) VALUES (?, ?, 1)',
  ).run(id, playerFactionId);

  try {
    seedGame(db, id, playerFactionId);
  } catch (err) {
    db.prepare('DELETE FROM games WHERE id = ?').run(id);
    return res.status(400).json({ error: (err as Error).message });
  }

  return res.status(201).json({ id });
});

// DELETE /api/game/:id — delete a save
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM games WHERE id = ?').run(req.params.id);
  return res.status(204).send();
});

export default router;
