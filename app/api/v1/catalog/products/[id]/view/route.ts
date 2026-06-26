import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyToken, extractBearerToken } from "@/features/auth";

/**
 * @swagger
 * /api/v1/catalog/products/{id}/view:
 *   post:
 *     summary: Track product view for analytics
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: View tracked
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Await params in Next.js 15+
    const { id } = await params;

    // Get user ID if authenticated (optional)
    let userId: string | null = null;
    const authHeader = request.headers.get("authorization");
    const token = extractBearerToken(authHeader);
    if (token) {
      try {
        const payload = await verifyToken(token);
        if (payload) {
          userId = payload.userId as string;
        }
      } catch {
        // Not authenticated, continue as anonymous
      }
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: id },
    });

    if (!product) {
      return NextResponse.json(
        { status: "error", message: "Product not found" },
        { status: 404 },
      );
    }

    // Track view and increment view count
    await prisma.$transaction([
      prisma.productView.create({
        data: {
          productId: id,
          userId,
        },
      }),
      prisma.product.update({
        where: { id: id },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      }),
    ]);

    return NextResponse.json({
      status: "success",
      message: "View tracked",
    });
  } catch (error: any) {
    console.error("Error tracking view:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to track view",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
