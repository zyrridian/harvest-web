import { SignJWT, jwtVerify } from "jose";
import { TokenPayload } from "@/core/types/auth";
import { AUTH } from "@/core/config/constants";

/**
 * Get JWT secret from environment variables.
 */
const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
};

/**
 * Sign an access token (short-lived, 1 hour).
 */
export async function signAccessToken(
  userId: string,
  user_type: string,
): Promise<string> {
  return await new SignJWT({ userId, user_type, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(AUTH.ACCESS_TOKEN_EXPIRY)
    .sign(getSecret());
}

/**
 * Sign a refresh token (long-lived, 7 days).
 */
export async function signRefreshToken(
  userId: string,
  user_type: string,
): Promise<string> {
  return await new SignJWT({ userId, user_type, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(AUTH.REFRESH_TOKEN_EXPIRY)
    .sign(getSecret());
}

/**
 * Verify a JWT token and return the payload, or null if invalid.
 */
export async function verifyToken(
  token: string,
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Get refresh token expiry date (7 days from now).
 */
export function getRefreshTokenExpiry(): Date {
  const now = new Date();
  now.setDate(now.getDate() + AUTH.REFRESH_TOKEN_DAYS);
  return now;
}

/**
 * Extract bearer token from Authorization header.
 */
export function extractBearerToken(
  authHeader: string | null,
): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}
