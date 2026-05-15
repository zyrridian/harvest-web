import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";

/**
 * @swagger
 * /api/v1/home:
 *   get:
 *     summary: Get home page data
 *     description: Returns categories, pre-order items, nearby farmers, and fresh products for the home screen
 *     tags:
 *       - Home
 *     parameters:
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *         description: User's current latitude for finding nearby farmers
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *         description: User's current longitude for finding nearby farmers
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 10
 *         description: Search radius in kilometers for nearby farmers
 *     responses:
 *       200:
 *         description: Home data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                     preOrders:
 *                       type: array
 *                       items:
 *                         type: object
 *                     nearbyFarmers:
 *                       type: object
 *                     freshToday:
 *                       type: array
 *                       items:
 *                         type: object
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latitude = searchParams.get("latitude");
    const longitude = searchParams.get("longitude");
    const radius = parseFloat(searchParams.get("radius") || "10");

    // Fetch categories
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        emoji: true,
        gradientColors: true,
        productCount: true,
      },
      take: 8, // Show 8 categories including "More"
    });

    // Fetch pre-order items (upcoming harvests)
    const now = new Date();
    const preOrders = await prisma.product.findMany({
      where: {
        isAvailable: true,
        isHarvest: true,
        harvestDate: {
          gte: now,
        },
      },
      orderBy: { harvestDate: "asc" },
      take: 10,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        currency: true,
        unit: true,
        stockQuantity: true,
        harvestDate: true,
        targetAmount: true,
        currentBooked: true,
        isHarvest: true,
        isOrganic: true,
        images: {
          where: { isPrimary: true },
          take: 1,
          select: {
            url: true,
            thumbnailUrl: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            farmer: {
              select: {
                name: true,
                profileImage: true,
                isVerified: true,
              },
            },
          },
        },
      },
    });

    // Format pre-order data with countdown
    const preOrdersFormatted = preOrders.map((product) => {
      const daysUntilHarvest = product.harvestDate
        ? Math.ceil(
            (product.harvestDate.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : null;

      // Mock pre-order count (you can add this to your schema if needed)
      const preOrderCount = Math.floor(Math.random() * 50) + 10;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        currency: product.currency,
        unit: product.unit,
        stock_quantity: product.stockQuantity,
        harvest_date: product.harvestDate,
        target_amount: product.targetAmount,
        current_booked: product.currentBooked,
        is_harvest: product.isHarvest,
        days_until_harvest: daysUntilHarvest,
        countdown_label:
          daysUntilHarvest === 0
            ? "Today"
            : daysUntilHarvest === 1
              ? "Tomorrow"
              : `${daysUntilHarvest} days`,
        is_organic: product.isOrganic,
        image:
          product.images[0]?.url || product.images[0]?.thumbnailUrl || null,
        farmer: {
          name: product.seller.farmer?.name || product.seller.name,
          profile_image: product.seller.farmer?.profileImage || null,
          is_verified: product.seller.farmer?.isVerified || false,
        },
        pre_order_count: preOrderCount,
      };
    });

    // Fetch nearby farmers if location provided
    let nearbyFarmersData: {
      count: number;
      radius_km: number;
      farmers: Array<{
        id: string;
        name: string;
        profile_image: string | null;
        latitude: number | null;
        longitude: number | null;
        address: string | null;
        city: string | null;
        rating: number;
        total_products: number;
        is_verified: boolean;
        distance_km: number;
      }>;
    } = {
      count: 0,
      radius_km: radius,
      farmers: [],
    };

    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      // Using Haversine formula approximation
      // This is a simple approximation - for production, use PostGIS or similar
      const farmers = await prisma.farmer.findMany({
        where: {
          AND: [
            { latitude: { not: null } },
            { longitude: { not: null } },
            { hasMapFeature: true },
          ],
        },
        select: {
          id: true,
          name: true,
          profileImage: true,
          latitude: true,
          longitude: true,
          address: true,
          city: true,
          rating: true,
          totalProducts: true,
          isVerified: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Filter by distance
      const nearbyFarmers = farmers
        .map((farmer) => {
          const distance = calculateDistance(
            lat,
            lng,
            farmer.latitude!,
            farmer.longitude!,
          );
          return { ...farmer, distance };
        })
        .filter((farmer) => farmer.distance <= radius)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10);

      nearbyFarmersData = {
        count: nearbyFarmers.length,
        radius_km: radius,
        farmers: nearbyFarmers.map((f) => ({
          id: f.id,
          name: f.name,
          profile_image: f.profileImage,
          latitude: f.latitude,
          longitude: f.longitude,
          address: f.address,
          city: f.city,
          rating: f.rating,
          total_products: f.totalProducts,
          is_verified: f.isVerified,
          distance_km: parseFloat(f.distance.toFixed(2)),
        })),
      };
    }

    // Fetch fresh products (available today)
    const freshToday = await prisma.product.findMany({
      where: {
        isAvailable: true,
        stockQuantity: { gt: 0 },
        OR: [{ harvestDate: null }, { harvestDate: { lte: now } }],
      },
      orderBy: [{ createdAt: "desc" }],
      take: 20,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        currency: true,
        unit: true,
        stockQuantity: true,
        rating: true,
        reviewCount: true,
        isOrganic: true,
        images: {
          where: { isPrimary: true },
          take: 1,
          select: {
            url: true,
            thumbnailUrl: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            farmer: {
              select: {
                name: true,
                profileImage: true,
                isVerified: true,
              },
            },
          },
        },
      },
    });

    const freshTodayFormatted = freshToday.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      currency: product.currency,
      unit: product.unit,
      stock_quantity: product.stockQuantity,
      rating: product.rating,
      review_count: product.reviewCount,
      is_organic: product.isOrganic,
      image: product.images[0]?.url || product.images[0]?.thumbnailUrl || null,
      farmer: {
        name: product.seller.farmer?.name || product.seller.name,
        profile_image: product.seller.farmer?.profileImage || null,
        is_verified: product.seller.farmer?.isVerified || false,
      },
    }));

    return NextResponse.json({
      status: "success",
      data: {
        categories: categories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          emoji: cat.emoji,
          gradient_colors: cat.gradientColors,
          product_count: cat.productCount,
        })),
        pre_orders: preOrdersFormatted,
        nearby_farmers: nearbyFarmersData,
        fresh_today: freshTodayFormatted,
      },
    });
  } catch (error) {
    console.error("Home API error:", error);
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
