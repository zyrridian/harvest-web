import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/features/auth";
import {
  DeleteAdminPostUseCase,
  communityRepository,
} from "@/features/community";
import { handleRouteError } from "@/core/errors";

/**
 * @swagger
 * /api/v1/admin/community/posts/{id}:
 *   delete:
 *     summary: Delete a community post (moderation)
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
 *         description: Post deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Post not found
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await verifyAdmin(request);

    const useCase = new DeleteAdminPostUseCase(communityRepository);
    await useCase.execute(id);

    return NextResponse.json({
      status: "success",
      message: "Post deleted successfully",
    });
  } catch (error) {
    return handleRouteError(error, "Delete admin post");
  }
}
