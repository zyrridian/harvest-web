"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Loader2,
  User,
  MoreVertical,
  Package,
  Check,
  CheckCheck,
  Paperclip,
  Clock,
  ShoppingBag,
} from "lucide-react";
import { getSocket } from "@/core/services/socket";

// Design System Colors
const colors = {
  background: "#FAFAF9",
  white: "#FFFFFF",
  heading: "#18181b",
  body: "#475569",
  accent: "#166534",
  accentHover: "#14532d",
  border: "#E4E4E7",
  success: "#16a34a",
  successBg: "#dcfce7",
  error: "#dc2626",
  errorBg: "#fee2e2",
  messageSent: "#166534",
  messageReceived: "#FFFFFF",
};

interface Participant {
  user_id: string;
  name: string;
  profile_picture: string | null;
  is_online: boolean;
  last_seen: string | null;
}

interface Message {
  message_id: string;
  sender_id: string;
  sender_name: string;
  type: string;
  content: string | null;
  timestamp: string;
  is_read: boolean;
  read_at: string | null;
  is_edited: boolean;
}

interface ProductContext {
  id: string;
  name: string;
  price: number;
  currency: string;
  unit: string;
  image: string | null;
  slug: string;
}

interface ConversationData {
  conversation_id: string;
  type: string;
  participant: Participant;
  order: { order_id: string; order_number: string; status: string } | null;
  product?: ProductContext | null;
  messages: Message[];
}

