import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAdmin } from "@/features/auth";

/**
 * @swagger
 * /api/v1/admin/community/comments/{id}:
 *   delete:
 *     summary: Delete a comment (moderation)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Comment not found
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await verifyAdmin(request);

    const comment = await prisma.postComment.findUnique({
      where: { id },
    });

    if (!comment) {
      return NextResponse.json(
        {
          status: "error",
          message: "Comment not found",
        },
        { status: 404 },
      );
    }

    await prisma.$transaction([
      prisma.postComment.delete({
        where: { id },
      }),
      prisma.communityPost.update({
        where: { id: comment.postId },
        data: {
          commentsCount: {
            decrement: 1,
          },
        },
      }),
    ]);

    return NextResponse.json({
      status: "success",
      message: "Comment deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete comment error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error.message || "Failed to delete comment",
      },
      { status: error.status || 500 },
    );
  }
}
