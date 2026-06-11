import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyToken, extractBearerToken } from "@/features/auth";

/**
 * @swagger
 * /api/v1/orders/{id}:
 *   get:
 *     summary: Get detailed order information
 *     tags: [Orders]
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
 *         description: Order details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
export async function GET(
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

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: id },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        deliveryAddress: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unit: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { status: "error", message: "Order not found" },
        { status: 404 },
      );
    }

    // Verify access (buyer or seller)
    if (order.buyerId !== userId && order.sellerId !== userId) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 403 },
      );
    }

    // Build timeline
    const timeline = [
      { status: "pending_payment", timestamp: order.createdAt },
    ];
    if (order.paidAt) {
      timeline.push({ status: "paid", timestamp: order.paidAt });
    }
    if (order.cancelledAt) {
      timeline.push({ status: "cancelled", timestamp: order.cancelledAt });
    }

    return NextResponse.json({
      status: "success",
      data: {
        order_id: order.id,
        order_number: order.orderNumber,
        status: order.status,
        seller: {
          user_id: order.seller.id,
          name: order.seller.name,
          profile_picture: order.seller.avatarUrl,
        },
        items: order.items.map((item) => ({
          order_item_id: item.id,
          product: {
            product_id: item.productId,
            name: item.productName,
            image: item.productImage,
          },
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount: item.discount,
          subtotal: item.subtotal,
        })),
        delivery: order.deliveryAddress
          ? {
              method: order.deliveryMethod,
              address: {
                address_id: order.deliveryAddress.id,
                full_address: order.deliveryAddress.fullAddress,
                recipient_name: order.deliveryAddress.recipientName,
                phone: order.deliveryAddress.phone,
              },
              date: order.deliveryDate,
              time_slot: order.deliveryTimeSlot,
              fee: order.deliveryFee,
              tracking_number: order.trackingNumber,
              estimated_arrival: order.estimatedArrival,
            }
          : null,
        pricing: {
          subtotal: order.subtotal,
          delivery_fee: order.deliveryFee,
          service_fee: order.serviceFee,
          total_discount: order.totalDiscount,
          total: order.totalAmount,
        },
        payment: {
          method: order.paymentMethod,
          status: order.paymentStatus,
          paid_at: order.paidAt,
        },
        timeline,
        notes: order.notes,
        cancelled_reason: order.cancelledReason,
        created_at: order.createdAt,
        updated_at: order.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch order",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
