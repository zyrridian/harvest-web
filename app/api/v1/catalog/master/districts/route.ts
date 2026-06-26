import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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

    const whereClause = cityId ? { cityId: parseInt(cityId, 10) } : {};

    const districts = await prisma.district.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
    });

    const mappedDistricts = districts.map((district) => ({
      id: district.id,
      city_id: district.cityId,
      name: district.name,
    }));

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
  } finally {
    await prisma.$disconnect();
  }
}
