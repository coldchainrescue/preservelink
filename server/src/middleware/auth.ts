import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { authService } from '../services/authService.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    fullName: string;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      fullName: decoded.fullName,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'true_admin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export function trueAdminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'true_admin') {
    return res.status(403).json({ error: 'True Admin access required' });
  }
  next();
}

// Requires the user to be fully verified (admin/true_admin always pass).
// Used to gate the contribution submission endpoint.
export async function verifiedOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  // Admins and true admins are always considered verified
  if (req.user.role === 'admin' || req.user.role === 'true_admin') {
    return next();
  }
  try {
    const user = await authService.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.verificationStatus !== 'verified') {
      return res.status(403).json({
        error: 'Your account is pending admin verification. You can search the catalogue but cannot contribute until an administrator has reviewed your APC.',
      });
    }
    next();
  } catch {
    return res.status(500).json({ error: 'Failed to check verification status' });
  }
}
