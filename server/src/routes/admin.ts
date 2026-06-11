import { Router, Response } from 'express';
import { contributionService } from '../services/contributionService.js';
import { searchService } from '../services/searchService.js';
import { authService } from '../services/authService.js';
import { emailService } from '../services/emailService.js';
import { notificationService } from '../services/notificationService.js';
import { authMiddleware, adminOnly, trueAdminOnly, AuthRequest } from '../middleware/auth.js';
import { broadcastEvent } from '../index.js';
import bcrypt from 'bcryptjs';

const router = Router();

// All admin routes require auth + admin role
router.use(authMiddleware);
router.use(adminOnly);

// Get all submissions
router.get('/submissions', (_req: AuthRequest, res: Response) => {
  try {
    const contributions = contributionService.getAll();
    res.json(contributions);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// Update submission status (approve / reject / awaiting_reply)
router.put('/submissions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;

    if (!['approved', 'rejected', 'awaiting_reply'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const contribution = contributionService.updateStatus(id, status, comment, req.user!.id);
    if (!contribution) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (status === 'approved') {
      const contributorUser = await authService.findUserById(contribution.userId);
      const stabilityStatementText = contribution.stabilityStatements && contribution.stabilityStatements.length > 0
        ? contribution.stabilityStatements
            .map((s: any) =>
              `According to ${s.manufacturer}, if ${s.drugName} is stored at ${s.temperature}°C for ${s.duration} ${s.durationUnit}, the stability is for ${s.stabilityPeriod} ${s.stabilityUnit}.`
            )
            .join(' | ')
        : '';

      const writeResult = await searchService.addApprovedContribution({
        genericName: contribution.genericName,
        brandName: contribution.brandName,
        strength: contribution.strength,
        manufacturer: contribution.manufacturer,
        category: contribution.category,
        mktAvailable: contribution.mktAvailable,
        mktDetails: contribution.mktDetails,
        stabilityStatement: stabilityStatementText,
        stabilityStatements: contribution.stabilityStatements,
        contributorName: contribution.contributorName,
        contributorEmail: contributorUser?.email || '',
        approvedAt: new Date().toISOString(),
        approvedBy: req.user!.id,
      });
      console.log('[Approval]', writeResult.message);
    }

    // Notify the contributor by email
    const user = await authService.findUserById(contribution.userId);
    if (user) {
      const subject = status === 'approved'
        ? 'Your Submission Has Been Approved'
        : status === 'rejected'
          ? 'Your Submission Has Been Reviewed'
          : 'Action Required on Your Submission';
      const message = status === 'approved'
        ? `Your submission for ${contribution.genericName} (${contribution.brandName}) has been approved and published to the database.`
        : status === 'rejected'
          ? `Your submission for ${contribution.genericName} has been reviewed but could not be approved. ${comment ? `Reason: ${comment}` : ''}`
          : `We need additional information regarding your submission for ${contribution.genericName}. ${comment ? `Comment: ${comment}` : ''} Please respond through your dashboard.`;
      await emailService.sendNotification(user.email, subject, message);

      // ── SSE: push live update to the contributor ──────────────────────────
      broadcastEvent('CONTRIBUTION_UPDATED', {
        contributionId: id,
        status,
        genericName: contribution.genericName,
      }, contribution.userId);
    }

    res.json({ message: `Submission ${status}`, contribution });
  } catch (error: any) {
    console.error('[Admin Error]', error);
    res.status(500).json({ error: 'Failed to update submission' });
  }
});

// List users pending verification
router.get('/pending-users', async (_req: AuthRequest, res: Response) => {
  try {
    const allUsers = await authService.getAllUsers();
    const pending = allUsers.filter((u: any) => u.verificationStatus === 'pending_verification');
    res.json(pending);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch pending users' });
  }
});

// Verify a user (approve their APC)
router.put('/users/:id/verify', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await authService.findUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.verificationStatus === 'verified') {
      return res.status(400).json({ error: 'User is already verified' });
    }
    await authService.updateUser(id, {
      verificationStatus: 'verified',
      verificationRejectedReason: '',
      verifiedAt: new Date().toISOString(),
      verifiedBy: req.user!.id,
    });

    notificationService.create({
      userId: id,
      title: 'Your Account Has Been Verified',
      message: 'An administrator has reviewed your APC and verified your account. You can now contribute stability data.',
      type: 'success',
      link: '/contribute',
    });
    emailService.sendNotification(
      user.email,
      'Your PreserveLink Account Has Been Verified',
      'An administrator has reviewed your APC and verified your account. You can now contribute stability data on PreserveLink.',
    ).catch(() => {});

    // ── SSE: tell the user their account is now verified ─────────────────────
    broadcastEvent('ROLE_CHANGED', {
      userId: id,
      newRole: user.role,
      verificationStatus: 'verified',
    }, id);

    res.json({ message: 'User verified successfully' });
  } catch (error: any) {
    console.error('[Verify User Error]', error);
    res.status(500).json({ error: 'Failed to verify user' });
  }
});

// Reject user verification
router.put('/users/:id/reject-verification', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: 'A rejection reason is required' });
    }
    const user = await authService.findUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    await authService.updateUser(id, {
      verificationStatus: 'rejected',
      verificationRejectedReason: String(reason),
      rejectedAt: new Date().toISOString(),
      rejectedBy: req.user!.id,
    });

    emailService.sendNotification(
      user.email,
      'Your PreserveLink Registration Has Been Rejected',
      `Your account verification was rejected. Reason: ${reason}. Please contact the administrator if you believe this is in error.`,
    ).catch(() => {});

    res.json({ message: 'User verification rejected' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reject user verification' });
  }
});

// Get all users (True Admin only)
router.get('/users', trueAdminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const users = await authService.getAllUsers();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user role (True Admin only)
router.put('/users/:id/role', trueAdminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Can only set user or admin.' });
    }

    const user = await authService.findUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.role === 'true_admin') {
      return res.status(403).json({ error: 'Cannot change True Admin role' });
    }

    await authService.updateUser(id, { role });

    // ── SSE: tell the affected user their role changed ────────────────────────
    broadcastEvent('ROLE_CHANGED', { userId: id, newRole: role }, id);

    res.json({ message: `User role updated to ${role}` });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Manual password reset (True Admin only)
router.post('/reset-password', trueAdminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'userId and newPassword (min 8 chars) required' });
    }

    const user = await authService.findUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'true_admin') {
      return res.status(403).json({ error: 'Cannot reset True Admin password this way' });
    }

    await authService.updatePassword(userId, newPassword);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export const adminRoutes = router;
