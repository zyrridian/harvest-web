import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { parseBody } from "@/core/helpers/parseBody";
import { PayDepositSchema } from "@/features/harvest-schedule/application/dtos/harvest-schedule.dto";
import { PayDepositUseCase } from "@/features/harvest-schedule/application/usecases/pay-deposit.usecase";
import { harvestScheduleRepository } from "@/features/harvest-schedule/infrastructure/repositories/prisma-harvest-schedule.repository";

/**
 * @swagger
 * /api/v1/harvest-schedule/pay-deposit:
 *   post:
 *     summary: Pay deposit for a harvest
 *     description: Confirms payment of deposit for a scheduled harvest
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
 *     responses:
 *       200:
 *         description: Deposit paid successfully
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    
    const body = await parseBody(request);
    const input = PayDepositSchema.parse(body);

    const useCase = new PayDepositUseCase(harvestScheduleRepository);
    const result = await useCase.execute(payload.userId, input);

    return successResponse(result, { message: "Deposit paid successfully" });
  } catch (error) {
    return handleRouteError(error, "PayDeposit");
  }
}
