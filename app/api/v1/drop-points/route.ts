import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";

/**
 * GET /api/v1/drop-points
 * Public — returns all active drop points for map display
 * Query: lat, lng, radius_km (optional bbox), farmer_id
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const farmerId = searchParams.get("farmer_id");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    const where: any = { isActive: true };
    if (farmerId) where.farmerId = farmerId;

    const dropPoints = await prisma.dropPoint.findMany({
      where,
      include: {
        farmer: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            isVerified: true,
            rating: true,
            city: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Optional: filter by distance if lat/lng provided (simple haversine-ish)
    let results = dropPoints.map((dp) => ({
      id: dp.id,
      farmer_id: dp.farmerId,
      farmer: {
        id: dp.farmer.id,
        name: dp.farmer.name,
        profile_image: dp.farmer.profileImage,
        is_verified: dp.farmer.isVerified,
        rating: dp.farmer.rating,
        city: dp.farmer.city,
      },
      name: dp.name,
      description: dp.description,
      what_we_sell: dp.whatWeSell,
      latitude: dp.latitude,
      longitude: dp.longitude,
      address: dp.address,
      image_url: dp.imageUrl,
      is_active: dp.isActive,
      created_at: dp.createdAt,
    }));

    // Distance filter
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const radiusKm = parseFloat(searchParams.get("radius_km") || "50");

      results = results.filter((dp) => {
        const dLat = ((dp.latitude - userLat) * Math.PI) / 180;
        const dLng = ((dp.longitude - userLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((userLat * Math.PI) / 180) *
            Math.cos((dp.latitude * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
        const distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        (dp as any).distance_km = Math.round(distKm * 10) / 10;
        return distKm <= radiusKm;
      });
    }

    return NextResponse.json({ status: "success", data: results });
  } catch (error: any) {
    console.error("GET drop-points error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to fetch drop points" },
      { status: 500 }
    );
  }
}
