import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/features/auth";
import prisma from "@/core/database/prisma";
import { GetProductReviewsUseCase } from "@/features/catalog/application/usecases/products/get-product-reviews.usecase";
import { productRepository } from "@/features/catalog/infrastructure/repositories/prisma-product.repository";

/**
 * @swagger
 * /api/v1/catalog/products/{id}/reviews:
 *   get:
 *     summary: Get product reviews
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: rating
 *         schema:
 *           type: number
 *         description: Filter by rating (1-5)
 *       - in: query
 *         name: with_photos
 *         schema:
 *           type: boolean
 *         description: Only reviews with photos
 *     responses:
 *       200:
 *         description: Product reviews with summary
 *       500:
 *         description: Internal server error
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    // Await params in Next.js 15+
    const { id } = await context.params;

    const { id: productId } = await context.params;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const rating = searchParams.get("rating")
      ? parseFloat(searchParams.get("rating")!)
      : null;
    const withPhotos = searchParams.get("with_photos") === "true";
    const skip = (page - 1) * limit;

    // Get current user ID if authenticated (for is_helpful status)
    let userId: string | null = null;
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const payload = await verifyAuth(request);
        userId = payload.userId;
      } catch {
        // Not authenticated, continue without user context
      }
    }
    const useCase = new GetProductReviewsUseCase(productRepository);
    const result = await useCase.execute(productId, page, limit);

    return NextResponse.json({
      status: "success",
      data: {
        reviews: result.reviews,
        summary: {
          average_rating: 0, // Placeholder
          total_reviews: result.pagination.total_items,
          distribution: { "5_star": 0, "4_star": 0, "3_star": 0, "2_star": 0, "1_star": 0 },
        },
        pagination: result.pagination,
      },
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to fetch reviews" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/v1/catalog/products/{id}/reviews:
 *   post:
 *     summary: Create a product review
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               order_id:
 *                 type: string
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               title:
 *                 type: string
 *               comment:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Review created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await verifyAuth(request);
    const { id: productId } = await context.params;
    const body = await request.json();

    const { order_id, rating, title, comment, images } = body;

    // Validate required fields
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { status: "error", message: "Rating must be between 1 and 5" },
        { status: 400 },
      );
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { status: "error", message: "Product not found" },
        { status: 404 },
      );
    }

    // If order_id provided, verify it's a valid purchase
    let isVerifiedPurchase = false;
    if (order_id) {
      const order = await prisma.order.findFirst({
        where: {
          id: order_id,
          buyerId: payload.userId,
          items: {
            some: { productId },
          },
        },
      });

      if (order) {
        isVerifiedPurchase = true;

        // Check if already reviewed this product from this order
        const existingReview = await prisma.review.findFirst({
          where: {
            productId,
            userId: payload.userId,
            orderId: order_id,
          },
        });

        if (existingReview) {
          return NextResponse.json(
            {
              status: "error",
              message: "You have already reviewed this product from this order",
            },
            { status: 400 },
          );
        }
      }
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        productId,
        userId: payload.userId,
        orderId: order_id || null,
        rating: parseFloat(rating.toString()),
        title: title || null,
        comment: comment || null,
        isVerifiedPurchase,
        images: images
          ? {
              create: images.map((imgId: string, index: number) => ({
                url: `https://cdn.farmmarket.com/reviews/${imgId}.jpg`, // Placeholder
                thumbnailUrl: `https://cdn.farmmarket.com/reviews/thumb_${imgId}.jpg`,
                displayOrder: index,
              })),
            }
          : undefined,
      },
    });

    return NextResponse.json(
      {
        status: "success",
        message: "Review submitted successfully",
        data: {
          review_id: review.id,
          rating: review.rating,
          created_at: review.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create review error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to create review" },
      { status: 500 },
    );
  }
}
