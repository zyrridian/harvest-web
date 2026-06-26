import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { favoriteRepository } from "@/features/products/infrastructure/repositories/prisma-favorite.repository";
import { GetUserFavoritesUseCase } from "@/features/products/application/usecases/favorite.usecases";

/**
 * @swagger
 * /api/v1/users/favorites:
 *   get:
 *     summary: Get user's favorite products
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of favorite products
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    const userId = payload.userId as string;

    const useCase = new GetUserFavoritesUseCase(favoriteRepository);
    const result = await useCase.execute(userId);

    return successResponse(result.favorites);
  } catch (error) {
    return handleRouteError(error, "GetUserFavorites");
  }
}
