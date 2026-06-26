import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyToken, extractBearerToken } from "@/features/auth";

/**
 * @swagger
 * /api/v1/farmers/me/orders:
 *   get:
 *     summary: Get current farmer's orders (as seller)
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
 *           enum: [all, pending, confirmed, processing, shipped, delivered, completed, cancelled]
 *     responses:
 *       200:
 *         description: List of orders
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
    const deliveryMethod = searchParams.get("delivery_method");
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      sellerId: payload.userId,
    };

    if (status !== "all") {
      where.status = status;
    }

    if (deliveryMethod) {
      where.deliveryMethod = deliveryMethod;
    }

    const [orders, totalItems, stats] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          buyer: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              avatarUrl: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
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
          deliveryAddress: {
            select: {
              recipientName: true,
              phone: true,
              fullAddress: true,
              city: true,
              province: true,
            },
          },
          routeStop: {
            select: {
              id: true,
              routeId: true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
      // Get order stats
      prisma.order.groupBy({
        by: ["status"],
        where: { sellerId: payload.userId },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
    ]);

    const formattedOrders = orders.map((order) => ({
      id: order.id,
      order_number: order.orderNumber,
      status: order.status,
      buyer: {
        id: order.buyer.id,
        name: order.buyer.name,
        email: order.buyer.email,
        phone: order.buyer.phoneNumber,
        avatar: order.buyer.avatarUrl,
      },
      items: order.items.map((item) => ({
        id: item.id,
        product_id: item.productId,
        product_name: item.product.name,
        product_image: item.product.images[0]?.url || null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.subtotal,
      })),
      subtotal: order.subtotal,
      delivery_fee: order.deliveryFee,
      service_fee: order.serviceFee,
      total_discount: order.totalDiscount,
      total_amount: order.totalAmount,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      delivery_method: order.deliveryMethod,
      delivery_address: order.deliveryAddress
        ? {
            name: order.deliveryAddress.recipientName,
            phone: order.deliveryAddress.phone,
            address: order.deliveryAddress.fullAddress,
            city: order.deliveryAddress.city,
            state: order.deliveryAddress.province,
          }
        : null,
      delivery_date: order.deliveryDate,
      delivery_time_slot: order.deliveryTimeSlot,
      tracking_number: order.trackingNumber,
      estimated_arrival: order.estimatedArrival,
      notes: order.notes,
      is_assigned: !!order.routeStop,
      route_id: order.routeStop?.routeId || null,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
    }));

    // Format stats
    const orderStats = {
      total_orders: totalItems,
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      completed: 0,
      cancelled: 0,
      total_revenue: 0,
    };

    stats.forEach((stat) => {
      const status = stat.status as keyof typeof orderStats;
      if (status in orderStats) {
        orderStats[status] = stat._count._all;
      }
      if (stat.status !== "cancelled") {
        orderStats.total_revenue += stat._sum.totalAmount || 0;
      }
    });

    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      status: "success",
      data: formattedOrders,
      stats: orderStats,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_items: totalItems,
        items_per_page: limit,
      },
    });
  } catch (error: any) {
    console.error("Error fetching farmer orders:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch orders",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
