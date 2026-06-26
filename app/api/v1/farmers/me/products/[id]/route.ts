import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyToken, extractBearerToken } from "@/features/auth";

/**
 * @swagger
 * /api/v1/farmers/me/products/{id}:
 *   get:
 *     summary: Get a specific product by ID (owned by the farmer)
 *     tags: [Farmers]
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
 *         description: Product details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = extractBearerToken(request.headers.get("authorization"));
    if (!token) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 },
      );
    }

    const payload = await verifyToken(token);
    if (!payload || payload.type !== "access") {
      return NextResponse.json(
        { status: "error", message: "Invalid token" },
        { status: 401 },
      );
    }

    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: {
        id,
        sellerId: payload.userId,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { displayOrder: "asc" } },
        tags: { select: { tag: true } },
        specifications: { orderBy: { displayOrder: "asc" } },
        certifications: true,
        discounts: {
          where: { isActive: true },
          orderBy: { validUntil: "desc" },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { status: "error", message: "Product not found or not owned by you" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      status: "success",
      data: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        long_description: product.longDescription,
        category: product.category
          ? {
              id: product.category.id,
              name: product.category.name,
              slug: product.category.slug,
            }
          : null,
        subcategory: product.subcategory
          ? {
              id: product.subcategory.id,
              name: product.subcategory.name,
              slug: product.subcategory.slug,
            }
          : null,
        price: product.price,
        currency: product.currency,
        unit: product.unit,
        unit_weight: product.unitWeight,
        stock: product.stockQuantity,
        minimum_order: product.minimumOrder,
        maximum_order: product.maximumOrder,
        is_organic: product.isOrganic,
        is_available: product.isAvailable,
        rating: product.rating,
        review_count: product.reviewCount,
        view_count: product.viewCount,
        harvest_date: product.harvestDate,
        images: product.images.map((img) => ({
          id: img.id,
          url: img.url,
          thumbnail_url: img.thumbnailUrl,
          is_primary: img.isPrimary,
          display_order: img.displayOrder,
        })),
        tags: product.tags.map((t) => t.tag),
        specifications: product.specifications.map((s) => ({
          id: s.id,
          key: s.specKey,
          value: s.specValue,
        })),
        certifications: product.certifications.map((c) => ({
          id: c.id,
          name: c.name,
          issuer: c.issuer,
          verified: c.verified,
        })),
        discounts: product.discounts.map((d) => ({
          id: d.id,
          type: d.type,
          value: d.value,
          valid_from: d.validFrom,
          valid_until: d.validUntil,
          is_active: d.isActive,
        })),
        created_at: product.createdAt,
        updated_at: product.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch product",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/v1/farmers/me/products/{id}:
 *   put:
 *     summary: Update a product
 *     tags: [Farmers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               is_available:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = extractBearerToken(request.headers.get("authorization"));
    if (!token) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 },
      );
    }

    const payload = await verifyToken(token);
    if (!payload || payload.type !== "access") {
      return NextResponse.json(
        { status: "error", message: "Invalid token" },
        { status: 401 },
      );
    }

    const { id } = await params;

    // Check if product exists and belongs to the user
    const existingProduct = await prisma.product.findFirst({
      where: { id, sellerId: payload.userId },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { status: "error", message: "Product not found or not owned by you" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      long_description,
      category_id,
      price,
      unit,
      stock,
      minimum_order,
      maximum_order,
      is_organic,
      is_available,
      harvest_date,
      images,
      tags,
      specifications,
    } = body;

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (long_description !== undefined)
      updateData.longDescription = long_description;
    if (category_id !== undefined) updateData.categoryId = category_id || null;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (unit !== undefined) updateData.unit = unit;
    if (stock !== undefined) updateData.stockQuantity = parseInt(stock);
    if (minimum_order !== undefined)
      updateData.minimumOrder = parseInt(minimum_order);
    if (maximum_order !== undefined)
      updateData.maximumOrder = parseInt(maximum_order);
    if (is_organic !== undefined) updateData.isOrganic = is_organic;
    if (is_available !== undefined) updateData.isAvailable = is_available;
    if (harvest_date !== undefined) {
      updateData.harvestDate = harvest_date ? new Date(harvest_date) : null;
    }

    // Update product
    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    // Update images if provided
    if (images !== undefined) {
      await prisma.productImage.deleteMany({ where: { productId: id } });
      if (images.length > 0) {
        await prisma.productImage.createMany({
          data: images.map((img: any, index: number) => ({
            productId: id,
            url: img.url,
            thumbnailUrl: img.thumbnail_url || img.url,
            isPrimary: img.is_primary || index === 0,
            displayOrder: index,
          })),
        });
      }
    }

    // Update tags if provided
    if (tags !== undefined) {
      await prisma.productTag.deleteMany({ where: { productId: id } });
      if (tags.length > 0) {
        await prisma.productTag.createMany({
          data: tags.map((tag: string) => ({
            productId: id,
            tag,
          })),
        });
      }
    }

    // Update specifications if provided
    if (specifications !== undefined) {
      await prisma.productSpecification.deleteMany({
        where: { productId: id },
      });
      if (specifications.length > 0) {
        await prisma.productSpecification.createMany({
          data: specifications.map((spec: any, index: number) => ({
            productId: id,
            specKey: spec.key,
            specValue: spec.value,
            displayOrder: index,
          })),
        });
      }
    }

    // Handle category count update if category changed
    if (
      category_id !== undefined &&
      existingProduct.categoryId !== category_id
    ) {
      if (existingProduct.categoryId) {
        await prisma.category.update({
          where: { id: existingProduct.categoryId },
          data: { productCount: { decrement: 1 } },
        });
      }
      if (category_id) {
        await prisma.category.update({
          where: { id: category_id },
          data: { productCount: { increment: 1 } },
        });
      }
    }

    // Fetch updated product
    const updatedProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { displayOrder: "asc" } },
        tags: { select: { tag: true } },
        specifications: { orderBy: { displayOrder: "asc" } },
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Product updated successfully",
      data: {
        id: updatedProduct!.id,
        name: updatedProduct!.name,
        description: updatedProduct!.description,
        category: updatedProduct!.category?.name || null,
        price: updatedProduct!.price,
        unit: updatedProduct!.unit,
        stock: updatedProduct!.stockQuantity,
        is_organic: updatedProduct!.isOrganic,
        is_available: updatedProduct!.isAvailable,
        images: updatedProduct!.images.map((img) => ({
          id: img.id,
          url: img.url,
          is_primary: img.isPrimary,
        })),
        tags: updatedProduct!.tags.map((t) => t.tag),
        specifications: updatedProduct!.specifications.map((s) => ({
          key: s.specKey,
          value: s.specValue,
        })),
        updated_at: updatedProduct!.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to update product",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/v1/farmers/me/products/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags: [Farmers]
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
 *         description: Product deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = extractBearerToken(request.headers.get("authorization"));
    if (!token) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 },
      );
    }

    const payload = await verifyToken(token);
    if (!payload || payload.type !== "access") {
      return NextResponse.json(
        { status: "error", message: "Invalid token" },
        { status: 401 },
      );
    }

    const { id } = await params;

    // Check if product exists and belongs to the user
    const product = await prisma.product.findFirst({
      where: { id, sellerId: payload.userId },
    });

    if (!product) {
      return NextResponse.json(
        { status: "error", message: "Product not found or not owned by you" },
        { status: 404 },
      );
    }

    // Delete the product (cascades to related records)
    await prisma.product.delete({ where: { id } });

    // Update farmer's total products count
    const farmer = await prisma.farmer.findUnique({
      where: { userId: payload.userId },
    });
    if (farmer) {
      await prisma.farmer.update({
        where: { id: farmer.id },
        data: { totalProducts: { decrement: 1 } },
      });
    }

    // Update category product count
    if (product.categoryId) {
      await prisma.category.update({
        where: { id: product.categoryId },
        data: { productCount: { decrement: 1 } },
      });
    }

    return NextResponse.json({
      status: "success",
      message: "Product deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to delete product",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
