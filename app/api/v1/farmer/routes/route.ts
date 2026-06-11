import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";

// ============================================================
// OpenRouteService route optimization (free, no billing risk)
// Falls back to Haversine nearest-neighbor if ORS unavailable
// ============================================================

const ORS_BASE = "https://api.openrouteservice.org/v2";
const ORS_KEY = process.env.OPENROUTESERVICE_API_KEY || "";

interface Coord {
  lat: number;
  lng: number;
}

function haversineKm(a: Coord, b: Coord): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Nearest-neighbor TSP fallback (good enough for <20 stops)
function nearestNeighborOrder(
  start: Coord,
  stops: { id: string; coord: Coord }[],
): string[] {
  const remaining = [...stops];
  const result: string[] = [];
  let current = start;
  while (remaining.length > 0) {
    let nearest = 0;
    let minDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i].coord);
      if (d < minDist) {
        minDist = d;
        nearest = i;
      }
    }
    result.push(remaining[nearest].id);
    current = remaining[nearest].coord;
    remaining.splice(nearest, 1);
  }
  return result;
}

async function optimizeWithORS(
  start: Coord,
  stops: { id: string; coord: Coord }[],
): Promise<{
  orderedIds: string[];
  totalKm: number;
  totalMinutes: number;
} | null> {
  if (!ORS_KEY || stops.length === 0) return null;

  try {
    // ORS Optimization API (Traveling Salesman)
    const vehicles = [
      {
        id: 1,
        profile: "driving-car",
        start: [start.lng, start.lat],
        end: [start.lng, start.lat],
      },
    ];
    const jobs = stops.map((s, i) => ({
      id: i + 1,
      location: [s.coord.lng, s.coord.lat],
    }));

    const res = await fetch(`${ORS_BASE}/optimization`, {
      method: "POST",
      headers: {
        Authorization: ORS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ vehicles, jobs }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;

    const orderedJobIds: number[] = route.steps
      .filter((s: any) => s.type === "job")
      .map((s: any) => s.job);

    const orderedIds = orderedJobIds.map((jobId) => stops[jobId - 1].id);
    const totalKm = route.distance / 1000;
    const totalMinutes = Math.round(route.duration / 60);

    return { orderedIds, totalKm, totalMinutes };
  } catch {
    return null;
  }
}

// ============================================================
// GET /api/v1/farmer/routes — list farmer's routes
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    const farmer = await prisma.farmer.findUnique({
      where: { userId: payload.userId },
    });
    if (!farmer) throw AppError.notFound("Farmer profile not found");

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // YYYY-MM-DD filter

    const where: any = { farmerId: farmer.id };
    if (date) {
      const d = new Date(date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.deliveryDate = { gte: d, lt: next };
    }

    const routes = await prisma.deliveryRoute.findMany({
      where,
      include: {
        stops: {
          orderBy: { stopOrder: "asc" },
          include: {
            order: {
              select: {
                orderNumber: true,
                totalAmount: true,
                buyer: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { deliveryDate: "desc" },
      take: 20,
    });

    return successResponse({
      routes: routes.map((r) => ({
        route_id: r.id,
        delivery_date: r.deliveryDate,
        status: r.status,
        tracking_enabled: r.trackingEnabled,
        stop_count: r.stops.length,
        total_distance_km: r.totalDistanceKm,
        estimated_minutes: r.estimatedMinutes,
        stops: r.stops.map((s) => ({
          stop_id: s.id,
          stop_order: s.stopOrder,
          order_number: s.order.orderNumber,
          recipient_name: s.recipientName,
          address_label: s.addressLabel,
          status: s.status,
          estimated_arrival: s.estimatedArrival,
        })),
      })),
    });
  } catch (error) {
    return handleRouteError(error, "Get routes");
  }
}

// ============================================================
// POST /api/v1/farmer/routes — create + optimize route
// Body: { delivery_date, order_ids[], tracking_enabled? }
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    const farmer = await prisma.farmer.findUnique({
      where: { userId: payload.userId },
    });
    if (!farmer) throw AppError.notFound("Farmer profile not found");

    const body = await request.json();
    const { delivery_date, order_ids, tracking_enabled = false } = body;

    if (!delivery_date || !order_ids?.length) {
      throw AppError.badRequest("delivery_date and order_ids required");
    }

    // Validate orders belong to this farmer and have farmer_delivery method
    const orders = await prisma.order.findMany({
      where: {
        id: { in: order_ids },
        sellerId: payload.userId,
        deliveryMethod: "farmer_delivery",
      },
      include: {
        deliveryAddress: {
          select: {
            latitude: true,
            longitude: true,
            fullAddress: true,
            recipientName: true,
            label: true,
          },
        },
      },
    });

    if (orders.length === 0)
      throw AppError.notFound("No valid farmer_delivery orders found");

    // Build stop data (skip orders without coordinates — they get manual handling)
    const stopsWithCoords = orders
      .filter(
        (o) => o.deliveryAddress?.latitude && o.deliveryAddress?.longitude,
      )
      .map((o) => ({
        id: o.id,
        coord: {
          lat: o.deliveryAddress!.latitude!,
          lng: o.deliveryAddress!.longitude!,
        },
        address: o.deliveryAddress,
      }));

    const farmerStart: Coord = {
      lat: farmer.latitude ?? 0,
      lng: farmer.longitude ?? 0,
    };

    // Try ORS optimization, fallback to nearest-neighbor
    let orderedIds: string[];
    let totalKm: number | null = null;
    let totalMinutes: number | null = null;

    const orsResult = await optimizeWithORS(farmerStart, stopsWithCoords);
    if (orsResult) {
      orderedIds = orsResult.orderedIds;
      totalKm = orsResult.totalKm;
      totalMinutes = orsResult.totalMinutes;
    } else {
      orderedIds = nearestNeighborOrder(farmerStart, stopsWithCoords);
      // Estimate distance manually
      let dist = 0;
      let prev = farmerStart;
      for (const id of orderedIds) {
        const stop = stopsWithCoords.find((s) => s.id === id)!;
        dist += haversineKm(prev, stop.coord);
        prev = stop.coord;
      }
      totalKm = parseFloat(dist.toFixed(2));
      totalMinutes = Math.round((dist / 30) * 60); // assume avg 30km/h
    }

    // Also append orders without coords at the end (manual)
    const noCoordIds = orders
      .filter(
        (o) => !o.deliveryAddress?.latitude || !o.deliveryAddress?.longitude,
      )
      .map((o) => o.id);
    orderedIds = [...orderedIds, ...noCoordIds];

    // Create route in DB
    const delivDate = new Date(delivery_date);
    const route = await prisma.deliveryRoute.create({
      data: {
        farmerId: farmer.id,
        deliveryDate: delivDate,
        trackingEnabled: tracking_enabled,
        optimizedOrder: JSON.stringify(orderedIds),
        totalDistanceKm: totalKm,
        estimatedMinutes: totalMinutes,
        stops: {
          create: orderedIds.map((orderId, idx) => {
            const order = orders.find((o) => o.id === orderId)!;
            return {
              orderId,
              stopOrder: idx + 1,
              addressLat: order.deliveryAddress?.latitude ?? null,
              addressLng: order.deliveryAddress?.longitude ?? null,
              addressLabel:
                order.deliveryAddress?.label ??
                order.deliveryAddress?.fullAddress ??
                null,
              recipientName: order.deliveryAddress?.recipientName ?? null,
            };
          }),
        },
      },
      include: { stops: { orderBy: { stopOrder: "asc" } } },
    });

    return successResponse(
      {
        route_id: route.id,
        delivery_date: route.deliveryDate,
        status: route.status,
        tracking_enabled: route.trackingEnabled,
        stop_count: route.stops.length,
        total_distance_km: route.totalDistanceKm,
        estimated_minutes: route.estimatedMinutes,
        optimized_using: orsResult ? "openrouteservice" : "nearest_neighbor",
        stops: route.stops.map((s) => ({
          stop_id: s.id,
          stop_order: s.stopOrder,
          order_id: s.orderId,
          address_label: s.addressLabel,
          recipient_name: s.recipientName,
          status: s.status,
        })),
      },
      { message: "Route created and optimized", status: 201 },
    );
  } catch (error) {
    return handleRouteError(error, "Create route");
  }
}
