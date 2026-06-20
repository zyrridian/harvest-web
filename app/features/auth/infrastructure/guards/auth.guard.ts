import { NextRequest } from "next/server";
import { TokenPayload } from "@/core/types/auth";
import { AppError } from "@/core/errors";
import {
  extractBearerToken,
  verifyToken,
} from "@/features/auth/application/services/token.service";

/**
 * Verify authentication from a NextRequest.
 * Extracts the Bearer token, verifies it, and returns the payload.
 * Throws AppError(401) if the token is missing or invalid.
 */
export async function verifyAuth(request: NextRequest): Promise<TokenPayload> {
  const authHeader = request.headers.get("authorization");
  const token = extractBearerToken(authHeader);

  if (!token) {
    throw AppError.unauthorized("No token provided");
  }

  const payload = await verifyToken(token);

  if (!payload) {
    throw AppError.unauthorized("Invalid token");
  }

  return payload;
}

/**
 * Verify admin authentication from a NextRequest.
 * Ensures the user is authenticated AND has ADMIN role.
 * Throws AppError(401) if not authenticated, AppError(403) if not admin.
 */
export async function verifyAdmin(request: NextRequest): Promise<TokenPayload> {
  const payload = await verifyAuth(request);

  if (payload.user_type !== "ADMIN") {
    throw AppError.forbidden("Admin access required");
  }

  return payload;
}

/**
 * Optionally verify authentication from a NextRequest.
 * Returns the payload if valid, null otherwise without throwing an error.
 */
export async function getOptionalAuth(request: NextRequest): Promise<TokenPayload | null> {
  try {
    const authHeader = request.headers.get("authorization");
    const token = extractBearerToken(authHeader);

    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);
    return payload || null;
  } catch (error) {
    return null;
  }
}
