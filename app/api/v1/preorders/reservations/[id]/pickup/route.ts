import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { parseBody } from "@/core/helpers/parseBody";
import { ArrangePickupSchema } from "@/features/harvest-schedule/application/dtos/harvest-schedule.dto";
import { ArrangePickupUseCase } from "@/features/harvest-schedule/application/usecases/arrange-pickup.usecase";
import { harvestScheduleRepository } from "@/features/harvest-schedule/infrastructure/repositories/prisma-harvest-schedule.repository";

/**
 * @swagger
 * /api/v1/preorders/reservations/{id}/pickup:
 *   post:
 *     summary: Arrange pickup for a reservation
 *     description: Sets the pickup time and arranges delivery method for a paid reservation
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
 *               pickup_time:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pickup arranged successfully
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const payload = await verifyAuth(request);
    
    const body = await parseBody(request);
    const resolvedParams = await context.params;
    
    const input = ArrangePickupSchema.parse({ ...body, harvest_id: resolvedParams.id });

    const useCase = new ArrangePickupUseCase(harvestScheduleRepository);
    const result = await useCase.execute(payload.userId, input);

    return successResponse(result, { message: "Pickup arranged successfully" });
  } catch (error) {
    return handleRouteError(error, "ArrangePickup");
  }
}
