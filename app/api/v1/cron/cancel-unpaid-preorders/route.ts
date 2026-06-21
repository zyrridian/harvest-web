import { NextRequest } from "next/server";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { CancelPreOrderUseCase } from "@/features/preorder/application/usecases/cancel-preorder.usecase";
import { preOrderRepository } from "@/features/preorder/infrastructure/repositories/prisma-preorder.repository";

/**
 * @swagger
 * /api/v1/cron/cancel-unpaid-preorders:
 *   post:
 *     summary: Cancel unpaid preorder reservations
 *     description: Automatically cancels reservations that have been unpaid for over 24 hours. Intended to be called by a cron job.
 *     tags:
 *       - Cron
 *     responses:
 *       200:
 *         description: Cancellations processed
 */
export async function POST(request: NextRequest) {
  try {
    // Optionally verify a cron secret token here
    // const authHeader = request.headers.get("authorization");
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   throw new Error("Unauthorized");
    // }

    const useCase = new CancelPreOrderUseCase(preOrderRepository);
    const result = await useCase.executeCronCancellation();

    return successResponse(result, {
      message: "Unpaid preorders cancellation job completed",
    });
  } catch (error) {
    return handleRouteError(error, "CronCancelPreOrders");
  }
}
