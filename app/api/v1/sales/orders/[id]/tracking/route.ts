import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// FUZZY_THRESHOLD_KM: below this distance → show exact location.
// Above → show blurred position (shifted ~500m in random stable direction).
const FUZZY_THRESHOLD_KM = 2;

function fuzzLocation(
  lat: number,
  lng: number,
  orderId: string,
): { lat: number; lng: number } {
  // Deterministic fuzz: use orderId hash as stable offset seed
  // Offset ~0.004° ≈ 400-500m
  const seed = orderId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const offsetLat = ((seed % 100) / 100 - 0.5) * 0.008;
  const offsetLng = (((seed * 7) % 100) / 100 - 0.5) * 0.008;
  return { lat: lat + offsetLat, lng: lng + offsetLng };
}

// GET /api/v1/orders/[id]/tracking
// Returns tracking info for buyer's own order only.
// Applies fuzzy location unless farmer is within 2km of buyer.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payload = await verifyAuth(request);

    const order = await prisma.order.findFirst({
      where: { id: id, buyerId: payload.userId },
      include: {
        routeStop: {
          include: {
            route: {
              select: {
                id: true,
                status: true,
                trackingEnabled: true,
                currentLat: true,
                currentLng: true,
                locationUpdatedAt: true,
                estimatedMinutes: true,
                totalDistanceKm: true,
              },
            },
          },
        },
        deliveryAddress: {
          select: { latitude: true, longitude: true, fullAddress: true },
        },
      },
    });

    if (!order) throw AppError.notFound("Order not found");

    // No route assigned yet
    if (!order.routeStop) {
      return successResponse({
        order_id: order.id,
        delivery_method: order.deliveryMethod,
        tracking_available: false,
        reason: "Delivery not yet scheduled by farmer",
      });
    }

    const route = order.routeStop.route;

    // Tracking disabled by farmer
    if (!route.trackingEnabled) {
      return successResponse({
        order_id: order.id,
        tracking_available: false,
        route_status: route.status,
        stop_status: order.routeStop.status,
        estimated_arrival: order.routeStop.estimatedArrival,
        reason: "Farmer has not enabled live tracking for this delivery",
      });
    }

    // No location yet
    if (!route.currentLat || !route.currentLng) {
      return successResponse({
        order_id: order.id,
        tracking_available: true,
        route_status: route.status,
        stop_status: order.routeStop.status,
        estimated_arrival: order.routeStop.estimatedArrival,
        live_location: null,
        reason: "Waiting for farmer to start moving",
      });
    }

    // Calculate distance from farmer to buyer
    const buyerLat = order.deliveryAddress?.latitude;
    const buyerLng = order.deliveryAddress?.longitude;

    let liveLocation: {
      lat: number;
      lng: number;
      is_exact: boolean;
      updated_at: Date | null;
    };

    if (buyerLat && buyerLng) {
      const distKm = haversineKm(
        route.currentLat,
        route.currentLng,
        buyerLat,
        buyerLng,
      );
      const isExact = distKm <= FUZZY_THRESHOLD_KM;

      if (isExact) {
        liveLocation = {
          lat: route.currentLat,
          lng: route.currentLng,
          is_exact: true,
          updated_at: route.locationUpdatedAt,
        };
      } else {
        const fuzzy = fuzzLocation(
          route.currentLat,
          route.currentLng,
          order.id,
        );
        liveLocation = {
          lat: fuzzy.lat,
          lng: fuzzy.lng,
          is_exact: false,
          updated_at: route.locationUpdatedAt,
        };
      }
    } else {
      // No buyer coords — always fuzzy
      const fuzzy = fuzzLocation(route.currentLat, route.currentLng, order.id);
      liveLocation = {
        lat: fuzzy.lat,
        lng: fuzzy.lng,
        is_exact: false,
        updated_at: route.locationUpdatedAt,
      };
    }

    // Get stop position in route (how many stops ahead)
    const myStopOrder = order.routeStop.stopOrder;
    const allStops = await prisma.routeStop.findMany({
      where: {
        routeId: route.id,
        stopOrder: { lt: myStopOrder },
        status: { not: "completed" },
      },
    });

    return successResponse({
      order_id: order.id,
      tracking_available: true,
      route_status: route.status,
      stop_status: order.routeStop.status,
      stop_order: myStopOrder,
      stops_ahead: allStops.length,
      estimated_arrival: order.routeStop.estimatedArrival,
      actual_arrival: order.routeStop.actualArrival,
      live_location: liveLocation,
    });
  } catch (error) {
    return handleRouteError(error, "Get order tracking");
  }
}
