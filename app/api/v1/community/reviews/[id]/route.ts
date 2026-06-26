import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/features/auth";
import prisma from "@/core/database/prisma";

/**
 * @swagger
 * /api/v1/community/reviews/{id}:
 *   get:
 *     summary: Get reviews for a product
 *     tags: [Community]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 *       404:
 *         description: Product not found
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: productId } = await context.params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    // Get reviews for product
    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where: { productId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          images: {
            select: {
              url: true,
            },
          },
        },
      }),
      prisma.review.count({ where: { productId } }),
    ]);

    const formattedReviews = reviews.map((review) => ({
      review_id: review.id,
      user: {
        id: review.user.id,
        name: review.user.name,
        avatar_url: review.user.avatarUrl,
      },
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      images: review.images.map((img) => img.url),
      is_verified_purchase: review.isVerifiedPurchase,
      helpful_count: review.helpfulCount,
      created_at: review.createdAt,
      updated_at: review.updatedAt,
    }));

    return NextResponse.json({
      status: "success",
      data: {
        reviews: formattedReviews,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(totalCount / limit),
          total_items: totalCount,
          items_per_page: limit,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch reviews",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/v1/community/reviews/{id}:
 *   put:
 *     summary: Update a review
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               title:
 *                 type: string
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Review not found
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    // Await params in Next.js 15+
    const { id } = await context.params;

    const payload = await verifyAuth(request);
    const { id: reviewId } = await context.params;
    const body = await request.json();

    const { rating, title, comment } = body;

    // Find review and verify ownership
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return NextResponse.json(
        { status: "error", message: "Review not found" },
        { status: 404 },
      );
    }

    if (review.userId !== payload.userId) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized to update this review" },
        { status: 403 },
      );
    }

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { status: "error", message: "Rating must be between 1 and 5" },
        { status: 400 },
      );
    }

    // Update review
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        ...(rating !== undefined && { rating: parseFloat(rating.toString()) }),
        ...(title !== undefined && { title }),
        ...(comment !== undefined && { comment }),
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Review updated successfully",
      data: {
        review_id: updatedReview.id,
        updated_at: updatedReview.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Update review error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to update review" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/v1/community/reviews/{id}:
 *   delete:
 *     summary: Delete a review
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Review not found
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await verifyAuth(request);
    const { id: reviewId } = await context.params;

    // Find review and verify ownership
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return NextResponse.json(
        { status: "error", message: "Review not found" },
        { status: 404 },
      );
    }

    if (review.userId !== payload.userId) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized to delete this review" },
        { status: 403 },
      );
    }

    // Delete review (cascades to images and helpful marks)
    await prisma.review.delete({
      where: { id: reviewId },
    });

    return NextResponse.json({
      status: "success",
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete review error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to delete review" },
      { status: 500 },
    );
  }
}
