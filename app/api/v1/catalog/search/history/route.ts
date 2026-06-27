import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/features/auth";
import { searchRepository } from "@/features/catalog/infrastructure/repositories/prisma-search.repository";
import { GetSearchHistoryUseCase, ClearSearchHistoryUseCase } from "@/features/catalog/application/usecases/search/search-history.usecases";

/**
 * @swagger
 * /api/v1/catalog/search/history:
 *   get:
 *     summary: Get user's search history
 *     tags: [Catalog]
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

    const useCase = new GetSearchHistoryUseCase(searchRepository);
    const data = await useCase.execute(payload.userId, limit);

    return NextResponse.json({
      status: "success",
      data,
    });
  } catch (error: any) {
    console.error("Get search history error:", error);
    if (error.name === "AppError") {
      return NextResponse.json(
        { status: "error", message: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { status: "error", message: "Failed to fetch search history" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/v1/catalog/search/history:
 *   delete:
 *     summary: Clear all search history
 *     tags: [Catalog]
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

    const useCase = new ClearSearchHistoryUseCase(searchRepository);
    await useCase.execute(payload.userId);

    return NextResponse.json({
      status: "success",
      message: "Search history cleared",
    });
  } catch (error: any) {
    console.error("Clear search history error:", error);
    if (error.name === "AppError") {
      return NextResponse.json(
        { status: "error", message: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { status: "error", message: "Failed to clear search history" },
      { status: 500 },
    );
  }
}
