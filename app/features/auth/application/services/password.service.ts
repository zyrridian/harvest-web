import bcrypt from "bcryptjs";
import { AUTH } from "@/core/config/constants";

/**
 * Hash a password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, AUTH.BCRYPT_SALT_ROUNDS);
}

/**
 * Compare a password with its hash.
 */
export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
