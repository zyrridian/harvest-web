import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";

/**
 * @swagger
 * /api/v1/cart/items:
 *   post:
 *     summary: Add item to cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               product_id:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product added to cart
 *       401:
 *         description: Unauthorized
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    const userId = payload.userId;

    const body = await request.json();
    const { product_id, quantity = 1, notes } = body;

    if (!product_id) {
      throw AppError.badRequest("Product ID is required");
    }

    if (quantity !== undefined && (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1)) {
      throw AppError.badRequest("Quantity must be a positive integer");
    }

    const product = await prisma.product.findUnique({
      where: { id: product_id },
      include: {
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
    });

    if (!product) {
      throw AppError.notFound("Product not found");
    }

    const activeDiscount = product.discounts[0];
    const discountPrice = activeDiscount
      ? activeDiscount.type === "percentage"
        ? product.price * (1 - activeDiscount.value / 100)
        : product.price - activeDiscount.value
      : null;
    const subtotal = (discountPrice || product.price) * quantity;

    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    const existingItem = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId: product_id } },
    });

    let cartItem;
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      const newSubtotal = (discountPrice || product.price) * newQuantity;
      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity, subtotal: newSubtotal, notes: notes || existingItem.notes },
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: { cartId: cart.id, productId: product_id, quantity, unitPrice: product.price, discountPrice, subtotal, notes },
      });
    }

    const allItems = await prisma.cartItem.findMany({ where: { cartId: cart.id } });
    const cartTotalItems = allItems.length;
    const cartGrandTotal = allItems.reduce((sum, item) => sum + item.subtotal, 0);

    return successResponse(
      {
        cart_item_id: cartItem.id,
        product_id: cartItem.productId,
        quantity: cartItem.quantity,
        subtotal: cartItem.subtotal,
        cart_total_items: cartTotalItems,
        cart_grand_total: cartGrandTotal,
      },
      { message: "Product added to cart", status: 201 },
    );
  } catch (error) {
    return handleRouteError(error, "Add to cart");
  }
}
