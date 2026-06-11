// ============================================
// Business Constants
// ============================================

export const BUSINESS = {
  DELIVERY_FEE: 15000,
  SERVICE_FEE: 2000,
  FREE_DELIVERY_THRESHOLD: 100000,
  CURRENCY: "IDR",
} as const;

// ============================================
// Auth Constants
// ============================================

export const AUTH = {
  ACCESS_TOKEN_EXPIRY: "1h",
  REFRESH_TOKEN_EXPIRY: "7d",
  REFRESH_TOKEN_DAYS: 7,
  REFRESH_TOKEN_COOKIE_MAX_AGE: 7 * 24 * 60 * 60, // 7 days in seconds
  BCRYPT_SALT_ROUNDS: 12,
  ACCESS_TOKEN_EXPIRES_IN: 3600, // 1 hour in seconds
  VALID_REGISTRATION_TYPES: ["CONSUMER", "PRODUCER"] as const,
} as const;

// ============================================
// Pagination Defaults
// ============================================

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
