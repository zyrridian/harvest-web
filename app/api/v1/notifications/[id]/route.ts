import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";

/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
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
 *         description: Notification deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Notification not found
 */
export async function DELETE(
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
          message: "You do not have permission to delete this notification",
        },
        { status: 403 },
      );
    }

    await prisma.notification.delete({
      where: { id },
    });

    return NextResponse.json({
      status: "success",
      message: "Notification deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete notification error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error.message || "Failed to delete notification",
      },
      { status: error.status || 500 },
    );
  }
}
