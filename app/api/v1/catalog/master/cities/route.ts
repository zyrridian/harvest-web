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

    const whereClause = provinceId
      ? { provinceId: parseInt(provinceId, 10) }
      : {};

    const cities = await prisma.city.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
    });

    const mappedCities = cities.map((city) => ({
      id: city.id,
      province_id: city.provinceId,
      name: city.name,
    }));

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
  } finally {
    await prisma.$disconnect();
  }
}
