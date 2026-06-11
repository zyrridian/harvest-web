import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import {
  parsePagination,
  buildPaginationMeta,
} from "@/core/helpers/pagination";

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     summary: Get list of products with filters and pagination
 *     tags: [Products]
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
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: seller_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: is_organic
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: min_price
 *         schema:
 *           type: number
 *       - in: query
 *         name: max_price
 *         schema:
 *           type: number
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [price, rating, newest, popular]
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: List of products
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const category = searchParams.get("category");
    const sellerId = searchParams.get("seller_id");
    const isOrganic = searchParams.get("is_organic");
    const minPrice = searchParams.get("min_price");
    const maxPrice = searchParams.get("max_price");
    const sortBy = searchParams.get("sort_by") || "newest";
    const order = searchParams.get("order") || "desc";

    const where: Record<string, unknown> = { isAvailable: true };

    if (category) {
      where.OR = [{ categoryId: category }, { category: { slug: category } }];
    }
    if (sellerId) where.sellerId = sellerId;
    if (isOrganic !== null && isOrganic !== undefined) {
      where.isOrganic = isOrganic === "true";
    }
    if (minPrice || maxPrice) {
      const priceFilter: Record<string, number> = {};
      if (minPrice) priceFilter.gte = parseFloat(minPrice);
      if (maxPrice) priceFilter.lte = parseFloat(maxPrice);
      where.price = priceFilter;
    }

    const orderBy: Record<string, string> =
      sortBy === "price"
        ? { price: order }
        : sortBy === "rating"
          ? { rating: order }
          : sortBy === "popular"
            ? { viewCount: order }
            : { createdAt: order };

    const [products, totalItems] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          seller: { select: { id: true, name: true, avatarUrl: true } },
          images: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true, thumbnailUrl: true },
          },
          tags: { select: { tag: true } },
          discounts: {
            where: {
              isActive: true,
              validFrom: { lte: new Date() },
              validUntil: { gte: new Date() },
            },
            take: 1,
            orderBy: { value: "desc" },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const sellerIds = [...new Set(products.map((p) => p.sellerId))];
    const farmers = await prisma.farmer.findMany({
      where: { userId: { in: sellerIds } },
      select: {
        userId: true,
        name: true,
        profileImage: true,
        isVerified: true,
      },
    });
    const farmerMap = new Map(farmers.map((f) => [f.userId, f]));

    const formattedProducts = products.map((product) => {
      const primaryImage = product.images[0];
      const activeDiscount = product.discounts[0];
      const farmer = farmerMap.get(product.sellerId);

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        category: product.category?.name || null,
        price: product.price,
        currency: product.currency,
        unit: product.unit,
        image: primaryImage?.url || primaryImage?.thumbnailUrl || null,
        images: product.images.map((img) => img.url),
        is_organic: product.isOrganic,
        is_available: product.isAvailable,
        stock_quantity: product.stockQuantity,
        discount: activeDiscount
          ? activeDiscount.type === "percentage"
            ? activeDiscount.value
            : null
          : null,
        rating: product.rating,
        review_count: product.reviewCount,
        farmer: farmer
          ? {
              name: farmer.name,
              profile_image: farmer.profileImage,
              is_verified: farmer.isVerified,
            }
          : {
              name: product.seller.name,
              profile_image: product.seller.avatarUrl,
              is_verified: false,
            },
        is_harvest: product.isHarvest,
        target_amount: product.targetAmount,
        current_booked: product.currentBooked,
        harvest_date: product.harvestDate,
        tags: product.tags.map((t) => t.tag),
        created_at: product.createdAt,
      };
    });

    const totalPages = Math.ceil(totalItems / limit);

    return successResponse({
      products: formattedProducts,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_items: totalItems,
        items_per_page: limit,
        has_next: page < totalPages,
        has_previous: page > 1,
      },
    });
  } catch (error) {
    return handleRouteError(error, "Fetch products");
  }
}
