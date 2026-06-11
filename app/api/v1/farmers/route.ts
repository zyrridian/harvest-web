import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";

/**
 * @swagger
 * /api/v1/farmers:
 *   get:
 *     summary: Get list of farmers/sellers with filters
 *     tags: [Farmers]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *       - in: query
 *         name: specialties
 *         schema:
 *           type: string
 *       - in: query
 *         name: has_map_feature
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: min_rating
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: List of farmers
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Filters
    const query = searchParams.get("query");
    const specialties = searchParams.get("specialties")?.split(",");
    const hasMapFeature = searchParams.get("has_map_feature");
    const minRating = searchParams.get("min_rating");

    // Build where clause
    const where: any = {};

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ];
    }

    if (hasMapFeature !== null && hasMapFeature !== undefined) {
      where.hasMapFeature = hasMapFeature === "true";
    }

    if (minRating) {
      where.rating = { gte: parseFloat(minRating) };
    }

    if (specialties && specialties.length > 0) {
      where.specialties = {
        some: {
          specialty: { in: specialties },
        },
      };
    }

    // Get farmers
    const [farmers, totalItems] = await Promise.all([
      prisma.farmer.findMany({
        where,
        skip,
        take: limit,
        include: {
          specialties: {
            select: {
              specialty: true,
            },
          },
          user: {
            select: {
              id: true,
              isOnline: true,
            },
          },
        },
      }),
      prisma.farmer.count({ where }),
    ]);

    const formattedFarmers = farmers.map((farmer) => ({
      id: farmer.id,
      user_id: farmer.user.id,
      name: farmer.name,
      description: farmer.description,
      profile_image: farmer.profileImage,
      cover_image: farmer.coverImage,
      latitude: farmer.latitude,
      longitude: farmer.longitude,
      address: farmer.address,
      city: farmer.city,
      state: farmer.state,
      rating: farmer.rating,
      total_reviews: farmer.totalReviews,
      total_products: farmer.totalProducts,
      specialties: farmer.specialties.map((s) => s.specialty),
      is_verified: farmer.isVerified,
      has_map_feature: farmer.hasMapFeature,
      phone_number: farmer.phoneNumber,
      email: farmer.email,
      joined_date: farmer.joinedDate,
      is_online: farmer.user.isOnline,
      distance: null, // TODO: Calculate distance based on user location
    }));

    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      status: "success",
      data: formattedFarmers,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_items: totalItems,
        items_per_page: limit,
      },
    });
  } catch (error: any) {
    console.error("Error fetching farmers:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch farmers",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
