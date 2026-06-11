import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";

/**
 * @swagger
 * /api/v1/community/posts/{id}/like:
 *   post:
 *     summary: Like a community post
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await verifyAuth(request);

    const post = await prisma.communityPost.findUnique({ where: { id } });
    if (!post) throw AppError.notFound("Post not found");

    const existingLike = await prisma.postLike.findUnique({
      where: { postId_userId: { postId: id, userId: user.userId } },
    });
    if (existingLike)
      throw AppError.badRequest("You have already liked this post");

    await prisma.$transaction([
      prisma.postLike.create({ data: { postId: id, userId: user.userId } }),
      prisma.communityPost.update({
        where: { id },
        data: { likesCount: { increment: 1 } },
      }),
    ]);

    return successResponse(undefined, { message: "Post liked successfully" });
  } catch (error) {
    return handleRouteError(error, "Like post");
  }
}

/**
 * @swagger
 * /api/v1/community/posts/{id}/like:
 *   delete:
 *     summary: Unlike a community post
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

    const existingLike = await prisma.postLike.findUnique({
      where: { postId_userId: { postId: id, userId: user.userId } },
    });
    if (!existingLike)
      throw AppError.badRequest("You have not liked this post");

    await prisma.$transaction([
      prisma.postLike.delete({
        where: { postId_userId: { postId: id, userId: user.userId } },
      }),
      prisma.communityPost.update({
        where: { id },
        data: { likesCount: { decrement: 1 } },
      }),
    ]);

    return successResponse(undefined, { message: "Post unliked successfully" });
  } catch (error) {
    return handleRouteError(error, "Unlike post");
  }
}
