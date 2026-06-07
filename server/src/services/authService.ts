import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';
import { TOKEN_EXPIRY } from '../config/constants.js';
import { dataPath } from '../paths.js';
import fs from 'fs';

const USERS_FILE = dataPath('demo-users.json');

function getUsers(): any[] {
  const data = fs.readFileSync(USERS_FILE, 'utf-8');
  return JSON.parse(data);
}

function saveUsers(users: any[]) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// 2FA codes store (in-memory for demo)
const twoFactorCodes = new Map<string, { code: string; expiresAt: number }>();

// Password reset tokens (in-memory, single-use, 5-min expiry)
const passwordResetTokens = new Map<string, { email: string; expiresAt: number }>();

export const authService = {
  async findUserByEmail(email: string) {
    const users = getUsers();
    return users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  },

  async findUserById(id: string) {
    const users = getUsers();
    return users.find((u: any) => u.id === id);
  },

  async createUser(data: {
    fullName: string;
    email: string;
    password: string;
    workingPlace: string;
    rphNumber: string;
  }) {
    const users = getUsers();
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const isTrueAdmin = data.email.toLowerCase() === env.TRUE_ADMIN_EMAIL.toLowerCase();
    const role = isTrueAdmin ? 'true_admin' : 'user';

    const newUser = {
      id: `user-${uuidv4().slice(0, 8)}`,
      fullName: data.fullName,
      email: data.email.toLowerCase(),
      password: hashedPassword,
      workingPlace: data.workingPlace,
      rphNumber: data.rphNumber,
      role,
      // True Admin is auto-verified; everyone else must be manually verified by an admin
      verificationStatus: isTrueAdmin ? 'verified' : 'pending_verification',
      apcFileUrl: '',
      apcOcrResult: null as null | { keywordFound: boolean; nameMatch: boolean; rphMatch: boolean; message: string },
      verificationRejectedReason: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveUsers(users);
    return newUser;
  },

  async verifyPassword(plainPassword: string, hashedPassword: string) {
    // For demo mode, also accept 'demo123' for the pre-seeded accounts
    if (env.DEMO_MODE && plainPassword === 'demo123') {
      return true;
    }
    return bcrypt.compare(plainPassword, hashedPassword);
  },

  generateTokens(user: any, rememberMe = false) {
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
      env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY.ACCESS }
    );
    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
      env.JWT_REFRESH_SECRET,
      { expiresIn: rememberMe ? TOKEN_EXPIRY.REFRESH_REMEMBER : TOKEN_EXPIRY.REFRESH }
    );
    return { accessToken, refreshToken };
  },

  verifyRefreshToken(token: string) {
    try {
      return jwt.verify(token, env.JWT_REFRESH_SECRET) as any;
    } catch {
      return null;
    }
  },

  generate2FACode(email: string): string {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    twoFactorCodes.set(email.toLowerCase(), {
      code,
      expiresAt: Date.now() + TOKEN_EXPIRY.TWO_FACTOR,
    });
    return code;
  },

  verify2FACode(email: string, code: string): boolean {
    // In demo mode, accept '000000' as universal code
    if (env.DEMO_MODE && code === '000000') return true;

    const stored = twoFactorCodes.get(email.toLowerCase());
    if (!stored) return false;
    if (Date.now() > stored.expiresAt) {
      twoFactorCodes.delete(email.toLowerCase());
      return false;
    }
    if (stored.code !== code) return false;
    twoFactorCodes.delete(email.toLowerCase());
    return true;
  },

  async updateUser(id: string, updates: Partial<any>) {
    const users = getUsers();
    const index = users.findIndex((u: any) => u.id === id);
    if (index === -1) return null;
    users[index] = { ...users[index], ...updates, updatedAt: new Date().toISOString() };
    saveUsers(users);
    return users[index];
  },

  async updatePassword(id: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return this.updateUser(id, { password: hashedPassword });
  },

  // --- Password reset ---
  generatePasswordResetToken(email: string): string {
    const token = uuidv4().replace(/-/g, '');
    passwordResetTokens.set(token, {
      email: email.toLowerCase(),
      expiresAt: Date.now() + TOKEN_EXPIRY.PASSWORD_RESET,
    });
    return token;
  },

  verifyPasswordResetToken(token: string): string | null {
    const stored = passwordResetTokens.get(token);
    if (!stored) return null;
    if (Date.now() > stored.expiresAt) {
      passwordResetTokens.delete(token);
      return null;
    }
    return stored.email;
  },

  consumePasswordResetToken(token: string): string | null {
    const email = this.verifyPasswordResetToken(token);
    if (email) passwordResetTokens.delete(token);
    return email;
  },

  async getAllUsers() {
    return getUsers().map((u: any) => {
      const { password, ...rest } = u;
      return rest;
    });
  },
};
