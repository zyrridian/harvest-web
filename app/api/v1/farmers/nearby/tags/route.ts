import { NextResponse } from "next/server";
import prisma from "@/core/database/prisma";

/**
 * @swagger
 * /api/v1/farmers/nearby/tags:
 *   get:
 *     summary: Get all available tags and categories for nearby farmers
 *     tags: [Farmers]
 *     responses:
 *       200:
 *         description: List of unique tags
 */
export async function GET() {
  try {
    // Get all unique tags from active DropPoints
    // Since Prisma doesn't have a distinct query for array elements directly in findMany,
    // we fetch them and extract unique tags. For huge datasets, raw SQL is better.
    
    // Using raw SQL for efficiency to unnest the array and get distinct values
    const tagsResult = await prisma.$queryRaw<{tag: string}[]>`
      SELECT DISTINCT unnest(tags) as tag
      FROM drop_points
      WHERE is_active = true AND tags IS NOT NULL
    `;
    
    const uniqueTags = tagsResult.map(row => row.tag).filter(Boolean);

    // Also get categories from whatWeSell
    const categoriesResult = await prisma.$queryRaw<{category: string}[]>`
      SELECT DISTINCT what_we_sell as category
      FROM drop_points
      WHERE is_active = true AND what_we_sell IS NOT NULL
    `;
    
    const uniqueCategories = categoriesResult.map(row => row.category).filter(Boolean);

    return NextResponse.json({
      status: "success",
      data: {
        tags: uniqueTags,
        categories: uniqueCategories
      },
    });
  } catch (error: any) {
    console.error("Error fetching nearby tags:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch tags",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
