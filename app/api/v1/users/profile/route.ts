import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyToken, extractBearerToken } from "@/features/auth";

/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     summary: Get user profile information
 *     description: Retrieve the current user's profile information including bio and stats
 *     tags:
 *       - User Profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
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
 *                     user:
 *                       type: object
 *                     profile:
 *                       type: object
 *                       properties:
 *                         bio:
 *                           type: string
 *                         followers_count:
 *                           type: integer
 *                         response_rate:
 *                           type: number
 *                         response_time:
 *                           type: string
 *                         joined_since:
 *                           type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get("Authorization");
    const token = extractBearerToken(authHeader);

    if (!token) {
      return NextResponse.json(
        { status: "error", message: "No token provided" },
        { status: 401 }
      );
    }

    // Verify token
    const payload = await verifyToken(token);

    if (!payload || payload.type !== "access") {
      return NextResponse.json(
        { status: "error", message: "Invalid token" },
        { status: 401 }
      );
    }

    // Get user with profile
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { profile: true },
    });

    if (!user) {
      return NextResponse.json(
        { status: "error", message: "User not found" },
        { status: 404 }
      );
    }

    // Prepare response (exclude password)
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone_number: user.phoneNumber,
      avatar_url: user.avatarUrl,
      user_type: user.userType,
      is_verified: user.isVerified,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
    };

    const profileResponse = user.profile
      ? {
          bio: user.profile.bio,
          followers_count: user.profile.followersCount,
          response_rate: user.profile.responseRate,
          response_time: user.profile.responseTime,
          joined_since: user.profile.joinedSince.toISOString(),
        }
      : null;

    return NextResponse.json({
      status: "success",
      data: {
        user: userResponse,
        profile: profileResponse,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/v1/users/profile:
 *   put:
 *     summary: Update user profile information
 *     description: Update the current user's profile including name, phone, and bio
 *     tags:
 *       - User Profile
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe Updated
 *               phone_number:
 *                 type: string
 *                 example: "+6281234567890"
 *               bio:
 *                 type: string
 *                 example: Updated bio text
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Profile updated successfully
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function PUT(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get("Authorization");
    const token = extractBearerToken(authHeader);

    if (!token) {
      return NextResponse.json(
        { status: "error", message: "No token provided" },
        { status: 401 }
      );
    }

    // Verify token
    const payload = await verifyToken(token);

    if (!payload || payload.type !== "access") {
      return NextResponse.json(
        { status: "error", message: "Invalid token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, phone_number, bio } = body;

    // Update user basic info
    const updateData: {
      name?: string;
      phoneNumber?: string;
    } = {};

    if (name) updateData.name = name;
    if (phone_number !== undefined) updateData.phoneNumber = phone_number;

    const user = await prisma.user.update({
      where: { id: payload.userId },
      data: updateData,
    });

    // Update or create profile
    if (bio !== undefined) {
      await prisma.userProfile.upsert({
        where: { userId: payload.userId },
        update: { bio },
        create: {
          userId: payload.userId,
          bio,
        },
      });
    }

    // Fetch updated user with profile
    const updatedUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { profile: true },
    });

    const userResponse = {
      id: updatedUser!.id,
      email: updatedUser!.email,
      name: updatedUser!.name,
      phone_number: updatedUser!.phoneNumber,
      avatar_url: updatedUser!.avatarUrl,
      user_type: updatedUser!.userType,
      is_verified: updatedUser!.isVerified,
      created_at: updatedUser!.createdAt.toISOString(),
      updated_at: updatedUser!.updatedAt.toISOString(),
    };

    const profileResponse = updatedUser!.profile
      ? {
          bio: updatedUser!.profile.bio,
          followers_count: updatedUser!.profile.followersCount,
          response_rate: updatedUser!.profile.responseRate,
          response_time: updatedUser!.profile.responseTime,
          joined_since: updatedUser!.profile.joinedSince.toISOString(),
        }
      : null;

    return NextResponse.json({
      status: "success",
      message: "Profile updated successfully",
      data: {
        user: userResponse,
        profile: profileResponse,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 }
    );
  }
}
