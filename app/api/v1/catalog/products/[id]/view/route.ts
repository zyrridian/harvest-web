import { NextRequest, NextResponse } from "next/server";
import { verifyToken, extractBearerToken } from "@/features/auth";
import { RecordProductViewUseCase } from "@/features/catalog/application/usecases/products/record-product-view.usecase";
import { productRepository } from "@/features/catalog/infrastructure/repositories/prisma-product.repository";

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

    const useCase = new RecordProductViewUseCase(productRepository);
    await useCase.execute(userId, id);

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
