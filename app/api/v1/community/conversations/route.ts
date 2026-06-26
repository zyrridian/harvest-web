import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/features/auth";
import prisma from "@/core/database/prisma";

/**
 * @swagger
 * /api/v1/community/conversations:
 *   get:
 *     summary: Get user's conversation list
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [all, unread, order, general]
 *         description: Filter conversations
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search conversations
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Conversation list
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    const { searchParams } = new URL(request.url);

    const filter = searchParams.get("filter") || "all"; // all, unread, order, general
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build filters
    const where: any = {
      OR: [
        { participant1Id: payload.userId },
        { participant2Id: payload.userId },
      ],
    };

    if (filter === "order") {
      where.type = "ORDER";
    } else if (filter === "general") {
      where.type = "GENERAL";
    }

    // Get conversations
    const [conversations, total, rawStats] = await Promise.all([
      prisma.conversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          participant1: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              userType: true,
              isOnline: true,
              lastSeen: true,
              profile: {
                select: {
                  responseRate: true,
                  responseTime: true,
                },
              },
            },
          },
          participant2: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              userType: true,
              isOnline: true,
              lastSeen: true,
              profile: {
                select: {
                  responseRate: true,
                  responseTime: true,
                },
              },
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              totalAmount: true,
              items: {
                select: { id: true },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.conversation.count({ where }),
      prisma.$queryRaw`
        SELECT 
          COUNT(DISTINCT m.conversation_id) as unread_conversations,
          COUNT(m.id) as total_unread_messages
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE m.is_read = false 
          AND m.sender_id != ${payload.userId}
          AND (
            (c.participant_1_id = ${payload.userId} AND m.deleted_for_recipient = false) OR
            (c.participant_2_id = ${payload.userId} AND m.deleted_for_sender = false)
          )
      ` as Promise<any[]>,
    ]);

    const stats = {
      unread_conversations: Number(rawStats?.[0]?.unread_conversations || 0),
      total_unread_messages: Number(rawStats?.[0]?.total_unread_messages || 0)
    };

    // Format response
    const formattedConversations = await Promise.all(
      conversations.map(async (conv) => {
        // Determine the other participant
        const otherParticipant =
          conv.participant1Id === payload.userId
            ? conv.participant2
            : conv.participant1;

        // Count unread messages
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: payload.userId },
            isRead: false,
            ...(conv.participant1Id === payload.userId
              ? { deletedForRecipient: false }
              : { deletedForSender: false }),
          },
        });

        const lastMessage = conv.messages[0];
        const isMuted =
          conv.participant1Id === payload.userId
            ? conv.isMutedP1
            : conv.isMutedP2;
        const isPinned =
          conv.participant1Id === payload.userId
            ? conv.isPinnedP1
            : conv.isPinnedP2;

        return {
          conversation_id: conv.id,
          type: conv.type.toLowerCase(),
          participant: {
            user_id: otherParticipant.id,
            name: otherParticipant.name,
            profile_picture: otherParticipant.avatarUrl,
            user_type: otherParticipant.userType.toLowerCase(),
            is_online: otherParticipant.isOnline,
            last_seen: otherParticipant.lastSeen?.toISOString() || null,
            verified: true, // Could add verification field
            response_rate: otherParticipant.profile?.responseRate || 0,
            response_time: otherParticipant.profile?.responseTime || null,
          },
          order: conv.order
            ? {
                order_id: conv.order.id,
                order_number: conv.order.orderNumber,
                status: conv.order.status,
                total_amount: conv.order.totalAmount,
                items_count: conv.order.items.length,
              }
            : null,
          last_message: lastMessage
            ? {
                message_id: lastMessage.id,
                sender_id: lastMessage.senderId,
                sender_name: lastMessage.sender.name,
                type: lastMessage.type.toLowerCase(),
                content: lastMessage.content,
                preview: lastMessage.content?.substring(0, 100) || "",
                timestamp: lastMessage.createdAt.toISOString(),
                is_read: lastMessage.isRead,
              }
            : null,
          unread_count: unreadCount,
          muted: isMuted,
          pinned: isPinned,
          created_at: conv.createdAt.toISOString(),
          updated_at: conv.updatedAt.toISOString(),
        };
      }),
    );

    // Apply search filter if provided
    const filteredConversations = search
      ? formattedConversations.filter((conv) =>
          conv.participant.name.toLowerCase().includes(search.toLowerCase()),
        )
      : formattedConversations;

    // Apply unread filter
    const finalConversations =
      filter === "unread"
        ? filteredConversations.filter((conv) => conv.unread_count > 0)
        : filteredConversations;

    return NextResponse.json({
      status: "success",
      data: {
        conversations: finalConversations,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(total / limit),
          total_items: total,
        },
        stats,
      },
    });
  } catch (error) {
    console.error("Get conversations error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to fetch conversations" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/v1/community/conversations:
 *   post:
 *     summary: Start a new conversation
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipient_id
 *             properties:
 *               recipient_id:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [general, order, product]
 *                 default: general
 *               order_id:
 *                 type: string
 *               product_id:
 *                 type: string
 *               initial_message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Conversation started
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Recipient not found
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    const body = await request.json();

    const {
      recipient_id,
      type = "general",
      order_id,
      product_id,
      initial_message,
    } = body;

    if (!recipient_id) {
      return NextResponse.json(
        { status: "error", message: "Recipient ID is required" },
        { status: 400 },
      );
    }

    // Check if recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipient_id },
    });

    if (!recipient) {
      return NextResponse.json(
        { status: "error", message: "Recipient not found" },
        { status: 404 },
      );
    }

    // Check for existing conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          {
            participant1Id: payload.userId,
            participant2Id: recipient_id,
            orderId: order_id || null,
          },
          {
            participant1Id: recipient_id,
            participant2Id: payload.userId,
            orderId: order_id || null,
          },
        ],
      },
    });

    // Create conversation if it doesn't exist
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          type: type.toUpperCase() as any,
          participant1Id: payload.userId,
          participant2Id: recipient_id,
          orderId: order_id || null,
          productId: product_id || null,
        },
      });
    }

    // Send initial message if provided
    let message = null;
    if (initial_message) {
      message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: payload.userId,
          type: "TEXT",
          content: initial_message,
        },
      });

      // Update conversation timestamp
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });
    }

    return NextResponse.json(
      {
        status: "success",
        message: "Conversation started",
        data: {
          conversation_id: conversation.id,
          message_id: message?.id || null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Start conversation error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to start conversation" },
      { status: 500 },
    );
  }
}
