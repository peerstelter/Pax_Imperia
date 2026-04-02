import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../db/database.js';
import { seedGame, FACTION_DEFS } from '../db/seeder.js';
import { advanceTurn } from '../engine/turnEngine.js';
import { loadGameState, exportGameJson } from '../engine/saveLoad.js';

const router = Router();

// GET /api/game — list all saves
router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const saves = db.prepare('SELECT id, player_faction, turn, winner, created_at, updated_at FROM games ORDER BY updated_at DESC').all();
  return res.json(saves);
});

// GET /api/game/:id — load full game state
router.get('/:id', (req: Request, res: Response) => {
  if (req.params.id === 'factions') return res.status(400).json({ error: 'Use /api/game/factions' });
  const db = getDb();
  try {
    return res.json(loadGameState(db, req.params.id));
  } catch {
    return res.status(404).json({ error: 'Game not found' });
  }
});

// GET /api/game/:id/export — download game as JSON
router.get('/:id/export', (req: Request, res: Response) => {
  const db = getDb();
  try {
    const json = exportGameJson(db, req.params.id);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="pax-imperia-${req.params.id}.json"`);
    return res.send(json);
  } catch {
    return res.status(404).json({ error: 'Game not found' });
  }
});

// GET /api/game/factions — list available starting factions
router.get('/factions', (_req: Request, res: Response) => {
  return res.json(FACTION_DEFS.map(({ id, name, color, personality, isPlayer }) => ({
    id, name, color, personality, isPlayer,
  })));
});

// POST /api/game — create and seed a new game
router.post('/', (req: Request, res: Response) => {
  const { playerFactionId, difficulty = 'normal' } = req.body as {
    playerFactionId?: string;
    difficulty?: 'easy' | 'normal' | 'hard';
  };
  if (!playerFactionId) return res.status(400).json({ error: 'playerFactionId required' });

  const db = getDb();
  const id = randomUUID();

  // Difficulty is stored as metadata in turn_log on game start (Easy = more gold, Hard = less)
  const startingGoldMod = difficulty === 'easy' ? 1.5 : difficulty === 'hard' ? 0.7 : 1.0;

  db.prepare(
    'INSERT INTO games (id, player_faction, turn) VALUES (?, ?, 1)',
  ).run(id, playerFactionId);

  try {
    seedGame(db, id, playerFactionId);
    // Apply difficulty gold modifier to player faction
    if (startingGoldMod !== 1.0) {
      db.prepare('UPDATE factions SET gold = CAST(gold * ? AS INTEGER) WHERE game_id = ? AND id = ?')
        .run(startingGoldMod, id, playerFactionId);
    }
    // Log difficulty choice
    db.prepare(
      `INSERT INTO turn_log (id, game_id, turn, type, description, data) VALUES (?, ?, 1, 'game_start', ?, ?)`,
    ).run(randomUUID(), id, `New game started (${difficulty})`, JSON.stringify({ playerFactionId, difficulty }));
  } catch (err) {
    db.prepare('DELETE FROM games WHERE id = ?').run(id);
    return res.status(400).json({ error: (err as Error).message });
  }

  return res.status(201).json({ id });
});

// PUT /api/game/:id/turn — advance to next turn
router.put('/:id/turn', (req: Request, res: Response) => {
  const db = getDb();
  try {
    const result = advanceTurn(db, req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

// DELETE /api/game/:id — delete a save
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM games WHERE id = ?').run(req.params.id);
  return res.status(204).send();
});

export default router;
