import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";

/**
 * @swagger
 * /api/v1/farmers/{id}/products:
 *   get:
 *     summary: Get products from a specific farmer
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
 *         description: List of farmer's products
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
    const skip = (page - 1) * limit;

    // Find farmer
    const farmer = await prisma.farmer.findUnique({
      where: { id: id },
      select: { userId: true },
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

    // Get products
    const [products, totalItems] = await Promise.all([
      prisma.product.findMany({
        where: {
          sellerId: farmer.userId,
          isAvailable: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          category: {
            select: {
              name: true,
            },
          },
          images: {
            where: { isPrimary: true },
            take: 1,
            select: {
              url: true,
            },
          },
          discounts: {
            where: {
              isActive: true,
              validFrom: { lte: new Date() },
              validUntil: { gte: new Date() },
            },
            take: 1,
            orderBy: { value: "desc" },
          },
        },
      }),
      prisma.product.count({
        where: {
          sellerId: farmer.userId,
          isAvailable: true,
        },
      }),
    ]);

    const formattedProducts = products.map((product) => {
      const primaryImage = product.images[0];
      const activeDiscount = product.discounts[0];

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        category: product.category?.name,
        price: product.price,
        unit: product.unit,
        image_url: primaryImage?.url || null,
        is_organic: product.isOrganic,
        is_available: product.isAvailable,
        stock: product.stockQuantity,
        discount: activeDiscount?.value || null,
        rating: product.rating,
        review_count: product.reviewCount,
      };
    });

    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      status: "success",
      data: formattedProducts,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_items: totalItems,
      },
    });
  } catch (error: any) {
    console.error("Error fetching farmer products:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch farmer products",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
