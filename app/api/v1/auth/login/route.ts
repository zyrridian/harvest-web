import { NextRequest } from "next/server";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { parseBody } from "@/core/helpers/parseBody";
import { AUTH } from "@/core/config/constants";
import { LoginSchema } from "@/features/auth/validation/auth.schema";
import { LoginUseCase } from "@/features/auth/application/use-cases/login.use-case";
import { authRepository } from "@/features/auth/infrastructure/repositories/prisma-auth.repository";

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Authenticate user and get access token
 *     description: Login with email and password to receive JWT tokens
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request);
    const input = LoginSchema.parse(body);

    const useCase = new LoginUseCase(authRepository);
    const result = await useCase.execute(input);

    const response = successResponse(result);

    response.cookies.set("refresh_token", result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: AUTH.REFRESH_TOKEN_COOKIE_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error) {
    return handleRouteError(error, "Login");
  }
}
