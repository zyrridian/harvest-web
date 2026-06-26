import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";

/**
 * @swagger
 * /api/v1/community/notifications/{id}/read:
 *   put:
 *     summary: Mark notification as read
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Notification not found
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await verifyAuth(request);

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return NextResponse.json(
        {
          status: "error",
          message: "Notification not found",
        },
        { status: 404 },
      );
    }

    if (notification.userId !== user.userId) {
      return NextResponse.json(
        {
          status: "error",
          message: "You do not have permission to update this notification",
        },
        { status: 403 },
      );
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Notification marked as read",
      data: updated,
    });
  } catch (error: any) {
    console.error("Mark notification as read error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error.message || "Failed to mark notification as read",
      },
      { status: error.status || 500 },
    );
  }
}
