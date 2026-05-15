import { NextRequest } from "next/server";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { verifyAuth } from "@/features/auth";
import { LogoutUseCase } from "@/features/auth/application/use-cases/logout.use-case";
import { authRepository } from "@/features/auth/infrastructure/repositories/prisma-auth.repository";

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout current user session
 *     description: Invalidate the current refresh token and end the session
 *     tags:
 *       - Authentication
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);

    const useCase = new LogoutUseCase(authRepository);
    await useCase.execute(payload.userId);

    const response = successResponse(undefined, { message: "Logged out successfully" });

    response.cookies.set("refresh_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    return handleRouteError(error, "Logout");
  }
}
