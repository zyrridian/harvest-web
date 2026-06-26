import { NextRequest } from "next/server";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import {
  parsePagination,
} from "@/core/helpers/pagination";

import { GetProductsUseCase } from "@/features/catalog/application/usecases/products/get-products.usecase";
import { GetCategoryDetailsUseCase } from "@/features/catalog/application/usecases/categories/get-category-details.usecase";
import { productRepository } from "@/features/catalog/infrastructure/repositories/prisma-product.repository";
import { categoryRepository } from "@/features/catalog/infrastructure/repositories/prisma-category.repository";

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

    const getCategory = new GetCategoryDetailsUseCase(categoryRepository);
    const category = await getCategory.execute(id);

    const getProducts = new GetProductsUseCase(productRepository);
    const result = await getProducts.execute(
      { categoryId: category.id, isAvailable: true },
      { skip, take: limit, sortBy, order: "desc" }
    );

    return successResponse(result);
  } catch (error) {
    return handleRouteError(error, "Fetch category products");
  }
}
