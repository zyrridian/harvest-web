import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { GetOrderTrackingUseCase } from "@/features/sales/application/usecases/order.usecases";
import { orderRepository } from "@/features/sales/infrastructure/repositories/prisma-order.repository";

/**
 * @swagger
 * /api/v1/sales/orders/{id}/tracking:
 *   get:
 *     summary: Get live tracking information for an order
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
 *         description: Live tracking info with fuzzy logic handling
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payload = await verifyAuth(request);

    const useCase = new GetOrderTrackingUseCase(orderRepository);
    const result = await useCase.execute(payload.userId, id);

    return successResponse(result);
  } catch (error) {
    return handleRouteError(error, "Get order tracking");
  }
}
