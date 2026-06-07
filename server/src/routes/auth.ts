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
      // Best-effort email; in demo mode this only logs
      emailService.sendNotification(
        admin.email,
        'New Registration — Verification Required',
        `${user.fullName} (${user.email}, RPh ${user.rphNumber}) has registered. Please review their APC and verify the account.`,
      ).catch(() => {});
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
    // APC file is now ALWAYS required (in both demo and production mode).
    if (!req.file) {
      return res.status(400).json({ error: 'You must upload your Annual Practising Certificate (APC) file.' });
    }

    // Check if user exists
    const existing = await authService.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Run OCR / heuristic check on the uploaded APC
    const fileBuffer = req.file.buffer || (await import('fs')).readFileSync(req.file.path);
    const ocrResult = await ocrService.verifyAPC(fileBuffer, fullName, rphNumber, req.file.originalname);

    // In production mode, if the file does not contain the phrase
    // "Annual Practising Certificate", reject registration outright. In demo
    // mode we record the heuristic result and let the admin make the final call.
    if (!env.DEMO_MODE && !ocrResult.keywordFound) {
      return res.status(400).json({
        error: 'The uploaded file does not appear to be a valid Annual Practising Certificate (the phrase "Annual Practising Certificate" was not detected). Please upload your actual APC.',
      });
    }

    // Create user (always pending_verification — admin must review)
    const user = await authService.createUser({ fullName, email, password, workingPlace, rphNumber });

    // Save APC file reference and OCR result on user record
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

    // Notify all admins to review this new registration
    await notifyAdminsOfNewRegistration({ ...user, apcFileUrl: req.file.filename });

    // In demo mode, skip 2FA and return tokens directly so the user can log in
    // and use the search immediately (they cannot contribute until verified).
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

    // Production mode: still send 2FA code (login will check verificationStatus)
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
    const { email, password, rememberMe } = req.body;

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

    // Reject login if the admin has explicitly rejected the account.
    if (user.verificationStatus === 'rejected') {
      return res.status(403).json({
        error: `Your account verification was rejected${user.verificationRejectedReason ? `: ${user.verificationRejectedReason}` : '.'} Please contact the administrator.`,
      });
    }
    // Pending users CAN log in — they will be able to search but the
    // verifiedOnly middleware will block them from contributing.

    analyticsService.track({ eventType: 'login', userId: user.id, metadata: { email } });

    // In demo mode, skip 2FA
    if (env.DEMO_MODE) {
      const tokens = authService.generateTokens(user, rememberMe);
      const { password: _, ...safeUser } = user;
      return res.json({ user: safeUser, ...tokens });
    }

    // Send 2FA code
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

// Logout (client-side token removal, this is a placeholder)
router.post('/logout', (_req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

// --- Password Reset ---
// Request reset link
router.post('/forgot-password', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await authService.findUserByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }

    // Generate and email the reset link
    const token = authService.generatePasswordResetToken(email);
    const resetLink = `${env.CLIENT_URL}/reset-password?token=${token}`;

    await emailService.sendPasswordResetEmail(email, resetLink);

    analyticsService.track({
      eventType: 'password_reset_request',
      userId: user.id,
      metadata: { email },
    });

    res.json({
      message: 'If an account exists with this email, a password reset link has been sent. The link is valid for 5 minutes.',
      // In demo mode also return the link directly so it works without SMTP
      ...(env.DEMO_MODE && { demoResetLink: resetLink }),
    });
  } catch (error: any) {
    console.error('[Forgot Password Error]', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Verify a reset token (used by the frontend before showing the form)
router.get('/reset-password/verify', (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ valid: false, error: 'Token is required' });
    }
    const email = authService.verifyPasswordResetToken(token);
    if (!email) {
      return res.status(400).json({ valid: false, error: 'This reset link is invalid or has expired (links are valid for 5 minutes only).' });
    }
    res.json({ valid: true, email });
  } catch (error: any) {
    res.status(500).json({ valid: false, error: 'Failed to verify token' });
  }
});

// Submit new password
router.post('/reset-password', authLimiter, async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Consume the token (single-use)
    const email = authService.consumePasswordResetToken(token);
    if (!email) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired (links are valid for 5 minutes only). Please request a new one.' });
    }

    const user = await authService.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await authService.updatePassword(user.id, newPassword);

    analyticsService.track({
      eventType: 'password_reset_complete',
      userId: user.id,
      metadata: { email },
    });

    res.json({ message: 'Password has been reset successfully. You can now sign in with your new password.' });
  } catch (error: any) {
    console.error('[Reset Password Error]', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export const authRoutes = router;
