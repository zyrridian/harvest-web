import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { parseBody } from "@/core/helpers/parseBody";
import { AddCartItemSchema } from "@/features/cart/application/dtos/cart.dto";
import { AddCartItemUseCase } from "@/features/cart/application/usecases/add-cart-item.usecase";
import { cartRepository } from "@/features/cart/infrastructure/repositories/prisma-cart.repository";

/**
 * @swagger
 * /api/v1/cart/items:
 *   post:
 *     summary: Add item to cart
 *     description: Adds a product to the user's cart
 *     tags:
 *       - Cart
 *     security:
 *       - BearerAuth: []
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
 *     responses:
 *       200:
 *         description: Cart item added successfully
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    
    const body = await parseBody(request);
    const input = AddCartItemSchema.parse(body);

    const useCase = new AddCartItemUseCase(cartRepository);
    const result = await useCase.execute(payload.userId, input);

    return successResponse(result);
  } catch (error) {
    return handleRouteError(error, "AddCartItem");
  }
}
