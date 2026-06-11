import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAdmin } from "@/features/auth";

/**
 * @swagger
 * /api/v1/admin/farmers:
 *   get:
 *     summary: Get all farmers
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: is_verified
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
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
 *         description: List of farmers
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);

    const { searchParams } = new URL(request.url);
    const isVerified = searchParams.get("is_verified");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = {};

    if (isVerified !== null && isVerified !== undefined) {
      where.isVerified = isVerified === "true";
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [farmers, total] = await Promise.all([
      prisma.farmer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { joinedDate: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              _count: {
                select: {
                  products: true,
                },
              },
            },
          },
        },
      }),
      prisma.farmer.count({ where }),
    ]);

    return NextResponse.json({
      status: "success",
      data: {
        farmers,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error("Get farmers error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error.message || "Failed to get farmers",
      },
      { status: error.status || 500 },
    );
  }
}
