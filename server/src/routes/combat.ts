import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../db/database.js';

const router = Router();

// POST /api/combat/declare — declare war (creates casus belli entry in turn_log)
router.post('/declare', (req: Request, res: Response) => {
  const { gameId, attackerId, defenderId, casusBelli } = req.body as {
    gameId: string;
    attackerId: string;
    defenderId: string;
    casusBelli: 'claim' | 'revenge' | 'expansion';
  };
  if (!gameId || !attackerId || !defenderId || !casusBelli) {
    return res.status(400).json({ error: 'gameId, attackerId, defenderId, casusBelli required' });
  }

  const db = getDb();
  const game = db.prepare('SELECT turn FROM games WHERE id = ?').get(gameId) as { turn: number } | undefined;
  if (!game) return res.status(404).json({ error: 'Game not found' });

  db.prepare(
    `INSERT INTO turn_log (id, game_id, turn, type, description, faction_id, data)
     VALUES (?, ?, ?, 'war_declaration', ?, ?, ?)`,
  ).run(
    randomUUID(),
    gameId,
    game.turn,
    `${attackerId} declared war on ${defenderId} (${casusBelli})`,
    attackerId,
    JSON.stringify({ defenderId, casusBelli }),
  );

  // Drop opinion on war declaration
  db.prepare(
    `UPDATE diplomatic_relations SET opinion = MAX(-100, opinion - 30)
     WHERE game_id = ? AND ((faction_a = ? AND faction_b = ?) OR (faction_a = ? AND faction_b = ?))`,
  ).run(gameId, attackerId, defenderId, defenderId, attackerId);

  return res.status(201).json({ message: 'War declared' });
});

// POST /api/combat/resolve — resolve a battle (full logic in Task 19)
router.post('/resolve', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Full combat resolution implemented in Task 19' });
});

export default router;
