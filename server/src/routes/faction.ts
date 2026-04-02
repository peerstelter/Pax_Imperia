import { Router } from 'express';

const router = Router();

// GET /api/faction/:gameId — list all factions in a game
router.get('/:gameId', (_req, res) => {
  res.status(501).json({ error: 'Not implemented — Task 9' });
});

// GET /api/faction/:gameId/:factionId — single faction
router.get('/:gameId/:factionId', (_req, res) => {
  res.status(501).json({ error: 'Not implemented — Task 9' });
});

export default router;
