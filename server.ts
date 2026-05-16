import "dotenv/config";
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer, Socket } from "socket.io";
import { verifyToken } from "./app/features/auth/application/services/token.service";
import prisma from "./app/core/database/prisma";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Track online users: userId -> Set of socket IDs
const onlineUsers = new Map<string, Set<string>>();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("Internal server error");
    }
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/api/socket",
  });

  // Middleware: authenticate socket connection
  io.use(async (socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        (socket.handshake.query.token as string) ||
        socket.handshake.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const payload = await verifyToken(token);
      if (!payload || payload.type !== "access") {
        return next(new Error("Invalid token"));
      }

      (socket as any).userId = payload.userId;
      next();
    } catch (err) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", async (socket: Socket) => {
    const userId = (socket as any).userId as string;
    console.log(`[Socket] User ${userId} connected — socket ${socket.id}`);

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Generic listener for debugging incoming events
    socket.onAny((eventName, ...args) => {
      console.log(
        `[Socket event from ${userId}]: ${eventName}`,
        JSON.stringify(args).slice(0, 300),
      );
    });

    // Mark user online in DB
    await prisma.user
      .update({
        where: { id: userId },
        data: { isOnline: true },
      })
      .catch(() => {});

    // Join all conversation rooms for this user
    const conversations = await prisma.conversation
      .findMany({
        where: {
          OR: [{ participant1Id: userId }, { participant2Id: userId }],
        },
        select: { id: true },
      })
      .catch(() => []);

    for (const conv of conversations) {
      socket.join(`conversation:${conv.id}`);
    }

    // Broadcast online status to contacts
    socket.broadcast.emit("user:online", { userId });

    // ─────────────────────────────────────────────
    // EVENT: Send a message
    // ─────────────────────────────────────────────
    socket.on("message:send", async (data: any) => {
      try {
        if (typeof data === "string") {
          try {
            data = JSON.parse(data);
          } catch (e) {}
        }
        const { conversation_id, content, type = "text", temp_id } = data || {};

        if (!content?.trim()) {
          console.log(`[Socket warning] message:send got empty content:`, data);
          return;
        }

        // Verify user is participant
        const conversation = await prisma.conversation.findFirst({
          where: {
            id: conversation_id,
            OR: [{ participant1Id: userId }, { participant2Id: userId }],
          },
        });

        if (!conversation) {
          socket.emit("error", { message: "Conversation not found" });
          return;
        }

        // Save message to DB
        const message = await prisma.message.create({
          data: {
            conversationId: conversation_id,
            senderId: userId,
            type: type.toUpperCase() as any,
            content: content.trim(),
          },
          include: {
            sender: { select: { id: true, name: true, avatarUrl: true } },
          },
        });

        // Update conversation timestamp
        await prisma.conversation.update({
          where: { id: conversation_id },
          data: { updatedAt: new Date() },
        });

        const messagePayload = {
          message_id: message.id,
          temp_id,
          conversation_id,
          sender_id: message.senderId,
          sender_name: message.sender.name,
          sender_avatar: message.sender.avatarUrl,
          type: message.type.toLowerCase(),
          content: message.content,
          timestamp: message.createdAt.toISOString(),
          is_read: false,
          is_edited: false,
        };

        // Emit to all participants in the room
        io.to(`conversation:${conversation_id}`).emit(
          "message:new",
          messagePayload,
        );

        // Emit unread notification to recipient if they're online
        const recipientId =
          conversation.participant1Id === userId
            ? conversation.participant2Id
            : conversation.participant1Id;

        if (onlineUsers.has(recipientId)) {
          io.to(`conversation:${conversation_id}`).emit("conversation:update", {
            conversation_id,
            last_message: messagePayload,
          });
        }
      } catch (err) {
        console.error("[Socket] message:send error:", err);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // ─────────────────────────────────────────────
    // EVENT: Mark messages as read
    // ─────────────────────────────────────────────
    socket.on("message:read", async (data: any) => {
      try {
        if (typeof data === "string") {
          try {
            data = JSON.parse(data);
          } catch (e) {}
        }
        const { conversation_id } = data || {};
        if (!conversation_id) return;

        await prisma.message.updateMany({
          where: {
            conversationId: conversation_id,
            senderId: { not: userId },
            isRead: false,
          },
          data: { isRead: true, readAt: new Date() },
        });

        // Notify sender that messages were read
        io.to(`conversation:${conversation_id}`).emit("message:read_ack", {
          conversation_id,
          reader_id: userId,
        });
      } catch (err) {
        console.error("[Socket] message:read error:", err);
      }
    });

    // ─────────────────────────────────────────────
    // EVENT: Typing indicator
    // ─────────────────────────────────────────────
    socket.on("typing:start", (data: any) => {
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (e) {}
      }
      if (!data?.conversation_id) return;
      socket.to(`conversation:${data.conversation_id}`).emit("typing:start", {
        conversation_id: data.conversation_id,
        user_id: userId,
      });
    });

    socket.on("typing:stop", (data: any) => {
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (e) {}
      }
      if (!data?.conversation_id) return;
      socket.to(`conversation:${data.conversation_id}`).emit("typing:stop", {
        conversation_id: data.conversation_id,
        user_id: userId,
      });
    });

    // ─────────────────────────────────────────────
    // EVENT: Join a new conversation room
    // ─────────────────────────────────────────────
    socket.on("conversation:join", (data: any) => {
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (e) {}
      }
      if (data?.conversation_id) {
        socket.join(`conversation:${data.conversation_id}`);
      }
    });

    // ─────────────────────────────────────────────
    // DISCONNECT
    // ─────────────────────────────────────────────
    socket.on("disconnect", async () => {
      console.log(`[Socket] User ${userId} disconnected — socket ${socket.id}`);

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);

          // Mark offline in DB
          await prisma.user
            .update({
              where: { id: userId },
              data: { isOnline: false, lastSeen: new Date() },
            })
            .catch(() => {});

          socket.broadcast.emit("user:offline", {
            userId,
            last_seen: new Date().toISOString(),
          });
        }
      }
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
