import { Router } from 'express';

const router = Router();

// GET /api/diplomacy/:gameId — all diplomatic relations
router.get('/:gameId', (_req, res) => {
  res.status(501).json({ error: 'Not implemented — Task 31' });
});

// POST /api/diplomacy/offer — send a diplomatic offer
router.post('/offer', (_req, res) => {
  res.status(501).json({ error: 'Not implemented — Task 33' });
});

export default router;