function ChatContent() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;

  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false); // other user typing
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const token = useRef<string | null>(null);

  useEffect(() => {
    token.current = localStorage.getItem("accessToken");
    if (!token.current) {
      router.push("/login");
      return;
    }
    fetchCurrentUser();
    fetchConversation();
  }, [conversationId]);

  // Initialize socket after we have currentUserId
  useEffect(() => {
    if (!currentUserId || !token.current) return;

    const socket = getSocket(token.current);
    socketRef.current = socket;

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit("conversation:join", { conversation_id: conversationId });
      // Mark messages as read when joining
      socket.emit("message:read", { conversation_id: conversationId });
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", () => setIsConnected(false));

    // New message received
    socket.on("message:new", (data: any) => {
      console.log("[Socket] message:new", data);
      if (data.conversation_id !== conversationId) return;

      setMessages((prev) => {
        // Replace temp message if it was sent by us
        if (data.temp_id) {
          const tempIdx = prev.findIndex((m) => m.message_id === data.temp_id);
          if (tempIdx !== -1) {
            const updated = [...prev];
            updated[tempIdx] = {
              ...updated[tempIdx],
              message_id: data.message_id,
            };
            return updated;
          }
        }
        // Add new message from other user
        if (data.sender_id !== currentUserId) {
          // Mark as read immediately since we're in the conversation
          socket.emit("message:read", { conversation_id: conversationId });
          return [
            ...prev,
            {
              message_id: data.message_id,
              sender_id: data.sender_id,
              sender_name: data.sender_name,
              type: data.type,
              content: data.content,
              timestamp: data.timestamp,
              is_read: false,
              read_at: null,
              is_edited: false,
            },
          ];
        }
        return prev;
      });
    });

    // Read ack
    socket.on("message:read_ack", (data: any) => {
      console.log("[Socket] message:read_ack", data);
      if (data.conversation_id !== conversationId) return;
      if (data.reader_id !== currentUserId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.sender_id === currentUserId && !m.is_read
              ? { ...m, is_read: true, read_at: new Date().toISOString() }
              : m,
          ),
        );
      }
    });

    // Typing indicators
    socket.on("typing:start", (data: any) => {
      console.log("[Socket] typing:start", data);
      if (data.conversation_id === conversationId && data.user_id !== currentUserId) {
        setIsTyping(true);
      }
    });

    socket.on("typing:stop", (data: any) => {
      console.log("[Socket] typing:stop", data);
      if (data.conversation_id === conversationId && data.user_id !== currentUserId) {
        setIsTyping(false);
      }
    });

    // Online status
    socket.on("user:online", (data: any) => {
      if (data.userId === conversation?.participant.user_id) {
        setConversation((prev) =>
          prev ? { ...prev, participant: { ...prev.participant, is_online: true } } : prev,
        );
      }
    });

    socket.on("user:offline", (data: any) => {
      if (data.userId === conversation?.participant.user_id) {
        setConversation((prev) =>
          prev
            ? {
              ...prev,
              participant: {
                ...prev.participant,
                is_online: false,
                last_seen: data.last_seen,
              },
            }
            : prev,
        );
      }
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("message:new");
      socket.off("message:read_ack");
      socket.off("typing:start");
      socket.off("typing:stop");
      socket.off("user:online");
      socket.off("user:offline");
    };
  }, [currentUserId, conversationId, conversation?.participant.user_id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${token.current}` },
      });
      const data = await response.json();
      if (response.ok) {
        setCurrentUserId(data.data.id);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    }
  };

  const fetchConversation = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token.current}` },
      });
      const data = await response.json();

      if (response.ok) {
        setConversation(data.data);
        setMessages(data.data.messages);
      } else if (response.status === 404) {
        router.push("/messages");
      }
    } catch (error) {
      console.error("Failed to fetch conversation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";

    // Typing indicator
    if (socketRef.current && isConnected) {
      socketRef.current.emit("typing:start", { conversation_id: conversationId });
      if (typingTimeout) clearTimeout(typingTimeout);
      const t = setTimeout(() => {
        socketRef.current?.emit("typing:stop", { conversation_id: conversationId });
      }, 2000);
      setTypingTimeout(t);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    const messageContent = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    setNewMessage("");
    setIsSending(true);

    // Stop typing indicator
    if (typingTimeout) clearTimeout(typingTimeout);
    socketRef.current?.emit("typing:stop", { conversation_id: conversationId });

    // Optimistic update
    const tempMessage: Message = {
      message_id: tempId,
      sender_id: currentUserId || "",
      sender_name: "You",
      type: "text",
      content: messageContent,
      timestamp: new Date().toISOString(),
      is_read: false,
      read_at: null,
      is_edited: false,
    };
    setMessages((prev) => [...prev, tempMessage]);

    if (socketRef.current && isConnected) {
      // Send via socket
      socketRef.current.emit("message:send", {
        conversation_id: conversationId,
        content: messageContent,
        type: "text",
        temp_id: tempId,
      });
      setIsSending(false);
    } else {
      // Fallback: REST API
      try {
        const response = await fetch(
          `/api/v1/conversations/${conversationId}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token.current}`,
            },
            body: JSON.stringify({ type: "text", content: messageContent }),
          },
        );

        const data = await response.json();
        if (response.ok) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.message_id === tempId
                ? { ...msg, message_id: data.data.message_id }
                : msg,
            ),
          );
        } else {
          setMessages((prev) => prev.filter((msg) => msg.message_id !== tempId));
          setNewMessage(messageContent);
        }
      } catch (error) {
        setMessages((prev) => prev.filter((msg) => msg.message_id !== tempId));
        setNewMessage(messageContent);
      } finally {
        setIsSending(false);
      }
    }

    inputRef.current?.focus();
  };

  const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  };

  const getLastSeenText = (lastSeen: string | null) => {
    if (!lastSeen) return "Offline";
    const diffMins = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return new Date(lastSeen).toLocaleDateString();
  };

  // Group messages by date
  const groupedMessages = messages.reduce(
    (groups, message) => {
      const date = formatDate(message.timestamp);
      if (!groups[date]) groups[date] = [];
      groups[date].push(message);
      return groups;
    },
    {} as Record<string, Message[]>,
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background }}>
        <Loader2 size={32} className="animate-spin" style={{ color: colors.accent }} />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: colors.background }}>
        <p className="text-lg mb-4" style={{ color: colors.heading }}>Conversation not found</p>
        <Link href="/messages" className="px-4 py-2 rounded-lg" style={{ backgroundColor: colors.accent, color: colors.white }}>
          Back to Messages
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40 border-b flex-shrink-0"
        style={{ backgroundColor: colors.white, borderColor: colors.border }}
      >
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/messages")}
              className="p-1 -ml-1"
              style={{ color: colors.heading }}
            >
              <ArrowLeft size={24} />
            </button>

            {/* User info */}
            <Link
              href={`/farmers/${conversation.participant.user_id}`}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <div className="relative flex-shrink-0">
                {conversation.participant.profile_picture ? (
                  <img
                    src={conversation.participant.profile_picture}
                    alt={conversation.participant.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: colors.border }}
                  >
                    <User size={20} style={{ color: colors.body }} />
                  </div>
                )}
                {conversation.participant.is_online && (
                  <div
                    className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                    style={{ backgroundColor: colors.success, borderColor: colors.white }}
                  />
                )}
              </div>

              <div className="min-w-0">
                <h2 className="font-medium text-sm truncate" style={{ color: colors.heading }}>
                  {conversation.participant.name}
                </h2>
                <p className="text-xs" style={{ color: colors.body }}>
                  {isTyping
                    ? "typing..."
                    : conversation.participant.is_online
                      ? "Online"
                      : getLastSeenText(conversation.participant.last_seen)}
                </p>
              </div>
            </Link>

            {/* Connection indicator */}
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: isConnected ? colors.success : colors.body }}
                title={isConnected ? "Real-time connected" : "Polling mode"}
              />
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 rounded-full transition-colors hover:bg-zinc-100"
                  style={{ color: colors.body }}
                >
                  <MoreVertical size={20} />
                </button>

                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <div
                      className="absolute right-0 top-full mt-1 w-48 rounded-lg shadow-lg border z-50"
                      style={{ backgroundColor: colors.white, borderColor: colors.border }}
                    >
                      <Link
                        href={`/farmers/${conversation.participant.user_id}`}
                        className="block w-full px-4 py-2 text-left text-sm hover:bg-zinc-50"
                        style={{ color: colors.heading }}
                        onClick={() => setShowMenu(false)}
                      >
                        View Profile
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Order info bar */}
          {conversation.order && (
            <Link
              href={`/orders/${conversation.order.order_id}`}
              className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ backgroundColor: colors.successBg }}
            >
              <Package size={16} style={{ color: colors.accent }} />
              <span className="text-sm font-medium" style={{ color: colors.accent }}>
                Order {conversation.order.order_number}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ backgroundColor: colors.white, color: colors.accent }}>
                {conversation.order.status.replace("_", " ")}
              </span>
            </Link>
          )}

          {/* Product context banner */}
          {conversation.product && (
            <Link
              href={`/products/${conversation.product.slug || conversation.product.id}`}
              className="mt-2 flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{ backgroundColor: "#f0fdf4", border: `1px solid ${colors.border}` }}
            >
              {conversation.product.image ? (
                <img
                  src={conversation.product.image}
                  alt={conversation.product.name}
                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: colors.successBg }}>
                  <ShoppingBag size={18} style={{ color: colors.accent }} />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: colors.heading }}>
                  {conversation.product.name}
                </p>
                <p className="text-xs" style={{ color: colors.accent }}>
                  {conversation.product.currency} {Number(conversation.product.price).toLocaleString()}/{conversation.product.unit}
                </p>
              </div>
              <span className="text-xs ml-auto flex-shrink-0" style={{ color: colors.body }}>View</span>
            </Link>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date}>
              <div className="flex items-center justify-center my-4">
                <span className="px-3 py-1 text-xs rounded-full" style={{ backgroundColor: colors.border, color: colors.body }}>
                  {date}
                </span>
              </div>

              <div className="space-y-2">
                {dateMessages.map((message) => {
                  const isSent = message.sender_id === currentUserId;
                  const isTemp = message.message_id.startsWith("temp-");

                  return (
                    <div key={message.message_id} className={`flex ${isSent ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] px-4 py-2 rounded-2xl ${isSent ? "rounded-br-md" : "rounded-bl-md"}`}
                        style={{
                          backgroundColor: isSent ? colors.messageSent : colors.messageReceived,
                          color: isSent ? colors.white : colors.heading,
                          border: isSent ? "none" : `1px solid ${colors.border}`,
                          opacity: isTemp ? 0.7 : 1,
                        }}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        <div className={`flex items-center gap-1 mt-1 ${isSent ? "justify-end" : "justify-start"}`}>
                          <span className="text-[10px]" style={{ color: isSent ? "rgba(255,255,255,0.7)" : colors.body }}>
                            {formatTime(message.timestamp)}
                          </span>
                          {message.is_edited && (
                            <span className="text-[10px]" style={{ color: isSent ? "rgba(255,255,255,0.7)" : colors.body }}>
                              • edited
                            </span>
                          )}
                          {isSent && (
                            isTemp ? (
                              <Clock size={12} style={{ color: "rgba(255,255,255,0.7)" }} />
                            ) : message.is_read ? (
                              <CheckCheck size={14} style={{ color: colors.successBg }} />
                            ) : (
                              <Check size={14} style={{ color: "rgba(255,255,255,0.7)" }} />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div
                className="px-4 py-3 rounded-2xl rounded-bl-md"
                style={{ backgroundColor: colors.messageReceived, border: `1px solid ${colors.border}` }}
              >
                <div className="flex gap-1 items-center">
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: colors.body, animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: colors.body, animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: colors.body, animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div
        className="sticky bottom-0 border-t flex-shrink-0"
        style={{ backgroundColor: colors.white, borderColor: colors.border }}
      >
        <form onSubmit={handleSendMessage} className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-end gap-2 p-2 rounded-2xl" style={{ backgroundColor: colors.background }}>
            <button
              type="button"
              className="p-2 rounded-full transition-colors hover:bg-zinc-200"
              style={{ color: colors.body }}
              title="Attach file (Coming soon)"
            >
              <Paperclip size={20} />
            </button>

            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 bg-transparent resize-none text-sm py-2 focus:outline-none"
              style={{ color: colors.heading, maxHeight: "120px" }}
            />

            <button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className="p-2 rounded-full transition-colors disabled:opacity-50"
              style={{
                backgroundColor: newMessage.trim() ? colors.accent : colors.border,
                color: colors.white,
              }}
            >
              {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FAFAF9" }}>
          <Loader2 size={32} className="animate-spin" style={{ color: "#166534" }} />
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
