import { Router, Request, Response } from 'express';
import { getDb } from '../db/database.js';
import type { IntrigueActionType } from '@pax-imperia/shared';
import { buildSpyNetwork, getNetworkStrength, listNetworks, counterIntelligence } from '../engine/spyNetwork.js';
import { queueIntrigueAction } from '../engine/intrigueEngine.js';
import { supportPretender } from '../engine/pretenderEngine.js';

const router = Router();

// GET /api/intrigue/shadow/:gameId/:sourceFactionId — shadow influence for a faction
router.get('/shadow/:gameId/:sourceFactionId', (req: Request, res: Response) => {
  const db = getDb();
  const rows = db
    .prepare('SELECT target_faction, influence FROM shadow_influence WHERE game_id = ? AND source_faction = ? ORDER BY influence DESC')
    .all(req.params.gameId, req.params.sourceFactionId) as { target_faction: string; influence: number }[];

  const PUPPET_THRESHOLD = 75;
  const result = rows.map((r) => ({
    targetFactionId: r.target_faction,
    influence: r.influence,
    isPuppet: r.influence >= PUPPET_THRESHOLD,
  }));
  return res.json(result);
});

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

// GET /api/intrigue/espionage/:gameId/:spyingFactionId/:targetFactionId
// Returns intelligence on target faction: troops, resources, active intrigue ops.
// Only available if the spying faction has at least one province of the target revealed.
router.get('/espionage/:gameId/:spyingFactionId/:targetFactionId', (req: Request, res: Response) => {
  const { gameId, spyingFactionId, targetFactionId } = req.params;
  const db = getDb();

  // Gate: target faction must have at least one revealed province
  const revealed = db
    .prepare('SELECT COUNT(*) as c FROM provinces WHERE game_id = ? AND owner_id = ? AND is_revealed = 1')
    .get(gameId, targetFactionId) as { c: number };
  if (revealed.c === 0)
    return res.status(403).json({ error: 'No intelligence on this faction — run a spy action first' });

  // Resources
  const faction = db
    .prepare('SELECT gold, food, manpower FROM factions WHERE game_id = ? AND id = ?')
    .get(gameId, targetFactionId) as { gold: number; food: number; manpower: number } | undefined;

  // Troop strength (sum of all units across all armies)
  const troops = db
    .prepare(
      `SELECT u.type, SUM(u.count) as total
       FROM units u JOIN armies a ON u.army_id = a.id AND u.game_id = a.game_id
       WHERE a.game_id = ? AND a.faction_id = ?
       GROUP BY u.type`,
    )
    .all(gameId, targetFactionId) as { type: string; total: number }[];

  // Active intrigue actions targeting the spying faction (counter-intel)
  const intrigueOps = db
    .prepare(
      `SELECT type, target_province_id, success_chance, status
       FROM intrigue_actions
       WHERE game_id = ? AND source_faction_id = ? AND status = 'pending'`,
    )
    .all(gameId, targetFactionId) as { type: string; target_province_id: string | null; success_chance: number; status: string }[];

  return res.json({
    targetFactionId,
    resources: faction ?? null,
    troopStrength: troops,
    activeIntrigueOps: intrigueOps,
  });
});

// POST /api/intrigue/pretender — back a pretender to trigger civil war in target faction
router.post('/pretender', (req: Request, res: Response) => {
  const { gameId, backerId, targetFactionId } = req.body as {
    gameId: string; backerId: string; targetFactionId: string;
  };
  if (!gameId || !backerId || !targetFactionId)
    return res.status(400).json({ error: 'gameId, backerId, targetFactionId required' });

  const db = getDb();
  const result = supportPretender(db, gameId, backerId, targetFactionId);
  return result.ok ? res.status(201).json(result) : res.status(400).json(result);
});

// POST /api/intrigue/counter-intel — sweep for enemy networks; optionally turn double agent
router.post('/counter-intel', (req: Request, res: Response) => {
  const { gameId, factionId, provinceId, doubleAgent } = req.body as {
    gameId: string; factionId: string; provinceId: string; doubleAgent?: boolean;
  };
  if (!gameId || !factionId || !provinceId)
    return res.status(400).json({ error: 'gameId, factionId, provinceId required' });

  const db = getDb();
  const result = counterIntelligence(db, gameId, factionId, provinceId, doubleAgent ?? false);
  return result.ok ? res.status(200).json(result) : res.status(400).json(result);
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
