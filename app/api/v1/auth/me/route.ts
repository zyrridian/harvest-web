import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { GetCurrentUserUseCase } from "@/features/auth/application/usecases/get-current-user.usecase";
import { authRepository } from "@/features/auth/infrastructure/repositories/prisma-auth.repository";

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     description: Retrieve the currently logged in user's information
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    const useCase = new GetCurrentUserUseCase(authRepository);
    const user = await useCase.execute(payload.userId);
    return successResponse(user);
  } catch (error) {
    return handleRouteError(error, "Get me");
  }
}
