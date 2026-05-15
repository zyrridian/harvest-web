import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/features/auth";
import prisma from "@/core/database/prisma";

/**
 * @swagger
 * /api/v1/conversations/{id}:
 *   get:
 *     summary: Get conversation details and messages
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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Messages per page
 *       - in: query
 *         name: before_message_id
 *         schema:
 *           type: string
 *         description: Load messages before this ID
 *     responses:
 *       200:
 *         description: Conversation details with messages
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a participant
 *       404:
 *         description: Conversation not found
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await verifyAuth(request);
    const { id: conversationId } = await context.params;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const beforeMessageId = searchParams.get("before_message_id");
    const skip = (page - 1) * limit;

    // Get conversation and verify participation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participant1: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            isOnline: true,
            lastSeen: true,
          },
        },
        participant2: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            isOnline: true,
            lastSeen: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { status: "error", message: "Conversation not found" },
        { status: 404 },
      );
    }

    // Verify user is a participant
    if (
      conversation.participant1Id !== payload.userId &&
      conversation.participant2Id !== payload.userId
    ) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized access to conversation" },
        { status: 403 },
      );
    }

    // Determine other participant
    const otherParticipant =
      conversation.participant1Id === payload.userId
        ? conversation.participant2
        : conversation.participant1;

    // Build message filters
    const messageWhere: any = {
      conversationId,
    };

    // Filter deleted messages based on user
    if (conversation.participant1Id === payload.userId) {
      messageWhere.deletedForSender = false;
    } else {
      messageWhere.deletedForRecipient = false;
    }

    if (beforeMessageId) {
      const beforeMessage = await prisma.message.findUnique({
        where: { id: beforeMessageId },
        select: { createdAt: true },
      });

      if (beforeMessage) {
        messageWhere.createdAt = { lt: beforeMessage.createdAt };
      }
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: messageWhere,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
        images: true,
      },
    });

    // Mark messages as read
    const unreadMessageIds = messages
      .filter((m) => m.senderId !== payload.userId && !m.isRead)
      .map((m) => m.id);

    if (unreadMessageIds.length > 0) {
      await prisma.message.updateMany({
        where: {
          id: { in: unreadMessageIds },
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    }

    // Format messages
    const formattedMessages = messages.reverse().map((msg) => ({
      message_id: msg.id,
      sender_id: msg.senderId,
      sender_name: msg.sender.id === payload.userId ? "You" : msg.sender.name,
      type: msg.type.toLowerCase(),
      content: msg.content,
      timestamp: msg.createdAt.toISOString(),
      is_read: msg.isRead,
      read_at: msg.readAt?.toISOString() || null,
      is_edited: msg.isEdited,
      reactions: [], // Placeholder for reactions
    }));

    return NextResponse.json({
      status: "success",
      data: {
        conversation_id: conversation.id,
        type: conversation.type.toLowerCase(),
        participant: {
          user_id: otherParticipant.id,
          name: otherParticipant.name,
          profile_picture: otherParticipant.avatarUrl,
          is_online: otherParticipant.isOnline,
          last_seen: otherParticipant.lastSeen?.toISOString() || null,
        },
        order: conversation.order
          ? {
              order_id: conversation.order.id,
              order_number: conversation.order.orderNumber,
              status: conversation.order.status,
            }
          : null,
        messages: formattedMessages,
        pagination: {
          current_page: page,
          has_next: messages.length === limit,
          has_previous: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get conversation details error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to fetch conversation" },
      { status: 500 },
    );
  }
}
