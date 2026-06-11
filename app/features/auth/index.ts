// Barrel re-export — keeps `import { ... } from "@/features/auth"` working
export {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  getRefreshTokenExpiry,
  extractBearerToken,
} from "./application/services/token.service";

export {
  hashPassword,
  comparePassword,
} from "./application/services/password.service";

export { verifyAuth, verifyAdmin } from "./infrastructure/guards/auth.guard";

// Re-export the TokenPayload type for convenience
export type { TokenPayload } from "@/core/types/auth";
