import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { favoriteRepository } from "@/features/products/infrastructure/repositories/prisma-favorite.repository";
import { 
  CheckFavoriteUseCase, 
  AddFavoriteUseCase, 
  RemoveFavoriteUseCase 
} from "@/features/products/application/usecases/favorite.usecases";

/**
 * @swagger
 * /api/v1/products/{id}/favorite:
 *   get:
 *     summary: Check if product is favorited
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Favorite status
 *       401:
 *         description: Unauthorized
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payload = await verifyAuth(request);
    const userId = payload.userId as string;

    const useCase = new CheckFavoriteUseCase(favoriteRepository);
    const result = await useCase.execute(userId, id);

    return successResponse(result);
  } catch (error) {
    return handleRouteError(error, "CheckFavorite");
  }
}

/**
 * @swagger
 * /api/v1/products/{id}/favorite:
 *   post:
 *     summary: Add product to favorites
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product added to favorites
 *       401:
 *         description: Unauthorized
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payload = await verifyAuth(request);
    const userId = payload.userId as string;

    const useCase = new AddFavoriteUseCase(favoriteRepository);
    const result = await useCase.execute(userId, id);

    return successResponse(result, { message: "Product added to favorites" });
  } catch (error) {
    return handleRouteError(error, "AddFavorite");
  }
}

/**
 * @swagger
 * /api/v1/products/{id}/favorite:
 *   delete:
 *     summary: Remove product from favorites
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product removed from favorites
 *       401:
 *         description: Unauthorized
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payload = await verifyAuth(request);
    const userId = payload.userId as string;

    const useCase = new RemoveFavoriteUseCase(favoriteRepository);
    const result = await useCase.execute(userId, id);

    return successResponse(result, { message: "Product removed from favorites" });
  } catch (error) {
    return handleRouteError(error, "RemoveFavorite");
  }
}
