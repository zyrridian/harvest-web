import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import {
  parsePagination,
  buildPaginationMeta,
} from "@/core/helpers/pagination";

/**
 * @swagger
 * /api/v1/catalog/categories/{id}/products:
 *   get:
 *     summary: Get products in a specific category
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [price, rating, newest]
 *     responses:
 *       200:
 *         description: List of products in category
 *       404:
 *         description: Category not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const sortBy = searchParams.get("sort_by") || "newest";

    const category = await prisma.category.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });

    if (!category) {
      throw AppError.notFound("Category not found");
    }

    const orderBy: Record<string, string> =
      sortBy === "price"
        ? { price: "asc" }
        : sortBy === "rating"
          ? { rating: "desc" }
          : { createdAt: "desc" };

    const [products, totalItems] = await Promise.all([
      prisma.product.findMany({
        where: { categoryId: category.id, isAvailable: true },
        skip,
        take: limit,
        orderBy,
        include: {
          seller: { select: { id: true, name: true } },
          images: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true },
          },
          discounts: {
            where: {
              isActive: true,
              validFrom: { lte: new Date() },
              validUntil: { gte: new Date() },
            },
            take: 1,
            orderBy: { value: "desc" },
          },
        },
      }),
      prisma.product.count({
        where: { categoryId: category.id, isAvailable: true },
      }),
    ]);

    const formattedProducts = products.map((product) => {
      const primaryImage = product.images[0];
      const activeDiscount = product.discounts[0];
      return {
        id: product.id,
        name: product.name,
        category_id: category.id,
        category_name: category.name,
        seller_id: product.sellerId,
        seller_name: product.seller.name,
        price: product.price,
        unit: product.unit,
        image_url: primaryImage?.url || null,
        rating: product.rating,
        review_count: product.reviewCount,
        is_organic: product.isOrganic,
        stock_quantity: product.stockQuantity,
        discount: activeDiscount
          ? `${activeDiscount.value}${activeDiscount.type === "percentage" ? "%" : ""} OFF`
          : null,
      };
    });

    return successResponse({
      products: formattedProducts,
      pagination: buildPaginationMeta(page, limit, totalItems),
    });
  } catch (error) {
    return handleRouteError(error, "Fetch category products");
  }
}
