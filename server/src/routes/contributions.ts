import { Router, Response } from 'express';
import { contributionService } from '../services/contributionService.js';
import { analyticsService } from '../services/analyticsService.js';
import { authMiddleware, verifiedOnly, AuthRequest } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// Get user's own contributions
router.get('/my', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const contributions = contributionService.getByUserId(req.user!.id);
    res.json(contributions);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch contributions' });
  }
});

// Submit new contribution (verified users only)
router.post('/', authMiddleware, verifiedOnly, upload.array('attachments', 5), async (req: AuthRequest, res: Response) => {
  try {
    const {
      genericName, strength, brandName, manufacturer,
      category, mktAvailable, mktDetails, stabilityStatements, declaration
    } = req.body;

    if (!genericName || !strength || !brandName || !manufacturer || !category) {
      return res.status(400).json({ error: 'All required fields must be filled' });
    }

    if (!declaration || declaration === 'false') {
      return res.status(400).json({ error: 'You must accept the declaration' });
    }

    const files = req.files as Express.Multer.File[];
    const attachmentUrls = files ? files.map((f) => `/uploads/${f.filename}`) : [];

    let parsedStatements = [];
    try {
      parsedStatements = typeof stabilityStatements === 'string'
        ? JSON.parse(stabilityStatements)
        : stabilityStatements || [];
    } catch {
      parsedStatements = [];
    }

    const contribution = contributionService.create({
      userId: req.user!.id,
      contributorName: req.user!.fullName,
      genericName,
      strength,
      brandName,
      manufacturer,
      category,
      mktAvailable: mktAvailable === 'true' || mktAvailable === true,
      mktDetails: mktDetails || undefined,
      stabilityStatements: parsedStatements,
      attachmentUrls,
    });

    analyticsService.track({
      eventType: 'contribution',
      userId: req.user!.id,
      metadata: { genericName, brandName, manufacturer },
    });

    res.status(201).json({ message: 'Contribution submitted successfully', contribution });
  } catch (error: any) {
    console.error('[Contribution Error]', error);
    res.status(500).json({ error: 'Failed to submit contribution' });
  }
});

// Respond to admin comment (works for any non-approved submission with an
// adminComment — typically `awaiting_reply`, but also `rejected` so the user
// can dispute the decision).
router.post('/:id/respond', authMiddleware, upload.single('attachment'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    if (!response || !String(response).trim()) {
      return res.status(400).json({ error: 'Response text is required' });
    }

    const contribution = contributionService.getById(id);
    if (!contribution) {
      return res.status(404).json({ error: 'Contribution not found' });
    }
    if (contribution.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (contribution.status === 'approved') {
      return res.status(400).json({ error: 'This submission has already been approved.' });
    }
    if (!contribution.adminComment) {
      return res.status(400).json({ error: 'There is no admin comment to reply to.' });
    }

    const attachmentUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const updated = contributionService.addUserResponse(id, response, attachmentUrl);

    res.json({ message: 'Response submitted successfully', contribution: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to submit response' });
  }
});

export const contributionRoutes = router;
