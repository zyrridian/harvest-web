import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";

/**
 * @swagger
 * /api/v1/categories:
 *   get:
 *     summary: Get all product categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: List of categories
 */
export async function GET(request: NextRequest) {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      include: { _count: { select: { products: true } } },
    });

    const formattedCategories = categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      emoji: category.emoji,
      gradient_colors: category.gradientColors,
      product_count: category._count.products,
      display_order: category.displayOrder,
      is_active: category.isActive,
    }));

    return successResponse(formattedCategories);
  } catch (error) {
    return handleRouteError(error, "Fetch categories");
  }
}
