import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAdmin } from "@/features/auth";

/**
 * @swagger
 * /api/v1/admin/categories:
 *   get:
 *     summary: Get all categories (including inactive)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: include_inactive
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include inactive categories
 *     responses:
 *       200:
 *         description: List of all categories
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *   post:
 *     summary: Create a new category
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - slug
 *             properties:
 *               name:
 *                 type: string
 *                 example: Vegetables
 *               slug:
 *                 type: string
 *                 example: vegetables
 *               description:
 *                 type: string
 *                 example: Fresh vegetables from local farms
 *               emoji:
 *                 type: string
 *                 example: 🥦
 *               gradient_colors:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["#E8F5E9", "#A5D6A7"]
 *               display_order:
 *                 type: integer
 *                 example: 1
 *               is_active:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Invalid input or slug already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("include_inactive") !== "false";

    const where = includeInactive ? {} : { isActive: true };

    const categories = await prisma.category.findMany({
      where,
      orderBy: { displayOrder: "asc" },
      include: {
        _count: {
          select: { products: true, subcategories: true },
        },
      },
    });

    const formattedCategories = categories.map((category) => ({
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
    }));

    return NextResponse.json({
      status: "success",
      data: formattedCategories,
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

    console.error("Error fetching categories:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch categories",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request);

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

    // Validation
    if (!name || !slug) {
      return NextResponse.json(
        { status: "error", message: "Name and slug are required" },
        { status: 400 },
      );
    }

    // Check if slug already exists
    const existingCategory = await prisma.category.findUnique({
      where: { slug },
    });

    if (existingCategory) {
      return NextResponse.json(
        { status: "error", message: "Category with this slug already exists" },
        { status: 400 },
      );
    }

    // Create category
    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description: description || null,
        emoji: emoji || null,
        gradientColors: gradient_colors || [],
        displayOrder: display_order || 0,
        isActive: is_active !== undefined ? is_active : true,
      },
    });

    return NextResponse.json(
      {
        status: "success",
        message: "Category created successfully",
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
      },
      { status: 201 },
    );
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

    console.error("Error creating category:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to create category",
      },
      { status: 500 },
    );
  }
}
