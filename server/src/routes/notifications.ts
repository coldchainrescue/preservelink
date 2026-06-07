import { Router, Response } from 'express';
import { notificationService } from '../services/notificationService.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Get user's notifications
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const notifications = notificationService.getByUserId(req.user!.id);
    const unreadCount = notificationService.getUnreadCount(req.user!.id);
    res.json({ notifications, unreadCount });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/:id/read', (req: AuthRequest, res: Response) => {
  try {
    const notification = notificationService.markAsRead(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(notification);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Mark all as read
router.put('/read-all', (req: AuthRequest, res: Response) => {
  try {
    notificationService.markAllAsRead(req.user!.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

export const notificationRoutes = router;
