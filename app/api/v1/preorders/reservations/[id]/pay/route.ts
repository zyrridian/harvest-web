import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { parseBody } from "@/core/helpers/parseBody";
import { preOrderRepository } from "@/features/preorder/infrastructure/repositories/prisma-preorder.repository";

/**
 * @swagger
 * /api/v1/preorders/reservations/{id}/pay:
 *   post:
 *     summary: Pay for a reservation
 *     description: Pay the deposit or the remaining balance for a reservation
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
 *     responses:
 *       200:
 *         description: Payment processed successfully
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const payload = await verifyAuth(request);
    const body = await parseBody<any>(request);

    const resolvedParams = await context.params;
    const reservationId = resolvedParams.id;
    const paymentMethod = body.paymentMethod || "BANK_TRANSFER";

    const reservation = await preOrderRepository.findReservationById(reservationId);
    if (!reservation) throw new Error("Reservation not found");
    if (reservation.userId !== payload.userId) throw new Error("Unauthorized");

    let nextStatus = reservation.status;
    if (reservation.status === "PENDING_DEPOSIT") {
      nextStatus = "DEPOSIT_PAID";
    } else if (reservation.status === "DEPOSIT_PAID") {
      nextStatus = "FULLY_PAID";
    }

    const updated = await preOrderRepository.updateReservationStatus(reservationId, nextStatus, paymentMethod);

    return successResponse(updated);
  } catch (error) {
    return handleRouteError(error, "PayPreorderReservation");
  }
}
