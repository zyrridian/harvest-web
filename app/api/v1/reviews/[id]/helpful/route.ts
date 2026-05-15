import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/features/auth";
import prisma from "@/core/database/prisma";

/**
 * @swagger
 * /api/v1/reviews/{id}/helpful:
 *   post:
 *     summary: Mark review as helpful
 *     tags: [Reviews]
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
 *         description: Review marked as helpful
 *       400:
 *         description: Already marked as helpful
 *       401:
 *         description: Unauthorized
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

    // Check if review exists
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return NextResponse.json(
        { status: "error", message: "Review not found" },
        { status: 404 },
      );
    }

    // Check if already marked as helpful
    const existing = await prisma.reviewHelpful.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId: payload.userId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { status: "error", message: "Already marked as helpful" },
        { status: 400 },
      );
    }

    // Add helpful mark
    await prisma.reviewHelpful.create({
      data: {
        reviewId,
        userId: payload.userId,
      },
    });

    // Increment helpful count
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        helpfulCount: { increment: 1 },
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Review marked as helpful",
      data: {
        review_id: reviewId,
        helpful_count: updatedReview.helpfulCount,
        is_helpful: true,
      },
    });
  } catch (error) {
    console.error("Mark helpful error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to mark review as helpful" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/v1/reviews/{id}/helpful:
 *   delete:
 *     summary: Remove helpful mark from review
 *     tags: [Reviews]
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
 *         description: Helpful mark removed
 *       400:
 *         description: Not marked as helpful
 *       401:
 *         description: Unauthorized
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

    // Check if review exists
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return NextResponse.json(
        { status: "error", message: "Review not found" },
        { status: 404 },
      );
    }

    // Check if marked as helpful
    const existing = await prisma.reviewHelpful.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId: payload.userId,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { status: "error", message: "Not marked as helpful" },
        { status: 400 },
      );
    }

    // Remove helpful mark
    await prisma.reviewHelpful.delete({
      where: {
        reviewId_userId: {
          reviewId,
          userId: payload.userId,
        },
      },
    });

    // Decrement helpful count
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        helpfulCount: { decrement: 1 },
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Helpful mark removed",
      data: {
        review_id: reviewId,
        helpful_count: updatedReview.helpfulCount,
        is_helpful: false,
      },
    });
  } catch (error) {
    console.error("Remove helpful error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to remove helpful mark" },
      { status: 500 },
    );
  }
}
