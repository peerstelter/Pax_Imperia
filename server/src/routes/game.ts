import { Router } from 'express';

const router = Router();

// GET /api/game/:id — load a game state
router.get('/:id', (_req, res) => {
  res.status(501).json({ error: 'Not implemented — Task 13' });
});

// POST /api/game — create a new game
router.post('/', (_req, res) => {
  res.status(501).json({ error: 'Not implemented — Task 7' });
});

// PUT /api/game/:id/turn — advance turn
router.put('/:id/turn', (_req, res) => {
  res.status(501).json({ error: 'Not implemented — Task 10' });
});

export default router;
