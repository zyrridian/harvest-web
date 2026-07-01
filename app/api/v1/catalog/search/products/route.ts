import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/features/auth";
import { productRepository } from "@/features/catalog/infrastructure/repositories/prisma-product.repository";
import { GetProductsUseCase } from "@/features/catalog/application/usecases/products/get-products.usecase";
import { searchRepository } from "@/features/catalog/infrastructure/repositories/prisma-search.repository";

/**
 * @swagger
 * /api/v1/catalog/search/products:
 *   get:
 *     summary: Search for products
 *     tags: [Catalog]
 *     security:
 *       - {}
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [relevance, price, distance, newest, rating]
 *         description: Sort by
 *       - in: query
 *         name: min_price
 *         schema:
 *           type: number
 *         description: Minimum price
 *       - in: query
 *         name: max_price
 *         schema:
 *           type: number
 *         description: Maximum price
 *       - in: query
 *         name: categories
 *         schema:
 *           type: string
 *         description: Comma-separated category IDs
 *       - in: query
 *         name: types
 *         schema:
 *           type: string
 *         description: Comma-separated types (organic, fresh, local)
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

    const query = searchParams.get("q");
    const sortBy = searchParams.get("sort_by") || "relevance";
    const minPrice = searchParams.get("min_price")
      ? parseFloat(searchParams.get("min_price")!)
      : undefined;
    const maxPrice = searchParams.get("max_price")
      ? parseFloat(searchParams.get("max_price")!)
      : undefined;
    const categories =
      searchParams.get("categories")?.split(",").filter(Boolean) || [];
    const types = searchParams.get("types")?.split(",").filter(Boolean) || [];
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    if (!query || query.trim() === "") {
      return NextResponse.json(
        { status: "error", message: "Search query is required" },
        { status: 400 },
      );
    }

    const useCase = new GetProductsUseCase(productRepository);
    const result = await useCase.execute(
      {
        searchQuery: query.trim(),
        isAvailable: true,
        isOrganic: types.includes("organic") ? true : undefined,
        minPrice,
        maxPrice,
      },
      { skip, take: limit, sortBy, order: sortBy === "price" ? "asc" : "desc" }
    );

    // Save search history if authenticated
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const payload = await verifyAuth(request);
        await searchRepository.saveSearchHistory(payload.userId, query.trim(), result.pagination.total_items);
      } catch {
        // Not authenticated or invalid token, continue without saving history
      }
    }

    // Adapt to expected return format
    const results = result.products.map((product) => {
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        store_name: product.seller_name,
        store_id: product.seller_id,
        distance: null, // Would need location-based calculation
        price: product.price,
        unit: product.unit,
        rating: product.rating,
        stock: product.stock_quantity,
        tag: product.is_organic ? "Organic" : null,
        image_url: product.images && product.images.length > 0 ? product.images[0] : null,
        category: product.category,
        types: [
          product.is_organic && "Organic",
          "Fresh",
        ].filter(Boolean),
        created_at: product.created_at,
      };
    });

    return NextResponse.json({
      status: "success",
      data: results,
      meta: {
        total: result.pagination.total_items,
        page,
        limit,
        query: query.trim(),
      },
    });
  } catch (error) {
    console.error("Search products error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to search products" },
      { status: 500 },
    );
  }
}
