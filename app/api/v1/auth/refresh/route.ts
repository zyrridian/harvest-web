import { NextRequest } from "next/server";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { AUTH } from "@/core/config/constants";
import { RefreshTokenUseCase } from "@/features/auth/application/usecases/refresh-token.usecase";
import { authRepository } from "@/features/auth/infrastructure/repositories/prisma-auth.repository";

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Get a new access token using a valid refresh token
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refresh_token
 *             properties:
 *               refresh_token:
 *                 type: string
 *                 description: The refresh token received during login
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     access_token:
 *                       type: string
 *                     refresh_token:
 *                       type: string
 *                     token_type:
 *                       type: string
 *                       example: Bearer
 *                     expires_in:
 *                       type: integer
 *                       example: 3600
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let refreshTokenValue =
      body.refresh_token ?? request.cookies.get("refresh_token")?.value;

    if (!refreshTokenValue) {
      throw AppError.badRequest("Refresh token is required");
    }

    const useCase = new RefreshTokenUseCase(authRepository);
    const result = await useCase.execute(refreshTokenValue);

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
    return handleRouteError(error, "Token refresh");
  }
}
