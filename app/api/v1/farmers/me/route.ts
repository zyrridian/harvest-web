import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyToken, extractBearerToken } from "@/features/auth";

/**
 * @swagger
 * /api/v1/farmers/me:
 *   get:
 *     summary: Get current farmer's profile
 *     tags: [Farmers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Farmer profile
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Farmer profile not found
 */
export async function GET(request: NextRequest) {
  try {
    const token = extractBearerToken(request.headers.get("authorization"));
    if (!token) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 },
      );
    }

    const payload = await verifyToken(token);
    if (!payload || payload.type !== "access") {
      return NextResponse.json(
        { status: "error", message: "Invalid token" },
        { status: 401 },
      );
    }

    const farmer = await prisma.farmer.findUnique({
      where: { userId: payload.userId },
      include: {
        specialties: {
          select: { specialty: true },
        },
        user: {
          select: {
            email: true,
            name: true,
            phoneNumber: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });

    if (!farmer) {
      return NextResponse.json(
        { status: "error", message: "Farmer profile not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      status: "success",
      data: {
        id: farmer.id,
        user_id: farmer.userId,
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
        phone_number: farmer.phoneNumber || farmer.user.phoneNumber,
        email: farmer.email || farmer.user.email,
        joined_date: farmer.joinedDate,
        followers_count: farmer.followersCount,
      },
    });
  } catch (error: any) {
    console.error("Error fetching farmer profile:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch farmer profile",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/v1/farmers/me:
 *   post:
 *     summary: Create or update farmer profile
 *     tags: [Farmers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               profile_image:
 *                 type: string
 *               cover_image:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               phone_number:
 *                 type: string
 *               specialties:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Farmer profile created/updated
 *       401:
 *         description: Unauthorized
 */
export async function POST(request: NextRequest) {
  try {
    const token = extractBearerToken(request.headers.get("authorization"));
    if (!token) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 },
      );
    }

    const payload = await verifyToken(token);
    if (!payload || payload.type !== "access") {
      return NextResponse.json(
        { status: "error", message: "Invalid token" },
        { status: 401 },
      );
    }

    // Only PRODUCER users can have farmer profiles
    if (payload.user_type !== "PRODUCER") {
      return NextResponse.json(
        {
          status: "error",
          message: "Only producers can create farmer profiles",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      profile_image,
      cover_image,
      address,
      city,
      state,
      latitude,
      longitude,
      phone_number,
      specialties = [],
    } = body;

    if (!name) {
      return NextResponse.json(
        { status: "error", message: "Name is required" },
        { status: 400 },
      );
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json(
        { status: "error", message: "User not found" },
        { status: 404 },
      );
    }

    // Check if farmer profile already exists
    const existingFarmer = await prisma.farmer.findUnique({
      where: { userId: payload.userId },
    });

    let farmer: typeof existingFarmer;

    if (existingFarmer) {
      // Update existing farmer profile
      farmer = await prisma.farmer.update({
        where: { userId: payload.userId },
        data: {
          name,
          description,
          profileImage: profile_image,
          coverImage: cover_image,
          address,
          city,
          state,
          latitude,
          longitude,
          phoneNumber: phone_number,
          email: user.email,
        },
      });

      // Update specialties
      if (specialties.length > 0) {
        await prisma.farmerSpecialty.deleteMany({
          where: { farmerId: farmer!.id },
        });
        await prisma.farmerSpecialty.createMany({
          data: specialties.map((specialty: string) => ({
            farmerId: farmer!.id,
            specialty,
          })),
        });
      }
    } else {
      // Create new farmer profile
      farmer = await prisma.farmer.create({
        data: {
          userId: payload.userId,
          name,
          description,
          profileImage: profile_image,
          coverImage: cover_image,
          address,
          city,
          state,
          latitude,
          longitude,
          phoneNumber: phone_number,
          email: user.email,
          specialties: {
            create: specialties.map((specialty: string) => ({ specialty })),
          },
        },
      });
    }

    // Fetch updated farmer with specialties
    const updatedFarmer = await prisma.farmer.findUnique({
      where: { id: farmer.id },
      include: {
        specialties: { select: { specialty: true } },
      },
    });

    return NextResponse.json({
      status: "success",
      message: existingFarmer
        ? "Farmer profile updated"
        : "Farmer profile created",
      data: {
        id: updatedFarmer!.id,
        user_id: updatedFarmer!.userId,
        name: updatedFarmer!.name,
        description: updatedFarmer!.description,
        profile_image: updatedFarmer!.profileImage,
        cover_image: updatedFarmer!.coverImage,
        address: updatedFarmer!.address,
        city: updatedFarmer!.city,
        state: updatedFarmer!.state,
        latitude: updatedFarmer!.latitude,
        longitude: updatedFarmer!.longitude,
        phone_number: updatedFarmer!.phoneNumber,
        specialties: updatedFarmer!.specialties.map((s) => s.specialty),
        is_verified: updatedFarmer!.isVerified,
        joined_date: updatedFarmer!.joinedDate,
      },
    });
  } catch (error: any) {
    console.error("Error creating/updating farmer profile:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to save farmer profile",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
