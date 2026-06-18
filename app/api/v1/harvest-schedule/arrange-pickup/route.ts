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
 * /api/v1/harvest-schedule/arrange-pickup:
 *   post:
 *     summary: Arrange pickup for a harvest
 *     description: Sets the pickup time and arranges delivery method for a paid harvest
 *     tags:
 *       - HarvestSchedule
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
 *               pickup_time:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pickup arranged successfully
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    
    const body = await parseBody(request);
    const input = ArrangePickupSchema.parse(body);

    const useCase = new ArrangePickupUseCase(harvestScheduleRepository);
    const result = await useCase.execute(payload.userId, input);

    return successResponse(result, { message: "Pickup arranged successfully" });
  } catch (error) {
    return handleRouteError(error, "ArrangePickup");
  }
}
