import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAdmin } from "@/features/auth";

/**
 * @swagger
 * /api/v1/admin/categories/{id}:
 *   get:
 *     summary: Get a specific category
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category details
 *       404:
 *         description: Category not found
 *   patch:
 *     summary: Update a category
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
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
 *               slug:
 *                 type: string
 *               description:
 *                 type: string
 *               emoji:
 *                 type: string
 *               gradient_colors:
 *                 type: array
 *                 items:
 *                   type: string
 *               display_order:
 *                 type: integer
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       404:
 *         description: Category not found
 *   delete:
 *     summary: Delete a category
 *     description: Deletes a category if it has no products. Otherwise, deactivates it.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: force
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Force delete even if products exist (products will be uncategorized)
 *     responses:
 *       200:
 *         description: Category deleted or deactivated
 *       400:
 *         description: Cannot delete - has products
 *       404:
 *         description: Category not found
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await verifyAdmin(request);
    const { id } = await params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true, subcategories: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { status: "error", message: "Category not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      status: "success",
      data: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        emoji: category.emoji,
        gradient_colors: category.gradientColors,
        product_count: category._count.products,
        subcategory_count: category._count.subcategories,
        display_order: category.displayOrder,
        is_active: category.isActive,
      },
    });
  } catch (error: any) {
    if (error.message?.includes("Forbidden") || error.status === 403) {
      return NextResponse.json(
        { status: "error", message: "Admin access required" },
        { status: 403 },
      );
    }

    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 },
      );
    }

    console.error("Error fetching category:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to fetch category" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await verifyAdmin(request);
    const { id } = await params;

    const body = await request.json();
    const {
      name,
      slug,
      description,
      emoji,
      gradient_colors,
      display_order,
      is_active,
    } = body;

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { status: "error", message: "Category not found" },
        { status: 404 },
      );
    }

    // Check if slug is being changed and if it already exists
    if (slug && slug !== existingCategory.slug) {
      const slugExists = await prisma.category.findUnique({
        where: { slug },
      });

      if (slugExists) {
        return NextResponse.json(
          {
            status: "error",
            message: "Category with this slug already exists",
          },
          { status: 400 },
        );
      }
    }

    // Update category
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (emoji !== undefined) updateData.emoji = emoji;
    if (gradient_colors !== undefined)
      updateData.gradientColors = gradient_colors;
    if (display_order !== undefined) updateData.displayOrder = display_order;
    if (is_active !== undefined) updateData.isActive = is_active;

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      status: "success",
      message: "Category updated successfully",
      data: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        emoji: category.emoji,
        gradient_colors: category.gradientColors,
        display_order: category.displayOrder,
        is_active: category.isActive,
      },
    });
  } catch (error: any) {
    if (error.message?.includes("Forbidden") || error.status === 403) {
      return NextResponse.json(
        { status: "error", message: "Admin access required" },
        { status: 403 },
      );
    }

    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 },
      );
    }

    console.error("Error updating category:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to update category" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await verifyAdmin(request);
    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { status: "error", message: "Category not found" },
        { status: 404 },
      );
    }

    // If category has products
    if (category._count.products > 0) {
      if (force) {
        // Force delete: set all products' categoryId to null
        await prisma.product.updateMany({
          where: { categoryId: id },
          data: { categoryId: null },
        });

        // Delete the category
        await prisma.category.delete({
          where: { id },
        });

        return NextResponse.json({
          status: "success",
          message: `Category deleted. ${category._count.products} products were uncategorized.`,
        });
      } else {
        // Soft delete: just deactivate
        await prisma.category.update({
          where: { id },
          data: { isActive: false },
        });

        return NextResponse.json({
          status: "success",
          message: `Category deactivated (has ${category._count.products} products). Use force=true to delete and uncategorize products.`,
          data: {
            deactivated: true,
            product_count: category._count.products,
          },
        });
      }
    }

    // No products, safe to delete
    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({
      status: "success",
      message: "Category deleted successfully",
    });
  } catch (error: any) {
    if (error.message?.includes("Forbidden") || error.status === 403) {
      return NextResponse.json(
        { status: "error", message: "Admin access required" },
        { status: 403 },
      );
    }

    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 },
      );
    }

    console.error("Error deleting category:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to delete category" },
      { status: 500 },
    );
  }
}
