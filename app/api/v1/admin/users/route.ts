import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAdmin } from "@/features/auth";

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get all users with filtering
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: user_type
 *         schema:
 *           type: string
 *           enum: [CONSUMER, PRODUCER, ADMIN]
 *       - in: query
 *         name: is_verified
 *         schema:
 *           type: boolean
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
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const userType = searchParams.get("user_type");
    const isVerified = searchParams.get("is_verified");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (userType) {
      where.userType = userType;
    }

    if (isVerified !== null && isVerified !== undefined) {
      where.isVerified = isVerified === "true";
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          phoneNumber: true,
          avatarUrl: true,
          userType: true,
          isVerified: true,
          isOnline: true,
          lastSeen: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              buyerOrders: true,
              sellerOrders: true,
              products: true,
              reviews: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      status: "success",
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error("Get users error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error.message || "Failed to get users",
      },
      { status: error.status || 500 },
    );
  }
}
