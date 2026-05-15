import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyToken, extractBearerToken } from "@/features/auth";

/**
 * @swagger
 * /api/v1/products/{id}/favorite:
 *   get:
 *     summary: Check if product is favorited
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Favorite status
 *       401:
 *         description: Unauthorized
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get("authorization");
    const token = extractBearerToken(authHeader);
    if (!token) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 },
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { status: "error", message: "Invalid token" },
        { status: 401 },
      );
    }
    const userId = payload.userId as string;

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: id,
        },
      },
    });

    return NextResponse.json({
      status: "success",
      data: {
        product_id: id,
        is_favorited: !!favorite,
      },
    });
  } catch (error: any) {
    console.error("Error checking favorite status:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to check favorite status",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/v1/products/{id}/favorite:
 *   post:
 *     summary: Add product to favorites
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product added to favorites
 *       401:
 *         description: Unauthorized
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Await params in Next.js 15+
    const { id } = await params;

    // Verify authentication
    const authHeader = request.headers.get("authorization");
    const token = extractBearerToken(authHeader);
    if (!token) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 },
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { status: "error", message: "Invalid token" },
        { status: 401 },
      );
    }
    const userId = payload.userId as string;

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

    // Check if already favorited
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: id,
        },
      },
    });

    if (existingFavorite) {
      return NextResponse.json({
        status: "success",
        message: "Product already in favorites",
        data: {
          product_id: id,
          is_favorited: true,
        },
      });
    }

    // Add to favorites
    await prisma.favorite.create({
      data: {
        userId,
        productId: id,
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Product added to favorites",
      data: {
        product_id: id,
        is_favorited: true,
      },
    });
  } catch (error: any) {
    console.error("Error adding favorite:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to add favorite",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/v1/products/{id}/favorite:
 *   delete:
 *     summary: Remove product from favorites
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product removed from favorites
 *       401:
 *         description: Unauthorized
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    const token = extractBearerToken(authHeader);
    if (!token) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 },
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { status: "error", message: "Invalid token" },
        { status: 401 },
      );
    }
    const userId = payload.userId as string;

    // Remove from favorites
    await prisma.favorite.deleteMany({
      where: {
        userId,
        productId: id,
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Product removed from favorites",
      data: {
        product_id: id,
        is_favorited: false,
      },
    });
  } catch (error: any) {
    console.error("Error removing favorite:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to remove favorite",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
