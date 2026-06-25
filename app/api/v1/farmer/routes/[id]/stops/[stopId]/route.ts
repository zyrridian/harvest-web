import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";

// PATCH /api/v1/farmer/routes/[id]/stops/[stopId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stopId: string }> },
) {
  try {
    const { id, stopId } = await params;
    const payload = await verifyAuth(request);
    const farmer = await prisma.farmer.findUnique({
      where: { userId: payload.userId },
    });
    if (!farmer) throw AppError.notFound("Farmer profile not found");

    const route = await prisma.deliveryRoute.findFirst({
      where: { id, farmerId: farmer.id },
    });
    if (!route) throw AppError.notFound("Route not found");

    const body = await request.json();
    const { status, notes } = body;

    if (!status || !["delivered", "failed"].includes(status)) {
      throw AppError.badRequest("Valid status (delivered, failed) is required");
    }

    // Update stop status
    const stop = await prisma.routeStop.update({
      where: { id: stopId, routeId: id },
      data: {
        status,
        ...(notes && { notes }),
        ...(status === "delivered" && { actualArrival: new Date() }),
      },
      include: { order: true },
    });

    // If stop delivered, update the main order status to delivered
    if (status === "delivered") {
      const isCOD = stop.order.paymentMethod === "cod";
      await prisma.order.update({
        where: { id: stop.orderId },
        data: {
          status: "delivered", // Sync with actual order delivery status
          ...(isCOD && { paymentStatus: "paid", paidAt: new Date() }),
        },
      });
    }

    return successResponse({
      stop_id: stop.id,
      status: stop.status,
      actual_arrival: stop.actualArrival,
      notes: stop.notes,
    });
  } catch (error) {
    return handleRouteError(error, "Update stop status");
  }
}
