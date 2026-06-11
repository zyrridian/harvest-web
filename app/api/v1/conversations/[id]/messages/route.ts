import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/features/auth";
import prisma from "@/core/database/prisma";

/**
 * @swagger
 * /api/v1/conversations/{id}/messages:
 *   post:
 *     summary: Send a message in conversation
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [text, image, product, order, voice, system]
 *               content:
 *                 type: string
 *               reply_to_message_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a participant
 *       404:
 *         description: Conversation not found
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await verifyAuth(request);
    const { id: conversationId } = await context.params;
    const body = await request.json();

    const { type = "text", content, reply_to_message_id } = body;

    // Verify conversation exists and user is a participant
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json(
        { status: "error", message: "Conversation not found" },
        { status: 404 },
      );
    }

    if (
      conversation.participant1Id !== payload.userId &&
      conversation.participant2Id !== payload.userId
    ) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 403 },
      );
    }

    // Validate content for text messages
    if (type === "text" && (!content || content.trim() === "")) {
      return NextResponse.json(
        { status: "error", message: "Message content is required" },
        { status: 400 },
      );
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: payload.userId,
        type: type.toUpperCase() as any,
        content: content || null,
        replyToMessageId: reply_to_message_id || null,
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(
      {
        status: "success",
        data: {
          message_id: message.id,
          conversation_id: conversationId,
          sender_id: payload.userId,
          type: message.type.toLowerCase(),
          content: message.content,
          timestamp: message.createdAt.toISOString(),
          is_read: false,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to send message" },
      { status: 500 },
    );
  }
}
