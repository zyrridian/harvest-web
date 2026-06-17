import { NextRequest } from "next/server";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { GetMarketplaceQuerySchema } from "@/features/marketplace/application/dtos/marketplace.dto";
import { GetMarketplaceUseCase } from "@/features/marketplace/application/usecases/get-marketplace.usecase";
import { marketplaceRepository } from "@/features/marketplace/infrastructure/repositories/prisma-marketplace.repository";

/**
 * @swagger
 * /api/v1/marketplace:
 *   get:
 *     summary: Get marketplace home data
 *     description: Fetches flash harvest, categories, and products with optional filtering.
 *     tags:
 *       - Marketplace
 *     parameters:
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
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
 *           default: 10
 *     responses:
 *       200:
 *         description: Marketplace data retrieved
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawInput = {
      latitude: searchParams.get("latitude") || undefined,
      longitude: searchParams.get("longitude") || undefined,
      filter: searchParams.get("filter") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    };

    const input = GetMarketplaceQuerySchema.parse(rawInput);
    const useCase = new GetMarketplaceUseCase(marketplaceRepository);
    const result = await useCase.execute(input);

    return successResponse(result);
  } catch (error) {
    return handleRouteError(error, "GetMarketplace");
  }
}
