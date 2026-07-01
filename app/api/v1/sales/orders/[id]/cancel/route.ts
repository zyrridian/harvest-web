import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { CancelOrderUseCase } from "@/features/sales/application/usecases/order.usecases";
import { orderRepository } from "@/features/sales/infrastructure/repositories/prisma-order.repository";

/**
 * @swagger
 * /api/v1/sales/orders/{id}/cancel:
 *   patch:
 *     summary: Cancel an order
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
 *               reason:
 *                 type: string
 *               details:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *       400:
 *         description: Order cannot be cancelled
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Order not found
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payload = await verifyAuth(request);
    
    const body = await request.json();
    const { reason, details } = body;

    const useCase = new CancelOrderUseCase(orderRepository);
    const result = await useCase.execute(payload.userId, id, reason, details);

    return successResponse(
      result,
      { message: "Order cancelled successfully" }
    );
  } catch (error) {
    return handleRouteError(error, "Cancel order");
  }
}
