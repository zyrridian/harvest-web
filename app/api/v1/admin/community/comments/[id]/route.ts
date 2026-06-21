import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/features/auth";
import {
  DeleteAdminCommentUseCase,
  communityRepository,
} from "@/features/community";
import { handleRouteError } from "@/core/errors";

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

    const useCase = new DeleteAdminCommentUseCase(communityRepository);
    await useCase.execute(id);

    return NextResponse.json({
      status: "success",
      message: "Comment deleted successfully",
    });
  } catch (error) {
    return handleRouteError(error, "Delete admin comment");
  }
}
