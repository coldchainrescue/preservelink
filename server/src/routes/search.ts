import { Router, Request, Response } from 'express';
import { searchService } from '../services/searchService.js';
import { analyticsService } from '../services/analyticsService.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get categories (public - for dropdown). Pulled live from the Google Sheet.
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await searchService.getCategories();
    res.json(categories);
  } catch (error: any) {
    console.error('[Search] categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Autocomplete suggestions — pulls from Catalogue Columns B (product),
// H (active_ingredient), I (generic_name) plus approved contributions.
router.get('/autocomplete', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    if (!query || query.length < 1) {
      return res.json([]);
    }
    const suggestions = await searchService.autocomplete(query);
    res.json(suggestions);
  } catch (error: any) {
    console.error('[Search] autocomplete error:', error);
    res.status(500).json({ error: 'Autocomplete failed' });
  }
});

// Main search
router.post('/query', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { medicineName, category, temperature, duration, durationUnit } = req.body;

    if (!medicineName || temperature === undefined || !duration || !durationUnit) {
      return res.status(400).json({ error: 'Medicine name, temperature, duration, and duration unit are required' });
    }

    const result = await searchService.search({
      medicineName,
      category,
      temperature: parseFloat(temperature),
      duration: parseFloat(duration),
      durationUnit,
    });

    if (!result) {
      return res.status(404).json({
        error: 'No matching medicine found in the Catalogue. Please check the spelling or try a different search term.',
      });
    }

    analyticsService.track({
      eventType: 'search',
      userId: req.user?.id,
      metadata: { medicineName, category, temperature, duration, durationUnit, verdict: result.verdict },
    });

    res.json(result);
  } catch (error: any) {
    console.error('[Search Error]', error);
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

export const searchRoutes = router;
