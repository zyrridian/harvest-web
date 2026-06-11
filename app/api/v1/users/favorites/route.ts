import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/features/auth";
import prisma from "@/core/database/prisma";

/**
 * @swagger
 * /api/v1/users/favorites:
 *   get:
 *     summary: Get user's favorite products
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: List of favorite products
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId: payload.userId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              currency: true,
              unit: true,
              isAvailable: true,
              seller: {
                select: {
                  name: true,
                },
              },
              images: {
                where: { isPrimary: true },
                select: { url: true },
                take: 1,
              },
              reviews: {
                select: { rating: true },
              },
            },
          },
        },
      }),
      prisma.favorite.count({ where: { userId: payload.userId } }),
    ]);

    const formattedFavorites = favorites.map((fav) => {
      const avgRating =
        fav.product.reviews.length > 0
          ? fav.product.reviews.reduce((sum, r) => sum + r.rating, 0) /
            fav.product.reviews.length
          : 0;

      return {
        id: fav.id,
        product_id: fav.productId,
        product: {
          id: fav.product.id,
          name: fav.product.name,
          slug: fav.product.slug,
          price: fav.product.price,
          currency: fav.product.currency,
          unit: fav.product.unit,
          image: fav.product.images[0]?.url || null,
          rating: avgRating,
          is_available: fav.product.isAvailable,
          seller_name: fav.product.seller.name,
        },
        created_at: fav.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      status: "success",
      data: formattedFavorites,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_items: total,
      },
    });
  } catch (error: any) {
    console.error("Get favorites error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to fetch favorites" },
      { status: 500 },
    );
  }
}
