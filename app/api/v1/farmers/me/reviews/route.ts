import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";

/**
 * @swagger
 * /api/v1/farmers/me/reviews:
 *   get:
 *     summary: Get all reviews for farmer's products
 *     tags: [Farmers]
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
 *         description: List of reviews with summary
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

    // Get farmer's products
    const farmerProducts = await prisma.product.findMany({
      where: { sellerId: payload.userId },
      select: { id: true },
    });

    const productIds = farmerProducts.map((p) => p.id);

    // Get reviews for farmer's products
    const [reviews, total, ratingAggregation] = await Promise.all([
      prisma.review.findMany({
        where: {
          productId: { in: productIds },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              name: true,
              avatarUrl: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              images: {
                take: 1,
                orderBy: { displayOrder: "asc" },
                select: { url: true },
              },
            },
          },
        },
      }),
      prisma.review.count({
        where: { productId: { in: productIds } },
      }),
      prisma.review.groupBy({
        by: ["rating"],
        where: { productId: { in: productIds } },
        _count: { rating: true },
      }),
    ]);

    // Calculate summary
    const ratingDistribution: { [key: number]: number } = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    let totalRating = 0;
    let totalCount = 0;

    for (const r of ratingAggregation) {
      ratingDistribution[r.rating] = r._count.rating;
      totalRating += r.rating * r._count.rating;
      totalCount += r._count.rating;
    }

    const averageRating = totalCount > 0 ? totalRating / totalCount : 0;

    // Format reviews
    const formattedReviews = reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      isVerifiedPurchase: review.isVerifiedPurchase,
      helpfulCount: review.helpfulCount,
      createdAt: review.createdAt,
      user: {
        name: review.user.name,
        avatar_url: review.user.avatarUrl,
      },
      product: {
        id: review.product.id,
        name: review.product.name,
        image: review.product.images[0]?.url || null,
      },
    }));

    return NextResponse.json({
      status: "success",
      data: {
        summary: {
          average_rating: averageRating,
          total_reviews: total,
          rating_distribution: ratingDistribution,
        },
        reviews: formattedReviews,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error("Get farmer reviews error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error.message || "Failed to get reviews",
      },
      { status: error.status || 500 },
    );
  }
}
