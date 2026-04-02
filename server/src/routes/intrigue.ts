import { Router } from 'express';

const router = Router();

// GET /api/intrigue/:gameId — active intrigue actions
router.get('/:gameId', (_req, res) => {
  res.status(501).json({ error: 'Not implemented — Task 44' });
});

// POST /api/intrigue/action — perform an intrigue action
router.post('/action', (_req, res) => {
  res.status(501).json({ error: 'Not implemented — Task 45' });
});

export default router;
