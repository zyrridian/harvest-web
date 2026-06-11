import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAdmin } from "@/features/auth";

/**
 * @swagger
 * /api/v1/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);

    // Get current date ranges
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    );

    // Parallel queries for better performance
    const [
      totalUsers,
      newUsersToday,
      newUsersThisMonth,
      newUsersLastMonth,
      totalProducts,
      activeProducts,
      totalOrders,
      ordersToday,
      ordersThisMonth,
      totalRevenue,
      revenueThisMonth,
      revenueLastMonth,
      pendingOrders,
      totalFarmers,
      verifiedFarmers,
      totalPosts,
      totalReviews,
      unreadNotifications,
    ] = await Promise.all([
      // Users
      prisma.user.count(),
      prisma.user.count({
        where: { createdAt: { gte: startOfToday } },
      }),
      prisma.user.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      prisma.user.count({
        where: {
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
      }),

      // Products
      prisma.product.count(),
      prisma.product.count({
        where: { isAvailable: true },
      }),

      // Orders
      prisma.order.count(),
      prisma.order.count({
        where: { createdAt: { gte: startOfToday } },
      }),
      prisma.order.count({
        where: { createdAt: { gte: startOfMonth } },
      }),

      // Revenue
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: { in: ["DELIVERED", "SHIPPED", "PROCESSING"] } },
      }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: { gte: startOfMonth },
          status: { in: ["DELIVERED", "SHIPPED", "PROCESSING"] },
        },
      }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
          status: { in: ["DELIVERED", "SHIPPED", "PROCESSING"] },
        },
      }),

      // Pending items
      prisma.order.count({
        where: { status: "PENDING_PAYMENT" },
      }),

      // Farmers
      prisma.farmer.count(),
      prisma.farmer.count({
        where: { isVerified: true },
      }),

      // Community
      prisma.communityPost.count(),

      // Reviews
      prisma.review.count(),

      // Notifications (example - would need user context)
      prisma.notification.count({
        where: { isRead: false },
      }),
    ]);

    // Calculate growth percentages
    const userGrowth =
      newUsersLastMonth > 0
        ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100
        : 0;

    const revenueGrowth =
      (revenueLastMonth._sum.totalAmount || 0) > 0
        ? (((revenueThisMonth._sum.totalAmount || 0) -
            (revenueLastMonth._sum.totalAmount || 0)) /
            (revenueLastMonth._sum.totalAmount || 0)) *
          100
        : 0;

    // Get recent orders
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Get top products by views
    const topProducts = await prisma.product.findMany({
      take: 5,
      orderBy: { reviewCount: "desc" },
      select: {
        id: true,
        name: true,
        price: true,
        reviewCount: true,
        rating: true,
        seller: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Order status breakdown
    const ordersByStatus = await prisma.order.groupBy({
      by: ["status"],
      _count: true,
    });

    return NextResponse.json({
      status: "success",
      data: {
        overview: {
          users: {
            total: totalUsers,
            new_today: newUsersToday,
            new_this_month: newUsersThisMonth,
            growth_percentage: parseFloat(userGrowth.toFixed(2)),
          },
          products: {
            total: totalProducts,
            active: activeProducts,
            inactive: totalProducts - activeProducts,
          },
          orders: {
            total: totalOrders,
            today: ordersToday,
            this_month: ordersThisMonth,
            pending: pendingOrders,
          },
          revenue: {
            total: totalRevenue._sum.totalAmount || 0,
            this_month: revenueThisMonth._sum.totalAmount || 0,
            last_month: revenueLastMonth._sum.totalAmount || 0,
            growth_percentage: parseFloat(revenueGrowth.toFixed(2)),
          },
          farmers: {
            total: totalFarmers,
            verified: verifiedFarmers,
            unverified: totalFarmers - verifiedFarmers,
          },
          community: {
            posts: totalPosts,
            reviews: totalReviews,
          },
          notifications: {
            unread: unreadNotifications,
          },
        },
        recent_orders: recentOrders,
        top_products: topProducts,
        orders_by_status: ordersByStatus.reduce(
          (acc, item) => {
            acc[item.status] = item._count;
            return acc;
          },
          {} as Record<string, number>,
        ),
      },
    });
  } catch (error: any) {
    console.error("Admin dashboard error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error.message || "Failed to get dashboard data",
      },
      { status: error.status || 500 },
    );
  }
}
