import { Router, Request, Response } from 'express';
import { analyticsService } from '../services/analyticsService.js';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Track event (public - for page views)
router.post('/track', (req: Request, res: Response) => {
  try {
    const { eventType, metadata } = req.body;
    analyticsService.track({ eventType, metadata });
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Get stats (admin only)
router.get('/stats', authMiddleware, adminOnly, (_req: AuthRequest, res: Response) => {
  try {
    const stats = analyticsService.getStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export const analyticsRoutes = router;
