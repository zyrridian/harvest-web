import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/features/auth";
import prisma from "@/core/database/prisma";

/**
 * @swagger
 * /api/v1/messages/{id}:
 *   put:
 *     summary: Edit a message
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message updated
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not message sender
 *       404:
 *         description: Message not found
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
        // Await params in Next.js 15+
    const { id } = await context.params;

const payload = await verifyAuth(request);
    const { id: messageId } = await context.params;
    const body = await request.json();

    const { content } = body;

    if (!content || content.trim() === "") {
      return NextResponse.json(
        { status: "error", message: "Message content is required" },
        { status: 400 }
      );
    }

    // Find message and verify ownership
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json(
        { status: "error", message: "Message not found" },
        { status: 404 }
      );
    }

    if (message.senderId !== payload.userId) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized to edit this message" },
        { status: 403 }
      );
    }

    // Update message
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        content,
        isEdited: true,
        editedAt: new Date(),
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Message updated",
      data: {
        message_id: updatedMessage.id,
        content: updatedMessage.content,
        is_edited: true,
        edited_at: updatedMessage.editedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("Edit message error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to edit message" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/v1/messages/{id}:
 *   delete:
 *     summary: Delete a message
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
 *       - in: query
 *         name: delete_for
 *         schema:
 *           type: string
 *           enum: [me, everyone]
 *           default: me
 *         description: Delete scope
 *     responses:
 *       200:
 *         description: Message deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (only sender can delete for everyone)
 *       404:
 *         description: Message not found
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await verifyAuth(request);
    const { id: messageId } = await context.params;
    const { searchParams } = new URL(request.url);

    const deleteFor = searchParams.get("delete_for") || "me"; // 'me' or 'everyone'

    // Find message and conversation
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: true,
      },
    });

    if (!message) {
      return NextResponse.json(
        { status: "error", message: "Message not found" },
        { status: 404 }
      );
    }

    // Verify user is sender or participant
    const isSender = message.senderId === payload.userId;
    const isParticipant =
      message.conversation.participant1Id === payload.userId ||
      message.conversation.participant2Id === payload.userId;

    if (!isParticipant) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 403 }
      );
    }

    if (deleteFor === "everyone") {
      // Only sender can delete for everyone
      if (!isSender) {
        return NextResponse.json(
          { status: "error", message: "Only sender can delete for everyone" },
          { status: 403 }
        );
      }

      // Hard delete the message
      await prisma.message.delete({
        where: { id: messageId },
      });
    } else {
      // Soft delete for current user
      const isSenderInConversation =
        message.conversation.participant1Id === payload.userId;

      await prisma.message.update({
        where: { id: messageId },
        data: {
          ...(isSenderInConversation
            ? { deletedForSender: true }
            : { deletedForRecipient: true }),
        },
      });
    }

    return NextResponse.json({
      status: "success",
      message: "Message deleted",
    });
  } catch (error) {
    console.error("Delete message error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to delete message" },
      { status: 500 }
    );
  }
}
