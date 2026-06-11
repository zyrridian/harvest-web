import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/features/auth";
import prisma from "@/core/database/prisma";

/**
 * @swagger
 * /api/v1/search/history:
 *   get:
 *     summary: Get user's search history
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum results
 *     responses:
 *       200:
 *         description: Search history
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get("limit") || "10");

    const history = await prisma.searchHistory.findMany({
      where: {
        userId: payload.userId,
      },
      orderBy: {
        searchedAt: "desc",
      },
      take: limit,
    });

    const data = history.map((item) => ({
      id: item.id,
      query: item.query,
      result_count: item.resultCount,
      searched_at: item.searchedAt.toISOString(),
    }));

    return NextResponse.json({
      status: "success",
      data,
    });
  } catch (error) {
    console.error("Get search history error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to fetch search history" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/v1/search/history:
 *   delete:
 *     summary: Clear all search history
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Search history cleared
 *       401:
 *         description: Unauthorized
 */
export async function DELETE(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);

    await prisma.searchHistory.deleteMany({
      where: {
        userId: payload.userId,
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Search history cleared",
    });
  } catch (error) {
    console.error("Clear search history error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to clear search history" },
      { status: 500 },
    );
  }
}
