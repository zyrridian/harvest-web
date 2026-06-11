import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";

/**
 * @swagger
 * /api/v1/farmers/{id}:
 *   get:
 *     summary: Get detailed farmer profile
 *     tags: [Farmers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Farmer profile details
 *       404:
 *         description: Farmer not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Await params in Next.js 15+
    const { id } = await params;

    const includeOptions = {
      specialties: {
        select: {
          specialty: true,
        },
      },
      user: {
        select: {
          id: true,
          isOnline: true,
          profile: {
            select: {
              responseRate: true,
              responseTime: true,
            },
          },
        },
      },
    };

    // Try to find by farmer.id first, then by userId
    let farmer = await prisma.farmer.findUnique({
      where: { id: id },
      include: includeOptions,
    });

    // If not found by farmer.id, try finding by userId
    if (!farmer) {
      farmer = await prisma.farmer.findUnique({
        where: { userId: id },
        include: includeOptions,
      });
    }

    if (!farmer) {
      return NextResponse.json(
        {
          status: "error",
          message: "Farmer not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      status: "success",
      data: {
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
        verification_badge: farmer.verificationBadge,
        has_map_feature: farmer.hasMapFeature,
        phone_number: farmer.phoneNumber,
        email: farmer.email,
        joined_date: farmer.joinedDate,
        is_online: farmer.user.isOnline,
        distance: null, // TODO: Calculate distance based on user location
        response_rate: farmer.user.profile?.responseRate || 0,
        response_time: farmer.user.profile?.responseTime,
        followers_count: farmer.followersCount,
      },
    });
  } catch (error: any) {
    console.error("Error fetching farmer:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch farmer",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
