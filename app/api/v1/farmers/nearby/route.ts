import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const latitude = searchParams.get("latitude");
    const longitude = searchParams.get("longitude");
    const radius = parseFloat(searchParams.get("radius_km") || "3");
    const limit = parseInt(searchParams.get("limit") || "20");
    const searchQuery = searchParams.get("search")?.toLowerCase();
    const tagsParam = searchParams.get("tags");
    const isOpenParam = searchParams.get("is_open");

    if (!latitude || !longitude) {
      return NextResponse.json(
        {
          status: "error",
          message: "latitude and longitude are required",
        },
        { status: 400 },
      );
    }

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);

    // Filter by open status if requested
    const whereClause: any = {};
    if (isOpenParam === "true") {
      whereClause.isActive = true;
    }

    // Get all drop points with related farmer and products
    const dropPoints = await prisma.dropPoint.findMany({
      where: whereClause,
      include: {
        farmer: {
          include: {
            user: {
              include: {
                products: {
                  where: { isAvailable: true },
                  select: { name: true },
                  take: 2,
                },
                _count: {
                  select: { products: { where: { isAvailable: true } } },
                },
              },
            },
          },
        },
      },
    });

    // Calculate distances, filter by search/tags/radius, and map to payload
    const processedPoints = dropPoints
      .map((dp) => {
        const distance = calculateDistance(
          userLat,
          userLon,
          dp.latitude,
          dp.longitude,
        );
        return { ...dp, distance };
      })
      .filter((dp) => dp.distance <= radius)
      .filter((dp) => {
        // Search filter (name or farmer name)
        if (searchQuery) {
          const matchName = dp.name.toLowerCase().includes(searchQuery);
          const matchFarmer = dp.farmer.name.toLowerCase().includes(searchQuery);
          if (!matchName && !matchFarmer) return false;
        }
        // Tags filter
        if (tagsParam) {
          const requestedTags = tagsParam.split(",").map((t) => t.trim());
          const hasTag = requestedTags.some((rt) => dp.tags.includes(rt));
          if (!hasTag) return false;
        }
        return true;
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    const formattedData = processedPoints.map((dp) => {
      const extraProductsCount = dp.farmer.user._count.products - dp.farmer.user.products.length;
      
      return {
        id: dp.id,
        farmer_id: dp.farmerId,
        user_id: dp.farmer.userId,
        name: dp.name,
        distance: Math.round(dp.distance * 10) / 10,
        category: dp.whatWeSell || "Produce",
        sub_category: dp.tags.length > 0 ? dp.tags[0] : "",
        rating: dp.farmer.rating,
        review_count: dp.farmer.totalReviews,
        tags: dp.tags,
        products: dp.farmer.user.products,
        extra_products_count: extraProductsCount > 0 ? extraProductsCount : 0,
        status_text: dp.isActive ? "Open now" : "Closed",
        status_sub_text: dp.isActive ? "" : "Check back later",
        is_open: dp.isActive,
        latitude: dp.latitude,
        longitude: dp.longitude,
        image_url: dp.imageUrl || dp.farmer.profileImage,
      };
    });

    return NextResponse.json({
      status: "success",
      data: {
        farmers: formattedData,
      },
    });
  } catch (error: any) {
    console.error("Error fetching nearby farmers:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch nearby farmers",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
