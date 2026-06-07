export const ROLES = {
  USER: 'user' as const,
  ADMIN: 'admin' as const,
  TRUE_ADMIN: 'true_admin' as const,
};

export const VERIFICATION_STATUS = {
  PENDING: 'pending' as const,
  VERIFIED: 'verified' as const,
  REJECTED: 'rejected' as const,
};

export const CONTRIBUTION_STATUS = {
  PENDING: 'pending' as const,
  APPROVED: 'approved' as const,
  REJECTED: 'rejected' as const,
  AWAITING_REPLY: 'awaiting_reply' as const,
};

export const TOKEN_EXPIRY = {
  ACCESS: 15 * 60,          // 15 minutes in seconds
  REFRESH: 24 * 60 * 60,    // 24 hours in seconds
  REFRESH_REMEMBER: 30 * 24 * 60 * 60, // 30 days in seconds
  TWO_FACTOR: 5 * 60 * 1000, // 5 minutes in ms (for setTimeout)
  PASSWORD_RESET: 5 * 60 * 1000, // 5 minutes in ms
};

export const RATE_LIMITS = {
  AUTH: { windowMs: 15 * 60 * 1000, max: 10 },
  GENERAL: { windowMs: 60 * 1000, max: 100 },
};

export const FILE_LIMITS = {
  MAX_SIZE: 10 * 1024 * 1024,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
};
