import { Router, Request, Response } from 'express';
import { getDb } from '../db/database.js';
import {
  proposeAlliance, dissolveAlliance,
  proposeMarriage, proposeTrade,
  vassalize, proposeNap,
  sendDiplomaticMission, sendGift,
} from '../engine/diplomacyEngine.js';
import { adjustOpinion } from '../engine/opinionEngine.js';

const router = Router();

// GET /api/diplomacy/:gameId — all diplomatic relations
router.get('/:gameId', (req: Request, res: Response) => {
  const db = getDb();
  return res.json(db.prepare('SELECT * FROM diplomatic_relations WHERE game_id = ?').all(req.params.gameId));
});

// GET /api/diplomacy/:gameId/:factionId — relations for one faction
router.get('/:gameId/:factionId', (req: Request, res: Response) => {
  const db = getDb();
  return res.json(
    db.prepare('SELECT * FROM diplomatic_relations WHERE game_id = ? AND (faction_a = ? OR faction_b = ?)')
      .all(req.params.gameId, req.params.factionId, req.params.factionId),
  );
});

// POST /api/diplomacy/propose — propose any treaty type
router.post('/propose', (req: Request, res: Response) => {
  const { gameId, fromId, toId, treaty, allianceType, durationTurns } = req.body as {
    gameId: string; fromId: string; toId: string;
    treaty: 'alliance' | 'marriage' | 'trade' | 'vassalage' | 'non_aggression';
    allianceType?: 'defensive' | 'offensive';
    durationTurns?: number;
  };
  if (!gameId || !fromId || !toId || !treaty)
    return res.status(400).json({ error: 'gameId, fromId, toId, treaty required' });

  const db = getDb();
  let result: { ok: boolean; reason?: string };

  switch (treaty) {
    case 'alliance':       result = proposeAlliance(db, gameId, fromId, toId, allianceType); break;
    case 'marriage':       result = proposeMarriage(db, gameId, fromId, toId); break;
    case 'trade':          result = proposeTrade(db, gameId, fromId, toId); break;
    case 'vassalage':      result = vassalize(db, gameId, fromId, toId); break;
    case 'non_aggression': result = proposeNap(db, gameId, fromId, toId, durationTurns); break;
    default:               return res.status(400).json({ error: 'Unknown treaty type' });
  }

  return result.ok ? res.status(200).json(result) : res.status(400).json(result);
});

// POST /api/diplomacy/dissolve — break a treaty
router.post('/dissolve', (req: Request, res: Response) => {
  const { gameId, fromId, toId, treaty } = req.body as {
    gameId: string; fromId: string; toId: string;
    treaty: 'alliance';
  };
  if (!gameId || !fromId || !toId || !treaty)
    return res.status(400).json({ error: 'gameId, fromId, toId, treaty required' });

  const db = getDb();
  if (treaty === 'alliance') dissolveAlliance(db, gameId, fromId, toId);
  return res.status(200).json({ message: 'Treaty dissolved' });
});

// POST /api/diplomacy/mission — spend gold to boost opinion
router.post('/mission', (req: Request, res: Response) => {
  const { gameId, fromId, toId, goldSpent } = req.body as {
    gameId: string; fromId: string; toId: string; goldSpent: number;
  };
  if (!gameId || !fromId || !toId || goldSpent == null)
    return res.status(400).json({ error: 'gameId, fromId, toId, goldSpent required' });

  const db = getDb();
  const result = sendDiplomaticMission(db, gameId, fromId, toId, Number(goldSpent));
  return result.ok ? res.status(200).json(result) : res.status(400).json(result);
});

// POST /api/diplomacy/gift — send gold gift to boost opinion
router.post('/gift', (req: Request, res: Response) => {
  const { gameId, fromId, toId, goldAmount } = req.body as {
    gameId: string; fromId: string; toId: string; goldAmount: number;
  };
  if (!gameId || !fromId || !toId || goldAmount == null)
    return res.status(400).json({ error: 'gameId, fromId, toId, goldAmount required' });

  const db = getDb();
  const result = sendGift(db, gameId, fromId, toId, Number(goldAmount));
  return result.ok ? res.status(200).json(result) : res.status(400).json(result);
});

export default router;
