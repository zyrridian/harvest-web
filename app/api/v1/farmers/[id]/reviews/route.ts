import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";

/**
 * @swagger
 * /api/v1/farmers/{id}/reviews:
 *   get:
 *     summary: Get reviews for a specific farmer
 *     tags: [Farmers]
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
 *     responses:
 *       200:
 *         description: List of farmer reviews
 *       404:
 *         description: Farmer not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Await params in Next.js 15+
    const { id } = await params;

    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Find farmer
    const farmer = await prisma.farmer.findUnique({
      where: { id: id },
    });

    if (!farmer) {
      return NextResponse.json(
        {
          status: "error",
          message: "Farmer not found",
        },
        { status: 404 },
      );
    }

    // TODO: Implement reviews system
    // For now, return placeholder response
    const reviews: any[] = [];

    return NextResponse.json({
      status: "success",
      data: reviews,
      pagination: {
        current_page: page,
        total_pages: 0,
        total_items: 0,
      },
    });
  } catch (error: any) {
    console.error("Error fetching farmer reviews:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch farmer reviews",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
