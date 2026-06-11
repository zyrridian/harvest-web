import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";

/**
 * @swagger
 * /api/v1/cart/items/{id}:
 *   put:
 *     summary: Update cart item quantity or notes
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

    if (
      quantity !== undefined &&
      (typeof quantity !== "number" ||
        !Number.isInteger(quantity) ||
        quantity < 1)
    ) {
      throw AppError.badRequest("Quantity must be a positive integer");
    }

    const cartItem = await prisma.cartItem.findUnique({
      where: { id },
      include: {
        cart: true,
        product: {
          select: {
            id: true,
            price: true,
            stockQuantity: true,
            minimumOrder: true,
            maximumOrder: true,
            discounts: {
              where: {
                isActive: true,
                validFrom: { lte: new Date() },
                validUntil: { gte: new Date() },
              },
              take: 1,
              orderBy: { value: "desc" },
            },
          },
        },
      },
    });

    if (!cartItem) {
      throw AppError.notFound("Cart item not found");
    }

    if (cartItem.cart.userId !== userId) {
      throw AppError.forbidden("Not authorized");
    }

    if (quantity !== undefined) {
      // Validate against product constraints
      if (quantity < cartItem.product.minimumOrder) {
        throw AppError.badRequest(
          `Minimum order for this product is ${cartItem.product.minimumOrder}`,
        );
      }
      if (quantity > cartItem.product.maximumOrder) {
        throw AppError.badRequest(
          `Maximum order for this product is ${cartItem.product.maximumOrder}`,
        );
      }
      if (quantity > cartItem.product.stockQuantity) {
        throw AppError.badRequest(
          `Only ${cartItem.product.stockQuantity} items left in stock`,
        );
      }
    }

    let newSubtotal = cartItem.subtotal;
    if (quantity !== undefined) {
      const activeDiscount = cartItem.product.discounts[0];
      const price = activeDiscount
        ? activeDiscount.type === "percentage"
          ? cartItem.product.price * (1 - activeDiscount.value / 100)
          : cartItem.product.price - activeDiscount.value
        : cartItem.product.price;
      newSubtotal = price * quantity;
    }

    const updated = await prisma.cartItem.update({
      where: { id },
      data: {
        ...(quantity !== undefined && { quantity, subtotal: newSubtotal }),
        ...(notes !== undefined && { notes }),
      },
    });

    // Update Cart updatedAt
    await prisma.cart.update({
      where: { id: cartItem.cartId },
      data: { updatedAt: new Date() },
    });

    const allItems = await prisma.cartItem.findMany({
      where: { cartId: cartItem.cartId },
    });
    const cartTotalItems = allItems.length;
    const cartGrandTotal = allItems.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );

    return successResponse(
      {
        cart_item_id: updated.id,
        quantity: updated.quantity,
        subtotal: updated.subtotal,
        cart_total_items: cartTotalItems,
        cart_grand_total: cartGrandTotal,
      },
      { message: "Cart item updated" },
    );
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
 * /api/v1/cart/items/{id}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Cart]
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

    await prisma.cartItem.delete({ where: { id } });

    const remainingItems = await prisma.cartItem.findMany({
      where: { cartId: cartItem.cartId },
    });
    const cartTotalItems = remainingItems.length;
    const cartGrandTotal = remainingItems.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );

    return successResponse(
      { cart_total_items: cartTotalItems, cart_grand_total: cartGrandTotal },
      { message: "Item removed from cart" },
    );
  } catch (error) {
    return handleRouteError(error, "Remove cart item");
  }
}
