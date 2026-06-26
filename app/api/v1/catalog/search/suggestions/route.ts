import { NextRequest, NextResponse } from "next/server";
import { GetSearchSuggestionsUseCase } from "@/features/catalog/application/usecases/search/get-suggestions.usecase";
import { productRepository } from "@/features/catalog/infrastructure/repositories/prisma-product.repository";
import { categoryRepository } from "@/features/catalog/infrastructure/repositories/prisma-category.repository";
import { farmerRepository } from "@/features/catalog/infrastructure/repositories/prisma-farmer.repository";
import { SearchSuggestionsSchema } from "@/features/catalog/validation/search.schema";

/**
 * @swagger
 * /api/v1/catalog/search/suggestions:
 *   get:
 *     summary: Get search suggestions/autocomplete
 *     tags: [Catalog]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [products, farmers, categories]
 *         description: Type of suggestions
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum suggestions
 *     responses:
 *       200:
 *         description: Suggestions list
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const queryParams = Object.fromEntries(searchParams.entries());
    const validationResult = SearchSuggestionsSchema.safeParse(queryParams);

    if (!validationResult.success) {
      return NextResponse.json(
        { status: "error", message: "Invalid query parameters" },
        { status: 400 },
      );
    }

    const { q: query, type, limit } = validationResult.data;

    const useCase = new GetSearchSuggestionsUseCase(productRepository, categoryRepository, farmerRepository);
    const suggestions = await useCase.execute(query, type, limit);

    return NextResponse.json({
      status: "success",
      data: suggestions,
    });
  } catch (error) {
    console.error("Search suggestions error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to get suggestions" },
      { status: 500 },
    );
  }
}
