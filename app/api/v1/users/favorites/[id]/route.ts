import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/features/auth";
import prisma from "@/core/database/prisma";

/**
 * @swagger
 * /api/v1/users/favorites/{id}:
 *   delete:
 *     summary: Remove a favorite
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Favorite ID
 *     responses:
 *       200:
 *         description: Favorite removed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Favorite not found
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await verifyAuth(request);
    const { id } = await context.params;

    // Find and verify ownership
    const favorite = await prisma.favorite.findUnique({
      where: { id },
    });

    if (!favorite) {
      return NextResponse.json(
        { status: "error", message: "Favorite not found" },
        { status: 404 },
      );
    }

    if (favorite.userId !== payload.userId) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 403 },
      );
    }

    // Delete favorite
    await prisma.favorite.delete({
      where: { id },
    });

    return NextResponse.json({
      status: "success",
      message: "Favorite removed",
    });
  } catch (error: any) {
    console.error("Delete favorite error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to remove favorite" },
      { status: 500 },
    );
  }
}
