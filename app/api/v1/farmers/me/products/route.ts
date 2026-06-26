import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyToken, extractBearerToken } from "@/features/auth";

/**
 * @swagger
 * /api/v1/farmers/me/products:
 *   get:
 *     summary: Get current farmer's products
 *     tags: [Farmers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, active, inactive, out_of_stock]
 *     responses:
 *       200:
 *         description: List of farmer's products
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") || "all";
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      sellerId: payload.userId,
    };

    if (status === "active") {
      where.isAvailable = true;
      where.stockQuantity = { gt: 0 };
    } else if (status === "inactive") {
      where.isAvailable = false;
    } else if (status === "out_of_stock") {
      where.stockQuantity = 0;
    }

    const [products, totalItems] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          images: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true, thumbnailUrl: true },
          },
          _count: {
            select: { orderItems: true, reviews: true, views: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const formattedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      category: product.category?.name || null,
      category_id: product.categoryId,
      price: product.price,
      unit: product.unit,
      stock: product.stockQuantity,
      is_organic: product.isOrganic,
      is_harvest: product.isHarvest,
      is_available: product.isAvailable,
      image_url: product.images[0]?.url || null,
      rating: product.rating,
      review_count: product.reviewCount,
      view_count: product.viewCount,
      orders_count: product._count.orderItems,
      harvest_date: product.harvestDate,
      target_amount: product.targetAmount,
      current_booked: product.currentBooked,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    }));

    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      status: "success",
      data: formattedProducts,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_items: totalItems,
        items_per_page: limit,
      },
    });
  } catch (error: any) {
    console.error("Error fetching farmer products:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch products",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/v1/farmers/me/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Farmers]
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
 *               - price
 *               - unit
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               long_description:
 *                 type: string
 *               category_id:
 *                 type: string
 *               price:
 *                 type: number
 *               unit:
 *                 type: string
 *               stock:
 *                 type: integer
 *               minimum_order:
 *                 type: integer
 *               maximum_order:
 *                 type: integer
 *               is_organic:
 *                 type: boolean
 *               harvest_date:
 *                 type: string
 *                 format: date-time
 *               images:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     is_primary:
 *                       type: boolean
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               specifications:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     key:
 *                       type: string
 *                     value:
 *                       type: string
 *     responses:
 *       201:
 *         description: Product created successfully
 *       401:
 *         description: Unauthorized
 */
export async function POST(request: NextRequest) {
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

    if (payload.user_type !== "PRODUCER") {
      return NextResponse.json(
        { status: "error", message: "Only producers can create products" },
        { status: 403 },
      );
    }

    // Check if farmer profile exists
    const farmer = await prisma.farmer.findUnique({
      where: { userId: payload.userId },
    });

    if (!farmer) {
      return NextResponse.json(
        {
          status: "error",
          message: "Please complete your farmer profile first",
        },
        { status: 400 },
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
      stock = 0,
      minimum_order = 1,
      maximum_order = 999,
      is_organic = false,
      is_harvest = false,
      target_amount = null,
      harvest_date,
      images = [],
      tags = [],
      specifications = [],
    } = body;

    if (!name || !price || !unit) {
      return NextResponse.json(
        { status: "error", message: "Name, price, and unit are required" },
        { status: 400 },
      );
    }

    // Generate slug
    const slug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
      "-" +
      Date.now().toString(36);

    // Create product
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        longDescription: long_description,
        categoryId: category_id || null,
        sellerId: payload.userId,
        price: parseFloat(price),
        unit,
        stockQuantity: parseInt(stock),
        minimumOrder: parseInt(minimum_order),
        maximumOrder: parseInt(maximum_order),
        isOrganic: is_organic,
        isHarvest: is_harvest,
        targetAmount: target_amount ? parseFloat(target_amount) : null,
        harvestDate: harvest_date ? new Date(harvest_date) : null,
        images: {
          create: images.map((img: any, index: number) => ({
            url: img.url,
            thumbnailUrl: img.thumbnail_url || img.url,
            isPrimary: img.is_primary || index === 0,
            displayOrder: index,
          })),
        },
        tags: {
          create: tags.map((tag: string) => ({ tag })),
        },
        specifications: {
          create: specifications.map((spec: any, index: number) => ({
            specKey: spec.key,
            specValue: spec.value,
            displayOrder: index,
          })),
        },
      },
      include: {
        category: { select: { id: true, name: true } },
        images: true,
        tags: { select: { tag: true } },
        specifications: true,
      },
    });

    // Update farmer's total products count
    await prisma.farmer.update({
      where: { id: farmer.id },
      data: { totalProducts: { increment: 1 } },
    });

    // Update category product count if category exists
    if (category_id) {
      await prisma.category.update({
        where: { id: category_id },
        data: { productCount: { increment: 1 } },
      });
    }

    return NextResponse.json(
      {
        status: "success",
        message: "Product created successfully",
        data: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          category: product.category?.name || null,
          category_id: product.categoryId,
          price: product.price,
          unit: product.unit,
          stock: product.stockQuantity,
          minimum_order: product.minimumOrder,
          maximum_order: product.maximumOrder,
          is_organic: product.isOrganic,
          is_harvest: product.isHarvest,
          is_available: product.isAvailable,
          harvest_date: product.harvestDate,
          target_amount: product.targetAmount,
          current_booked: product.currentBooked,
          images: product.images.map((img) => ({
            id: img.id,
            url: img.url,
            is_primary: img.isPrimary,
          })),
          tags: product.tags.map((t) => t.tag),
          specifications: product.specifications.map((s) => ({
            key: s.specKey,
            value: s.specValue,
          })),
          created_at: product.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to create product",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
