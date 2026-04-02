import { Router } from 'express';

const router = Router();

// GET /api/province/:gameId — list all provinces
router.get('/:gameId', (_req, res) => {
  res.status(501).json({ error: 'Not implemented — Task 5' });
});

// GET /api/province/:gameId/:provinceId — single province detail
router.get('/:gameId/:provinceId', (_req, res) => {
  res.status(501).json({ error: 'Not implemented — Task 8' });
});

export default router;
