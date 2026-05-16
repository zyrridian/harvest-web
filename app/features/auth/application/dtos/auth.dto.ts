import { UserDTO } from "../../domain/entities/user.entity";

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface LoginInputDTO {
  email: string;
  password: string;
}

export interface RegisterInputDTO {
  email: string;
  password: string;
  name: string;
  phone_number?: string | null;
  user_type: string;
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

export interface AuthResponseDTO {
  user: UserDTO;
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
}

export interface TokenRefreshResponseDTO {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
}

export interface RefreshTokenCookieOptions {
  token: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  maxAge: number;
  path: string;
}
