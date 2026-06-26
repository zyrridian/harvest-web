import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { ToggleCartItemSelectionUseCase } from "@/features/cart/application/usecases/cart.usecases";
import { cartRepository } from "@/features/cart/infrastructure/repositories/prisma-cart.repository";

/**
 * @swagger
 * /api/v1/sales/cart/items/{id}/select:
 *   patch:
 *     summary: Toggle cart item selection for checkout
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_selected:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Item selection updated
 *       401:
 *         description: Unauthorized
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payload = await verifyAuth(request);
    const userId = payload.userId;

    const body = await request.json();
    const { is_selected } = body;

    const useCase = new ToggleCartItemSelectionUseCase(cartRepository);
    const result = await useCase.execute(userId, id, is_selected);

    return successResponse(result, { message: "Item selection updated" });
  } catch (error) {
    return handleRouteError(error, "Update cart item selection");
  }
}
