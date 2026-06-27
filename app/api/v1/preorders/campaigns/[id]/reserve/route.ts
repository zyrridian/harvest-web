import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { parseBody } from "@/core/helpers/parseBody";
import { ReservePreOrderSchema } from "@/features/preorder/application/dtos/preorder.dto";
import { ReservePreOrderUseCase } from "@/features/preorder/application/usecases/reserve-preorder.usecase";
import { preOrderRepository } from "@/features/preorder/infrastructure/repositories/prisma-preorder.repository";

/**
 * @swagger
 * /api/v1/preorders/campaigns/{id}/reserve:
 *   post:
 *     summary: Reserve a pre-order
 *     description: Creates a new reservation for a preorder campaign
 *     tags:
 *       - Preorders
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
 *               delivery_method:
 *                 type: string
 *               address_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reservation created successfully
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const payload = await verifyAuth(request);
    
    const body = await parseBody(request);
    
    const resolvedParams = await context.params;
    // Merge id from path into body for validation
    const input = ReservePreOrderSchema.parse({ ...body, campaign_id: resolvedParams.id });

    const useCase = new ReservePreOrderUseCase(preOrderRepository);
    const result = await useCase.execute(payload.userId, input);

    return successResponse(result);
  } catch (error) {
    return handleRouteError(error, "ReservePreOrder");
  }
}
