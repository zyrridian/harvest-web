import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { UpdateCartItemUseCase, RemoveCartItemUseCase } from "@/features/cart/application/usecases/cart.usecases";
import { cartRepository } from "@/features/cart/infrastructure/repositories/prisma-cart.repository";

/**
 * @swagger
 * /api/v1/sales/cart/items/{id}:
 *   put:
 *     summary: Update cart item quantity or notes
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
 *               quantity:
 *                 type: integer
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cart item updated
 *       401:
 *         description: Unauthorized
 */
async function handleUpdate(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payload = await verifyAuth(request);
    const userId = payload.userId;

    const body = await request.json();
    const { quantity, notes } = body;

    const useCase = new UpdateCartItemUseCase(cartRepository);
    const result = await useCase.execute(userId, id, { quantity, notes });

    return successResponse(result, { message: "Cart item updated" });
  } catch (error) {
    return handleRouteError(error, "Update cart item");
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handleUpdate(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handleUpdate(request, context);
}

/**
 * @swagger
 * /api/v1/sales/cart/items/{id}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Sales]
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
 *         description: Item removed from cart
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
    const userId = payload.userId;

    const useCase = new RemoveCartItemUseCase(cartRepository);
    const result = await useCase.execute(userId, id);

    return successResponse(result, { message: "Item removed from cart" });
  } catch (error) {
    return handleRouteError(error, "Remove cart item");
  }
}
