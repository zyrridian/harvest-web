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
 * /api/v1/preorders/reserve:
 *   post:
 *     summary: Reserve a pre-order
 *     description: Creates a new reservation for a harvest product
 *     tags:
 *       - PreOrder
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               harvest_id:
 *                 type: string
 *               quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Reservation created successfully
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    
    const body = await parseBody(request);
    const input = ReservePreOrderSchema.parse(body);

    const useCase = new ReservePreOrderUseCase(preOrderRepository);
    const result = await useCase.execute(payload.userId, input);

    return successResponse(result);
  } catch (error) {
    return handleRouteError(error, "ReservePreOrder");
  }
}
