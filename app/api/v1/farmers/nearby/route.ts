import { NextRequest } from "next/server";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { GetNearbyFarmersQuerySchema } from "@/features/farmers/application/dtos/farmer.dto";
import { GetNearbyFarmersUseCase } from "@/features/farmers/application/usecases/get-nearby-farmers.usecase";
import { farmerRepository } from "@/features/farmers/infrastructure/repositories/prisma-farmer.repository";

/**
 * @swagger
 * /api/v1/farmers/nearby:
 *   get:
 *     summary: Get nearby farmers
 *     description: Fetches a list of farmers around the user's current location.
 *     tags:
 *       - Farmers
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 3
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: is_organic
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: is_open_now
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Nearby farmers retrieved
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawInput = {
      lat: searchParams.get("lat") || undefined,
      lng: searchParams.get("lng") || undefined,
      radius: searchParams.get("radius") || undefined,
      search: searchParams.get("search") || undefined,
      is_organic: searchParams.get("is_organic") === "true" ? true : undefined,
      is_open_now: searchParams.get("is_open_now") === "true" ? true : undefined,
    };

    const input = GetNearbyFarmersQuerySchema.parse(rawInput);

    const useCase = new GetNearbyFarmersUseCase(farmerRepository);
    const result = await useCase.execute(input);

    return successResponse(result);
  } catch (error) {
    return handleRouteError(error, "GetNearbyFarmers");
  }
}
