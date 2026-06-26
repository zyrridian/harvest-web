import { NextRequest, NextResponse } from "next/server";
import { farmerRepository } from "@/features/catalog/infrastructure/repositories/prisma-farmer.repository";
import { GetFarmersUseCase } from "@/features/catalog/application/usecases/search/get-farmers.usecase";
import { SearchFarmersSchema } from "@/features/catalog/validation/search.schema";

/**
 * @swagger
 * /api/v1/catalog/search/farmers:
 *   get:
 *     summary: Search for farmers/sellers
 *     tags: [Catalog]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: specialties
 *         schema:
 *           type: string
 *         description: Comma-separated specialties
 *       - in: query
 *         name: min_rating
 *         schema:
 *           type: number
 *         description: Minimum rating
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Missing search query
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const queryParams = Object.fromEntries(searchParams.entries());
    const validationResult = SearchFarmersSchema.safeParse(queryParams);

    if (!validationResult.success) {
      return NextResponse.json(
        { status: "error", message: "Invalid query parameters" },
        { status: 400 },
      );
    }

    const { q: query, specialties, min_rating, page, limit } = validationResult.data;
    const skip = (page - 1) * limit;

    const useCase = new GetFarmersUseCase(farmerRepository);
    const result = await useCase.execute(
      { searchQuery: query, specialties, minRating: min_rating },
      { skip, take: limit, page }
    );

    return NextResponse.json({
      status: "success",
      data: result.farmers,
      meta: result.pagination,
    });
  } catch (error) {
    console.error("Search farmers error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to search farmers" },
      { status: 500 },
    );
  }
}
