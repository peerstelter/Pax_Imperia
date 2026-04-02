import { Router, Request, Response } from 'express';
import { getDb } from '../db/database.js';
import type { DiplomacyType } from '@pax-imperia/shared';

const router = Router();

// GET /api/diplomacy/:gameId — all diplomatic relations
router.get('/:gameId', (req: Request, res: Response) => {
  const db = getDb();
  const relations = db
    .prepare('SELECT * FROM diplomatic_relations WHERE game_id = ?')
    .all(req.params.gameId);
  return res.json(relations);
});

// GET /api/diplomacy/:gameId/:factionId — relations for one faction
router.get('/:gameId/:factionId', (req: Request, res: Response) => {
  const db = getDb();
  const relations = db
    .prepare(
      `SELECT * FROM diplomatic_relations WHERE game_id = ?
       AND (faction_a = ? OR faction_b = ?)`,
    )
    .all(req.params.gameId, req.params.factionId, req.params.factionId);
  return res.json(relations);
});

// POST /api/diplomacy/offer — propose a treaty or gift
router.post('/offer', (req: Request, res: Response) => {
  const { gameId, fromId, toId, treaty, opinionDelta } = req.body as {
    gameId: string;
    fromId: string;
    toId: string;
    treaty?: DiplomacyType;
    opinionDelta?: number;
  };
  if (!gameId || !fromId || !toId) {
    return res.status(400).json({ error: 'gameId, fromId, toId required' });
  }

  const db = getDb();

  // Ensure relation row exists (canonical order: a < b alphabetically)
  const [a, b] = [fromId, toId].sort();
  db.prepare(
    `INSERT OR IGNORE INTO diplomatic_relations (game_id, faction_a, faction_b, opinion, treaties)
     VALUES (?, ?, ?, 0, '[]')`,
  ).run(gameId, a, b);

  if (opinionDelta) {
    db.prepare(
      `UPDATE diplomatic_relations SET opinion = MIN(100, MAX(-100, opinion + ?))
       WHERE game_id = ? AND faction_a = ? AND faction_b = ?`,
    ).run(opinionDelta, gameId, a, b);
  }

  if (treaty) {
    const row = db
      .prepare('SELECT treaties FROM diplomatic_relations WHERE game_id = ? AND faction_a = ? AND faction_b = ?')
      .get(gameId, a, b) as { treaties: string } | undefined;
    const treaties: DiplomacyType[] = row ? JSON.parse(row.treaties) : [];
    if (!treaties.includes(treaty)) {
      treaties.push(treaty);
      db.prepare(
        'UPDATE diplomatic_relations SET treaties = ? WHERE game_id = ? AND faction_a = ? AND faction_b = ?',
      ).run(JSON.stringify(treaties), gameId, a, b);
    }
  }

  return res.status(200).json({ message: 'Offer applied' });
});

export default router;
