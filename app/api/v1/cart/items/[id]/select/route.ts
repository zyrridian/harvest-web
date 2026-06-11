import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";

/**
 * @swagger
 * /api/v1/cart/items/{id}/select:
 *   patch:
 *     summary: Toggle cart item selection for checkout
 *     tags: [Cart]
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

    if (is_selected === undefined) {
      throw AppError.badRequest("is_selected is required");
    }

    const cartItem = await prisma.cartItem.findUnique({
      where: { id },
      include: { cart: true },
    });

    if (!cartItem) {
      throw AppError.notFound("Cart item not found");
    }

    if (cartItem.cart.userId !== userId) {
      throw AppError.forbidden("Not authorized");
    }

    const updated = await prisma.cartItem.update({
      where: { id },
      data: { isSelected: is_selected },
    });

    const selectedItems = await prisma.cartItem.findMany({
      where: { cartId: cartItem.cartId, isSelected: true },
    });

    const selectedItemsTotal = selectedItems.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );

    return successResponse(
      {
        cart_item_id: updated.id,
        is_selected: updated.isSelected,
        selected_items_total: selectedItemsTotal,
      },
      { message: "Item selection updated" },
    );
  } catch (error) {
    return handleRouteError(error, "Update cart item selection");
  }
}
