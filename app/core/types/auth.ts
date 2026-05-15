import { JWTPayload } from "jose";

export interface TokenPayload extends JWTPayload {
  userId: string;
  user_type: string;
  type: "access" | "refresh";
}
