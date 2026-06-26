import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { haversineKm } from "@/core/helpers/distance";

// PUT /api/v1/farmer/routes/[id]/reorder
export async function PUT(
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
      include: { stops: true },
    });
    if (!route) throw AppError.notFound("Route not found");

    const body = await request.json();
    const { stop_ids } = body;

    if (!Array.isArray(stop_ids) || stop_ids.length === 0) {
      throw AppError.badRequest("stop_ids must be a non-empty array");
    }

    // Verify all provided stop_ids exist in the route
    const existingIds = new Set(route.stops.map((s) => s.id));
    for (const stopId of stop_ids) {
      if (!existingIds.has(stopId)) {
        throw AppError.badRequest(`Stop ${stopId} does not belong to this route`);
      }
    }

    // Update stop orders
    // We use a transaction to ensure all updates happen together
    const updatePromises = stop_ids.map((stopId, index) =>
      prisma.routeStop.update({
        where: { id: stopId },
        data: { stopOrder: index + 1 },
      }),
    );
    await prisma.$transaction(updatePromises);

    // Recalculate distance and estimated minutes
    const orderedStops = stop_ids.map((id) =>
      route.stops.find((s) => s.id === id)!
    );

    let totalKm = 0;
    let prev = { lat: farmer.latitude ?? 0, lng: farmer.longitude ?? 0 };

    for (const stop of orderedStops) {
      if (stop.addressLat && stop.addressLng) {
        const coord = { lat: stop.addressLat, lng: stop.addressLng };
        totalKm += haversineKm(prev, coord);
        prev = coord;
      }
    }

    const estimatedMinutes = Math.round((totalKm / 30) * 60); // assume 30km/h avg

    const updatedRoute = await prisma.deliveryRoute.update({
      where: { id },
      data: {
        totalDistanceKm: parseFloat(totalKm.toFixed(2)),
        estimatedMinutes,
        optimizedOrder: JSON.stringify(orderedStops.map((s) => s.orderId)),
      },
    });

    return successResponse({
      route_id: updatedRoute.id,
      total_distance_km: updatedRoute.totalDistanceKm,
      estimated_minutes: updatedRoute.estimatedMinutes,
    });
  } catch (error) {
    return handleRouteError(error, "Reorder route stops");
  }
}
