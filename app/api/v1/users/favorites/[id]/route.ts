import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { favoriteRepository } from "@/features/products/infrastructure/repositories/prisma-favorite.repository";
import { RemoveFavoriteByIdUseCase } from "@/features/products/application/usecases/favorite.usecases";

/**
 * @swagger
 * /api/v1/users/favorites/{id}:
 *   delete:
 *     summary: Remove a favorite
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Favorite ID
 *     responses:
 *       200:
 *         description: Favorite removed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Favorite not found
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payload = await verifyAuth(request);
    const userId = payload.userId as string;

    const useCase = new RemoveFavoriteByIdUseCase(favoriteRepository);
    await useCase.execute(userId, id);

    return successResponse(null, { message: "Favorite removed" });
  } catch (error) {
    return handleRouteError(error, "RemoveFavoriteById");
  }
}
