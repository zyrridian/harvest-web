import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * @swagger
 * /api/v1/farmers/nearby:
 *   get:
 *     summary: Get nearby farmers based on location
 *     tags: [Farmers]
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 10
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of nearby farmers
 *       400:
 *         description: Missing required parameters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const latitude = searchParams.get("latitude");
    const longitude = searchParams.get("longitude");
    const radius = parseFloat(searchParams.get("radius") || "10");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!latitude || !longitude) {
      return NextResponse.json(
        {
          status: "error",
          message: "Latitude and longitude are required",
        },
        { status: 400 }
      );
    }

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);

    // Get all farmers with location data
    const farmers = await prisma.farmer.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
      include: {
        user: {
          select: {
            isOnline: true,
          },
        },
      },
    });

    // Calculate distances and filter by radius
    const farmersWithDistance = farmers
      .map((farmer) => {
        if (farmer.latitude === null || farmer.longitude === null) {
          return null;
        }

        const distance = calculateDistance(
          userLat,
          userLon,
          farmer.latitude,
          farmer.longitude
        );

        return {
          ...farmer,
          distance,
        };
      })
      .filter(
        (farmer): farmer is NonNullable<typeof farmer> =>
          farmer !== null && farmer.distance <= radius
      )
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    const formattedFarmers = farmersWithDistance.map((farmer) => ({
      id: farmer.id,
      user_id: farmer.userId,
      name: farmer.name,
      profile_image: farmer.profileImage,
      latitude: farmer.latitude,
      longitude: farmer.longitude,
      city: farmer.city,
      rating: farmer.rating,
      distance: Math.round(farmer.distance * 10) / 10, // Round to 1 decimal
      is_verified: farmer.isVerified,
    }));

    return NextResponse.json({
      status: "success",
      data: formattedFarmers,
    });
  } catch (error: any) {
    console.error("Error fetching nearby farmers:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch nearby farmers",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
