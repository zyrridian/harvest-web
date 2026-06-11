import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: Get user's notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [all, unread, read]
 *         description: Filter notifications by read status
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
 *         description: List of notifications
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    const { searchParams } = new URL(request.url);

    const filter = searchParams.get("filter") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = { userId: user.userId };

    if (filter === "unread") {
      where.isRead = false;
    } else if (filter === "read") {
      where.isRead = true;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          userId: user.userId,
          isRead: false,
        },
      }),
    ]);

    return NextResponse.json({
      status: "success",
      data: {
        notifications,
        unread_count: unreadCount,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error("Get notifications error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error.message || "Failed to get notifications",
      },
      { status: error.status || 500 },
    );
  }
}
