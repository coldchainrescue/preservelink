import { Router, Request, Response } from 'express';
import { cmsService } from '../services/cmsService.js';
import { authMiddleware, trueAdminOnly, AuthRequest } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// Get CMS config (public - needed for rendering)
router.get('/config', (_req: Request, res: Response) => {
  try {
    const config = cmsService.getConfig();
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch CMS config' });
  }
});

// Update full CMS config (True Admin only)
router.put('/config', authMiddleware, trueAdminOnly, (req: AuthRequest, res: Response) => {
  try {
    const config = cmsService.saveConfig(req.body);
    res.json({ message: 'CMS config updated', config });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update CMS config' });
  }
});

// Update global settings
router.put('/global', authMiddleware, trueAdminOnly, (req: AuthRequest, res: Response) => {
  try {
    const config = cmsService.updateGlobal(req.body);
    res.json({ message: 'Global settings updated', config });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update global settings' });
  }
});

// Update colors
router.put('/colors', authMiddleware, trueAdminOnly, (req: AuthRequest, res: Response) => {
  try {
    const config = cmsService.updateColors(req.body);
    res.json({ message: 'Colors updated', config });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update colors' });
  }
});

// Update page config
router.put('/page/:path', authMiddleware, trueAdminOnly, (req: AuthRequest, res: Response) => {
  try {
    const pagePath = '/' + req.params.path;
    const config = cmsService.updatePage(pagePath, req.body);
    res.json({ message: `Page ${pagePath} updated`, config });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update page' });
  }
});

// Upload logo
router.post('/upload-logo', authMiddleware, trueAdminOnly, upload.single('logo'), (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const logoUrl = `/uploads/${req.file.filename}`;
    cmsService.updateGlobal({ logoUrl });
    res.json({ message: 'Logo updated', logoUrl });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// Reset CMS to defaults
router.post('/reset', authMiddleware, trueAdminOnly, (_req: AuthRequest, res: Response) => {
  try {
    const config = cmsService.resetToDefault();
    res.json({ message: 'CMS reset to defaults', config });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reset CMS' });
  }
});

export const cmsRoutes = router;
