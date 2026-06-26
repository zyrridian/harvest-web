import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import {
  parsePagination,
  buildPaginationMeta,
} from "@/core/helpers/pagination";

import { GetProductsUseCase } from "@/features/catalog/application/usecases/products/get-products.usecase";
import { productRepository } from "@/features/catalog/infrastructure/repositories/prisma-product.repository";

/**
 * @swagger
 * /api/v1/catalog/products:
 *   get:
 *     summary: Get list of products with filters and pagination
 *     tags: [Catalog]
 *     parameters:
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
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: seller_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: is_organic
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: min_price
 *         schema:
 *           type: number
 *       - in: query
 *         name: max_price
 *         schema:
 *           type: number
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [price, rating, newest, popular]
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: List of products
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const category = searchParams.get("category");
    const sellerId = searchParams.get("seller_id");
    const isOrganicRaw = searchParams.get("is_organic");
    const isOrganic = isOrganicRaw ? isOrganicRaw === "true" : undefined;
    const minPriceRaw = searchParams.get("min_price");
    const maxPriceRaw = searchParams.get("max_price");
    const sortBy = searchParams.get("sort_by") || "newest";
    const order = (searchParams.get("order") as any) || "desc";

    const useCase = new GetProductsUseCase(productRepository);
    const result = await useCase.execute(
      {
        categoryId: category,
        categorySlug: category,
        sellerId,
        isOrganic,
        minPrice: minPriceRaw ? parseFloat(minPriceRaw) : undefined,
        maxPrice: maxPriceRaw ? parseFloat(maxPriceRaw) : undefined,
        isAvailable: true,
      },
      { skip, take: limit, sortBy, order }
    );

    return successResponse(result);
  } catch (error) {
    return handleRouteError(error, "Fetch products");
  }
}
