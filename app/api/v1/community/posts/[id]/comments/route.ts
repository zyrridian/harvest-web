import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import {
  parsePagination,
  buildPaginationMeta,
} from "@/core/helpers/pagination";

const commentInclude = {
  user: { select: { id: true, name: true, avatarUrl: true } },
  replyToUser: { select: { id: true, name: true } },
  _count: { select: { likes: true } },
};

/**
 * @swagger
 * /api/v1/community/posts/{id}/comments:
 *   get:
 *     summary: Get comments for a post (top-level with replies)
 *     tags: [Community]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    let userId: string | undefined;
    try {
      const user = await verifyAuth(request);
      userId = user.userId;
    } catch {
      // Allow unauthenticated access
    }

    const post = await prisma.communityPost.findUnique({ where: { id } });
    if (!post) throw AppError.notFound("Post not found");

    // Only fetch top-level comments (parentId is null)
    const [comments, total] = await Promise.all([
      prisma.postComment.findMany({
        where: { postId: id, parentId: null },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          ...commentInclude,
          replies: {
            orderBy: { createdAt: "asc" },
            include: commentInclude,
          },
        },
      }),
      prisma.postComment.count({ where: { postId: id, parentId: null } }),
    ]);

    // Gather all comment IDs (top-level + replies) for like status
    const allCommentIds: string[] = [];
    for (const c of comments) {
      allCommentIds.push(c.id);
      for (const r of c.replies) {
        allCommentIds.push(r.id);
      }
    }

    let likedCommentIds = new Set<string>();
    if (userId && allCommentIds.length > 0) {
      const userLikes = await prisma.commentLike.findMany({
        where: { userId, commentId: { in: allCommentIds } },
        select: { commentId: true },
      });
      likedCommentIds = new Set(userLikes.map((l) => l.commentId));
    }

    const commentsWithStatus = comments.map((c) => ({
      ...c,
      is_liked_by_user: likedCommentIds.has(c.id),
      replies: c.replies.map((r) => ({
        ...r,
        is_liked_by_user: likedCommentIds.has(r.id),
      })),
    }));

    return successResponse({
      comments: commentsWithStatus,
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (error) {
    return handleRouteError(error, "Get comments");
  }
}

/**
 * @swagger
 * /api/v1/community/posts/{id}/comments:
 *   post:
 *     summary: Add a comment or reply to a post
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *               parent_id:
 *                 type: string
 *                 description: ID of parent comment (for replies)
 *               reply_to_user_id:
 *                 type: string
 *                 description: ID of user being replied to (for @mention)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await verifyAuth(request);
    const body = await request.json();
    const { content, parent_id, reply_to_user_id } = body;

    if (!content) throw AppError.badRequest("Content is required");

    const post = await prisma.communityPost.findUnique({ where: { id } });
    if (!post) throw AppError.notFound("Post not found");

    // If this is a reply, validate the parent comment exists and belongs to this post
    let actualParentId = parent_id || null;
    let actualReplyToUserId = reply_to_user_id || null;

    if (actualParentId) {
      const parentComment = await prisma.postComment.findUnique({
        where: { id: actualParentId },
      });
      if (!parentComment || parentComment.postId !== id) {
        throw AppError.badRequest("Invalid parent comment");
      }
      // If the parent itself is a reply, attach to the root parent instead (flat, one level only)
      if (parentComment.parentId) {
        actualParentId = parentComment.parentId;
        // Keep the reply_to_user_id as-is so the @mention is correct
        if (!actualReplyToUserId) {
          actualReplyToUserId = parentComment.userId;
        }
      } else {
        // Replying to a top-level comment, set reply_to_user_id if not provided
        if (!actualReplyToUserId) {
          actualReplyToUserId = parentComment.userId;
        }
      }
    }

    const [comment] = await prisma.$transaction([
      prisma.postComment.create({
        data: {
          postId: id,
          userId: user.userId,
          parentId: actualParentId,
          replyToUserId: actualReplyToUserId,
          content,
        },
        include: {
          ...commentInclude,
          replies: {
            orderBy: { createdAt: "asc" },
            include: commentInclude,
          },
        },
      }),
      prisma.communityPost.update({
        where: { id },
        data: { commentsCount: { increment: 1 } },
      }),
    ]);

    return successResponse(comment, {
      message: "Comment added successfully",
      status: 201,
    });
  } catch (error) {
    return handleRouteError(error, "Add comment");
  }
}
