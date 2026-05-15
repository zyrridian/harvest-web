import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyToken, extractBearerToken } from "@/features/auth";

/**
 * @swagger
 * /api/v1/farmer/stats:
 *   get:
 *     summary: Get farmer dashboard statistics
 *     tags: [Farmer Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
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

    // Get farmer profile
    const farmer = await prisma.farmer.findUnique({
      where: { userId: payload.userId },
    });

    if (!farmer) {
      return NextResponse.json(
        { status: "error", message: "Farmer profile not found" },
        { status: 404 },
      );
    }

    // Get current date info for time-based queries
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Parallel queries for stats
    const [
      totalProducts,
      activeProducts,
      outOfStockProducts,
      totalOrders,
      pendingOrders,
      completedOrders,
      todayOrders,
      monthRevenue,
      lastMonthRevenue,
      totalViews,
      recentOrders,
      topProducts,
    ] = await Promise.all([
      // Product counts
      prisma.product.count({ where: { sellerId: payload.userId } }),
      prisma.product.count({
        where: {
          sellerId: payload.userId,
          isAvailable: true,
          stockQuantity: { gt: 0 },
        },
      }),
      prisma.product.count({
        where: { sellerId: payload.userId, stockQuantity: 0 },
      }),

      // Order counts
      prisma.order.count({ where: { sellerId: payload.userId } }),
      prisma.order.count({
        where: {
          sellerId: payload.userId,
          status: {
            in: ["pending", "pending_payment", "confirmed", "processing"],
          },
        },
      }),
      prisma.order.count({
        where: { sellerId: payload.userId, status: "completed" },
      }),
      prisma.order.count({
        where: { sellerId: payload.userId, createdAt: { gte: startOfToday } },
      }),

      // Revenue this month
      prisma.order.aggregate({
        where: {
          sellerId: payload.userId,
          status: { notIn: ["cancelled"] },
          createdAt: { gte: startOfMonth },
        },
        _sum: { totalAmount: true },
      }),

      // Revenue last month
      prisma.order.aggregate({
        where: {
          sellerId: payload.userId,
          status: { notIn: ["cancelled"] },
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { totalAmount: true },
      }),

      // Total product views
      prisma.productView.count({
        where: {
          product: { sellerId: payload.userId },
        },
      }),

      // Recent orders
      prisma.order.findMany({
        where: { sellerId: payload.userId },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          buyer: { select: { name: true, avatarUrl: true } },
          items: {
            take: 1,
            include: {
              product: {
                select: {
                  name: true,
                  images: {
                    where: { isPrimary: true },
                    take: 1,
                    select: { url: true },
                  },
                },
              },
            },
          },
        },
      }),

      // Top selling products
      prisma.orderItem.groupBy({
        by: ["productId"],
        where: { order: { sellerId: payload.userId, status: "completed" } },
        _sum: { quantity: true },
        _count: { _all: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
    ]);

    // Get product details for top products
    const topProductIds = topProducts.map((p) => p.productId);
    const topProductDetails = await prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: {
        id: true,
        name: true,
        price: true,
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      },
    });

    // Map top products with details
    const topProductsWithDetails = topProducts.map((p) => {
      const product = topProductDetails.find((pd) => pd.id === p.productId);
      return {
        product_id: p.productId,
        product_name: product?.name || "Unknown",
        product_image: product?.images[0]?.url || null,
        price: product?.price || 0,
        total_sold: p._sum.quantity || 0,
        order_count: p._count._all,
      };
    });

    // Calculate revenue change percentage
    const currentRevenue = monthRevenue._sum.totalAmount || 0;
    const previousRevenue = lastMonthRevenue._sum.totalAmount || 0;
    const revenueChange =
      previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : currentRevenue > 0
          ? 100
          : 0;

    return NextResponse.json({
      status: "success",
      data: {
        profile: {
          id: farmer.id,
          name: farmer.name,
          profile_image: farmer.profileImage,
          is_verified: farmer.isVerified,
          rating: farmer.rating,
          total_reviews: farmer.totalReviews,
        },
        products: {
          total: totalProducts,
          active: activeProducts,
          out_of_stock: outOfStockProducts,
          inactive: totalProducts - activeProducts - outOfStockProducts,
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          completed: completedOrders,
          today: todayOrders,
        },
        revenue: {
          this_month: currentRevenue,
          last_month: previousRevenue,
          change_percentage: Math.round(revenueChange * 100) / 100,
          currency: "IDR",
        },
        engagement: {
          total_views: totalViews,
          followers: farmer.followersCount,
        },
        recent_orders: recentOrders.map((order) => ({
          id: order.id,
          order_number: order.orderNumber,
          status: order.status,
          total_amount: order.totalAmount,
          buyer_name: order.buyer.name,
          buyer_avatar: order.buyer.avatarUrl,
          first_item: order.items[0]
            ? {
                name: order.items[0].product.name,
                image: order.items[0].product.images[0]?.url || null,
              }
            : null,
          items_count: order.items.length,
          created_at: order.createdAt,
        })),
        top_products: topProductsWithDetails,
      },
    });
  } catch (error: any) {
    console.error("Error fetching farmer stats:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch stats",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
