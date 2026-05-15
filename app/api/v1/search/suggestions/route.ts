import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";

/**
 * @swagger
 * /api/v1/search/suggestions:
 *   get:
 *     summary: Get search suggestions/autocomplete
 *     tags: [Search]
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

    const query = searchParams.get("q");
    const type = searchParams.get("type"); // products, farmers, categories
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!query || query.trim() === "") {
      return NextResponse.json({
        status: "success",
        data: [],
      });
    }

    const suggestions: any[] = [];

    // Search products
    if (!type || type === "products") {
      const products = await prisma.product.findMany({
        where: {
          isAvailable: true,
          name: { contains: query, mode: "insensitive" },
        },
        take: limit,
        select: {
          id: true,
          name: true,
        },
      });

      suggestions.push(
        ...products.map((p) => ({
          type: "product",
          text: p.name,
          id: p.id,
        }))
      );
    }

    // Search categories
    if (!type || type === "categories") {
      const categories = await prisma.category.findMany({
        where: {
          name: { contains: query, mode: "insensitive" },
        },
        take: limit,
        select: {
          id: true,
          name: true,
        },
      });

      suggestions.push(
        ...categories.map((c) => ({
          type: "category",
          text: c.name,
          id: c.id,
        }))
      );
    }

    // Search farmers
    if (!type || type === "farmers") {
      const farmers = await prisma.user.findMany({
        where: {
          farmer: { isNot: null },
          name: { contains: query, mode: "insensitive" },
        },
        take: limit,
        select: {
          id: true,
          name: true,
          farmer: {
            select: { id: true },
          },
        },
      });

      suggestions.push(
        ...farmers.map((f) => ({
          type: "farmer",
          text: f.name,
          id: f.farmer?.id || f.id,
        }))
      );
    }

    // Limit total suggestions
    const limitedSuggestions = suggestions.slice(0, limit);

    return NextResponse.json({
      status: "success",
      data: limitedSuggestions,
    });
  } catch (error) {
    console.error("Search suggestions error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to get suggestions" },
      { status: 500 }
    );
  }
}
