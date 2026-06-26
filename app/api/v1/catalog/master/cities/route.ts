import { NextRequest, NextResponse } from "next/server";
import { masterDataRepository } from "@/features/catalog/infrastructure/repositories/prisma-master-data.repository";
import { GetCitiesUseCase } from "@/features/catalog/application/usecases/master-data/get-master-data.usecases";

/**
 * @swagger
 * /api/v1/catalog/master/cities:
 *   get:
 *     summary: Get cities
 *     description: Retrieves a list of cities. Can be filtered by province_id.
 *     tags:
 *       - Catalog
 *     parameters:
 *       - in: query
 *         name: province_id
 *         schema:
 *           type: integer
 *         description: ID of the province to filter cities by
 *     responses:
 *       200:
 *         description: Successfully retrieved cities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/City'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const provinceId = searchParams.get("province_id");

    const useCase = new GetCitiesUseCase(masterDataRepository);
    const mappedCities = await useCase.execute(provinceId ? parseInt(provinceId, 10) : undefined);

    return NextResponse.json({
      status: "success",
      data: mappedCities,
    });
  } catch (error) {
    console.error("Error fetching cities:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to fetch cities" },
      { status: 500 }
    );
  }
}
