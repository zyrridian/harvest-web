import { NextResponse } from "next/server";
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
    const provinces = await prisma.province.findMany({
      orderBy: { name: "asc" },
    });

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
  } finally {
    await prisma.$disconnect();
  }
}
