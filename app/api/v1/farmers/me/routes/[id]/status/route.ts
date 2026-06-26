import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";

// PATCH /api/v1/farmer/routes/[id]/status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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
    const { status } = body;

    if (!status || !["in_progress", "completed"].includes(status)) {
      throw AppError.badRequest("Valid status (in_progress, completed) is required");
    }

    // Update route fields
    const updatedRoute = await prisma.deliveryRoute.update({
      where: { id },
      data: {
        status,
        ...(status === "in_progress" &&
          !route.startedAt && { startedAt: new Date() }),
        ...(status === "completed" && {
          completedAt: new Date(),
          trackingEnabled: false,
        }),
      },
    });

    return successResponse({
      route_id: updatedRoute.id,
      status: updatedRoute.status,
      tracking_enabled: updatedRoute.trackingEnabled,
      started_at: updatedRoute.startedAt,
      completed_at: updatedRoute.completedAt,
    });
  } catch (error) {
    return handleRouteError(error, "Update route status");
  }
}
