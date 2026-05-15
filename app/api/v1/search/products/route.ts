import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/features/auth";
import prisma from "@/core/database/prisma";

/**
 * @swagger
 * /api/v1/search/products:
 *   get:
 *     summary: Search for products
 *     tags: [Search]
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
        { status: 400 }
      );
    }

    // Save search history if authenticated
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const payload = await verifyAuth(request);
        // We'll update result count after the search
        await prisma.searchHistory.create({
          data: {
            userId: payload.userId,
            query: query.trim(),
            resultCount: 0, // Will update after counting
          },
        });
      } catch {
        // Not authenticated or invalid token, continue without saving history
      }
    }

    // Build search filters
    const where: any = {
      isAvailable: true,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { longDescription: { contains: query, mode: "insensitive" } },
      ],
    };

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (categories.length > 0) {
      where.OR = [
        ...(where.OR || []),
        { categoryId: { in: categories } },
        { subcategoryId: { in: categories } },
      ];
    }

    if (types.includes("organic")) {
      where.isOrganic = true;
    }

    // Build order by
    let orderBy: any = { createdAt: "desc" }; // default for relevance and newest

    if (sortBy === "price") {
      orderBy = { price: "asc" };
    } else if (sortBy === "newest") {
      orderBy = { createdAt: "desc" };
    } else if (sortBy === "rating") {
      // Note: Requires aggregated rating calculation
      orderBy = { createdAt: "desc" }; // Fallback for now
    }

    // Execute search
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              farmer: {
                select: {
                  city: true,
                },
              },
            },
          },
          images: {
            where: { isPrimary: true },
            take: 1,
          },
          category: {
            select: { name: true },
          },
          reviews: {
            select: { rating: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Format results
    const results = products.map((product) => {
      const avgRating =
        product.reviews.length > 0
          ? product.reviews.reduce((sum, r) => sum + r.rating, 0) /
            product.reviews.length
          : 0;

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        store_name: product.seller.name,
        store_id: product.seller.id,
        distance: null, // Would need location-based calculation
        price: product.price,
        unit: product.unit,
        rating: Math.round(avgRating * 10) / 10,
        stock: product.stockQuantity,
        tag: product.isOrganic ? "Organic" : null,
        image_url: product.images[0]?.url || null,
        category: product.category?.name || null,
        types: [
          product.isOrganic && "Organic",
          "Fresh", // Could be based on created date
          product.seller.farmer?.city && "Local",
        ].filter(Boolean),
        created_at: product.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      status: "success",
      data: results,
      meta: {
        total,
        page,
        limit,
        query: query.trim(),
      },
    });
  } catch (error) {
    console.error("Search products error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to search products" },
      { status: 500 }
    );
  }
}
