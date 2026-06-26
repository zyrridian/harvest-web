import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/features/auth";
import prisma from "@/core/database/prisma";

/**
 * @swagger
 * /api/v1/community/reviews/{id}/response:
 *   post:
 *     summary: Seller response to a review
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
 *             required:
 *               - comment
 *             properties:
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Response added successfully
 *       400:
 *         description: Invalid input or response already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only seller can respond
 *       404:
 *         description: Review not found
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await verifyAuth(request);
    const { id: reviewId } = await context.params;
    const body = await request.json();

    const { comment } = body;

    if (!comment || comment.trim() === "") {
      return NextResponse.json(
        { status: "error", message: "Comment is required" },
        { status: 400 },
      );
    }

    // Get review with product info
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        product: {
          select: { sellerId: true },
        },
        sellerResponse: true,
      },
    });

    if (!review) {
      return NextResponse.json(
        { status: "error", message: "Review not found" },
        { status: 404 },
      );
    }

    // Verify user is the seller
    if (review.product.sellerId !== payload.userId) {
      return NextResponse.json(
        {
          status: "error",
          message: "Only the seller can respond to this review",
        },
        { status: 403 },
      );
    }

    // Check if response already exists
    if (review.sellerResponse) {
      return NextResponse.json(
        {
          status: "error",
          message: "Response already exists. Use PUT to update.",
        },
        { status: 400 },
      );
    }

    // Create seller response
    const response = await prisma.sellerResponse.create({
      data: {
        reviewId,
        comment,
      },
    });

    return NextResponse.json(
      {
        status: "success",
        message: "Response added successfully",
        data: {
          review_id: reviewId,
          response: {
            comment: response.comment,
            responded_at: response.respondedAt.toISOString(),
          },
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Add seller response error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to add response" },
      { status: 500 },
    );
  }
}
