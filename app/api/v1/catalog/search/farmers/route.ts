import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";

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

    const query = searchParams.get("q");
    const specialties =
      searchParams.get("specialties")?.split(",").filter(Boolean) || [];
    const minRating = searchParams.get("min_rating")
      ? parseFloat(searchParams.get("min_rating")!)
      : undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    if (!query || query.trim() === "") {
      return NextResponse.json(
        { status: "error", message: "Search query is required" },
        { status: 400 },
      );
    }

    // Build search filters
    const where: any = {
      farmer: {
        isNot: null,
      },
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        {
          farmer: {
            bio: { contains: query, mode: "insensitive" },
          },
        },
      ],
    };

    if (specialties.length > 0) {
      where.farmer = {
        ...where.farmer,
        specialties: {
          some: {
            specialty: { in: specialties },
          },
        },
      };
    }

    // Execute search
    const [farmers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          farmer: {
            include: {
              specialties: true,
            },
          },
          products: {
            where: { isAvailable: true },
            select: { id: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Format results
    const results = farmers
      .filter((user) => user.farmer) // Extra safety
      .map((user) => ({
        id: user.farmer!.id,
        user_id: user.id,
        name: user.name,
        description: user.farmer!.description || "",
        profile_image: user.avatarUrl,
        rating: user.farmer!.rating,
        city: user.farmer!.city,
        specialties: user.farmer!.specialties.map((s) => s.specialty),
        total_products: user.products.length,
      }))
      .filter((farmer) => {
        // Apply min rating filter after fetching
        if (minRating !== undefined) {
          return farmer.rating >= minRating;
        }
        return true;
      });

    return NextResponse.json({
      status: "success",
      data: results,
      meta: {
        total: results.length, // Adjusted for post-filter
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("Search farmers error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to search farmers" },
      { status: 500 },
    );
  }
}
