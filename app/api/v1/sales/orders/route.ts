import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { parsePagination } from "@/core/helpers/pagination";
import { GetOrdersUseCase, CreateOrderUseCase } from "@/features/sales/application/usecases/order.usecases";
import { orderRepository } from "@/features/sales/infrastructure/repositories/prisma-order.repository";

/**
 * @swagger
 * /api/v1/sales/orders:
 *   get:
 *     summary: Get user's orders list (Paginated)
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [buyer, seller]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of orders with pagination metadata
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    const userId = payload.userId;

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") || "buyer";
    const status = searchParams.get("status");
    const { page, limit, skip } = parsePagination(searchParams);

    const useCase = new GetOrdersUseCase(orderRepository);
    const result = await useCase.execute(userId, role, status, page, limit, skip);

    return successResponse(result);
  } catch (error) {
    return handleRouteError(error, "Fetch orders");
  }
}

/**
 * @swagger
 * /api/v1/sales/orders:
 *   post:
 *     summary: Create new order(s) from cart items
 *     description: Groups cart items by seller and creates separate orders. Generates Midtrans payment token if applicable.
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cart_item_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               delivery_address_id:
 *                 type: string
 *               delivery_method:
 *                 type: string
 *               delivery_fee:
 *                 type: number
 *               delivery_date:
 *                 type: string
 *               delivery_time_slot:
 *                 type: string
 *               payment_method:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created successfully with payment instructions
 *       401:
 *         description: Unauthorized
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    const userId = payload.userId;

    const body = await request.json();

    const useCase = new CreateOrderUseCase(orderRepository);
    const result = await useCase.execute(userId, body);

    return successResponse(
      result,
      { message: "Order created successfully", status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, "Create order");
  }
}
