import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { GetCartUseCase, ClearCartUseCase } from "@/features/cart/application/usecases/cart.usecases";
import { cartRepository } from "@/features/cart/infrastructure/repositories/prisma-cart.repository";

/**
 * @swagger
 * /api/v1/sales/cart:
 *   get:
 *     summary: Get user's shopping cart
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shopping cart details
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    const userId = payload.userId;

    const useCase = new GetCartUseCase(cartRepository);
    const result = await useCase.execute(userId);

    return successResponse(result);
  } catch (error) {
    return handleRouteError(error, "Fetch cart");
  }
}

/**
 * @swagger
 * /api/v1/sales/cart:
 *   delete:
 *     summary: Clear entire cart
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 *       401:
 *         description: Unauthorized
 */
export async function DELETE(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);

    const useCase = new ClearCartUseCase(cartRepository);
    await useCase.execute(payload.userId);

    return successResponse(undefined, {
      message: "Cart cleared successfully",
    });
  } catch (error) {
    return handleRouteError(error, "Clear cart");
  }
}
