import { Router } from 'express';

const router = Router();

// POST /api/combat/resolve — resolve a field or siege battle
router.post('/resolve', (_req, res) => {
  res.status(501).json({ error: 'Not implemented — Task 19' });
});

// POST /api/combat/declare — declare war
router.post('/declare', (_req, res) => {
  res.status(501).json({ error: 'Not implemented — Task 22' });
});

export default router;
