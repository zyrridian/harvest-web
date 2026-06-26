import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";

/**
 * @swagger
 * /api/v1/catalog/categories/{id}:
 *   get:
 *     summary: Get category details
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category details
 *       404:
 *         description: Category not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const category = await prisma.category.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { _count: { select: { products: true } } },
    });

    if (!category) {
      throw AppError.notFound("Category not found");
    }

    return successResponse({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      emoji: category.emoji,
      gradient_colors: category.gradientColors,
      product_count: category._count.products,
      display_order: category.displayOrder,
      is_active: category.isActive,
    });
  } catch (error) {
    return handleRouteError(error, "Fetch category");
  }
}
