import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/features/auth";
import prisma from "@/core/database/prisma";

/**
 * @swagger
 * /api/v1/search/history/{id}:
 *   delete:
 *     summary: Delete a search history item
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Search history item ID
 *     responses:
 *       200:
 *         description: Search history item deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Item not found
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const payload = await verifyAuth(request);

    // Find and verify ownership
    const historyItem = await prisma.searchHistory.findUnique({
      where: { id },
    });

    if (!historyItem) {
      return NextResponse.json(
        { status: "error", message: "Search history item not found" },
        { status: 404 },
      );
    }

    if (historyItem.userId !== payload.userId) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 403 },
      );
    }

    // Delete the item
    await prisma.searchHistory.delete({
      where: { id },
    });

    return NextResponse.json({
      status: "success",
      message: "Search history item deleted",
    });
  } catch (error) {
    console.error("Delete search history item error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to delete search history item" },
      { status: 500 },
    );
  }
}
