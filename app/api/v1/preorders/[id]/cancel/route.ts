import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { CancelPreOrderUseCase } from "@/features/preorder/application/usecases/cancel-preorder.usecase";
import { preOrderRepository } from "@/features/preorder/infrastructure/repositories/prisma-preorder.repository";

/**
 * @swagger
 * /api/v1/preorders/{id}/cancel:
 *   post:
 *     summary: Cancel a preorder reservation
 *     description: Cancels a preorder if it is more than 7 days before harvest.
 *     tags:
 *       - PreOrder
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reservation cancelled successfully
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const payload = await verifyAuth(request);

    const useCase = new CancelPreOrderUseCase(preOrderRepository);
    await useCase.executeUserCancellation(payload.userId, params.id);

    return successResponse({
      success: true,
      message: "Reservation cancelled successfully",
    });
  } catch (error) {
    return handleRouteError(error, "UserCancelPreOrder");
  }
}
