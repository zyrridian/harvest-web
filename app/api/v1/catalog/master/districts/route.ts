import { NextRequest, NextResponse } from "next/server";
import { masterDataRepository } from "@/features/catalog/infrastructure/repositories/prisma-master-data.repository";
import { GetDistrictsUseCase } from "@/features/catalog/application/usecases/master-data/get-master-data.usecases";

/**
 * @swagger
 * /api/v1/catalog/master/districts:
 *   get:
 *     summary: Get districts
 *     description: Retrieves a list of districts. Can be filtered by city_id.
 *     tags:
 *       - Catalog
 *     parameters:
 *       - in: query
 *         name: city_id
 *         schema:
 *           type: integer
 *         description: ID of the city to filter districts by
 *     responses:
 *       200:
 *         description: Successfully retrieved districts
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
 *                     $ref: '#/components/schemas/District'
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
    const cityId = searchParams.get("city_id");

    const useCase = new GetDistrictsUseCase(masterDataRepository);
    const mappedDistricts = await useCase.execute(cityId ? parseInt(cityId, 10) : undefined);

    return NextResponse.json({
      status: "success",
      data: mappedDistricts,
    });
  } catch (error) {
    console.error("Error fetching districts:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to fetch districts" },
      { status: 500 }
    );
  }
}
