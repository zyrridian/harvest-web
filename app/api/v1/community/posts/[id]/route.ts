import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";

/**
 * @swagger
 * /api/v1/community/posts/{id}:
 *   get:
 *     summary: Get a community post by ID
 *     tags: [Community]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post details
 *       404:
 *         description: Post not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    let userId: string | undefined;
    try {
      const user = await verifyAuth(request);
      userId = user.userId;
    } catch {
      // Allow unauthenticated access
    }

    const post = await prisma.communityPost.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true, userType: true },
        },
        farmer: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            isVerified: true,
          },
        },
        images: { orderBy: { displayOrder: "asc" } },
        tags: true,
        _count: { select: { likes: true, comments: true } },
      },
    });

    if (!post) {
      throw AppError.notFound("Post not found");
    }

    let isLikedByUser = false;
    if (userId) {
      const like = await prisma.postLike.findUnique({
        where: { postId_userId: { postId: id, userId } },
      });
      isLikedByUser = !!like;
    }

    return successResponse({ ...post, is_liked_by_user: isLikedByUser });
  } catch (error) {
    return handleRouteError(error, "Get community post");
  }
}

/**
 * @swagger
 * /api/v1/community/posts/{id}:
 *   put:
 *     summary: Update a community post
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await verifyAuth(request);
    const body = await request.json();

    const post = await prisma.communityPost.findUnique({ where: { id } });
    if (!post) throw AppError.notFound("Post not found");
    if (post.userId !== user.userId)
      throw AppError.forbidden("Not authorized to update this post");

    const updateData: Record<string, unknown> = {};
    if (body.title) updateData.title = body.title;
    if (body.content) updateData.content = body.content;

    const updated = await prisma.communityPost.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        images: true,
        tags: true,
      },
    });

    return successResponse(updated, { message: "Post updated successfully" });
  } catch (error) {
    return handleRouteError(error, "Update community post");
  }
}

/**
 * @swagger
 * /api/v1/community/posts/{id}:
 *   delete:
 *     summary: Delete a community post
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await verifyAuth(request);

    const post = await prisma.communityPost.findUnique({ where: { id } });
    if (!post) throw AppError.notFound("Post not found");
    if (post.userId !== user.userId)
      throw AppError.forbidden("Not authorized to delete this post");

    await prisma.communityPost.delete({ where: { id } });

    return successResponse(undefined, { message: "Post deleted successfully" });
  } catch (error) {
    return handleRouteError(error, "Delete community post");
  }
}
