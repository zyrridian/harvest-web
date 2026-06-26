import { NextResponse } from "next/server";
import { masterDataRepository } from "@/features/catalog/infrastructure/repositories/prisma-master-data.repository";
import { GetProvincesUseCase } from "@/features/catalog/application/usecases/master-data/get-master-data.usecases";

/**
 * @swagger
 * /api/v1/catalog/master/provinces:
 *   get:
 *     summary: Get all provinces
 *     description: Retrieves a list of all geographical provinces in the system
 *     tags:
 *       - Catalog
 *     responses:
 *       200:
 *         description: Successfully retrieved provinces
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
 *                     $ref: '#/components/schemas/Province'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET() {
  try {
    const useCase = new GetProvincesUseCase(masterDataRepository);
    const provinces = await useCase.execute();

    return NextResponse.json({
      status: "success",
      data: provinces,
    });
  } catch (error) {
    console.error("Error fetching provinces:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to fetch provinces" },
      { status: 500 }
    );
  }
}
