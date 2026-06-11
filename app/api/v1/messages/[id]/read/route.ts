import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/features/auth";
import prisma from "@/core/database/prisma";

/**
 * @swagger
 * /api/v1/messages/{id}/read:
 *   patch:
 *     summary: Mark message as read
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message marked as read
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only recipient can mark as read
 *       404:
 *         description: Message not found
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    // Await params in Next.js 15+
    const { id } = await context.params;

    const payload = await verifyAuth(request);
    const { id: messageId } = await context.params;

    // Find message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: true,
      },
    });

    if (!message) {
      return NextResponse.json(
        { status: "error", message: "Message not found" },
        { status: 404 },
      );
    }

    // Verify user is recipient (not sender)
    const isRecipient =
      (message.conversation.participant1Id === payload.userId &&
        message.senderId !== payload.userId) ||
      (message.conversation.participant2Id === payload.userId &&
        message.senderId !== payload.userId);

    if (!isRecipient) {
      return NextResponse.json(
        { status: "error", message: "Only recipient can mark message as read" },
        { status: 403 },
      );
    }

    // Update message if not already read
    if (!message.isRead) {
      await prisma.message.update({
        where: { id: messageId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      status: "success",
      data: {
        message_id: messageId,
        is_read: true,
      },
    });
  } catch (error) {
    console.error("Mark message as read error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to mark message as read" },
      { status: 500 },
    );
  }
}
