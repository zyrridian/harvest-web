import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyToken, extractBearerToken } from "@/features/auth";

/**
 * @swagger
 * /api/v1/farmers/me/orders/{id}:
 *   get:
 *     summary: Get a specific order (as seller)
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

    const order = await prisma.order.findFirst({
      where: {
        id,
        sellerId: payload.userId,
      },
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
                unit: true,
                images: {
                  where: { isPrimary: true },
                  take: 1,
                  select: { url: true },
                },
              },
            },
          },
        },
        deliveryAddress: true,
        reviews: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
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

    return NextResponse.json({
      status: "success",
      data: {
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
          unit: item.product.unit,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount: item.discount,
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
              id: order.deliveryAddress.id,
              name: order.deliveryAddress.recipientName,
              phone: order.deliveryAddress.phone,
              address: order.deliveryAddress.fullAddress,
              city: order.deliveryAddress.city,
              state: order.deliveryAddress.province,
              postal_code: order.deliveryAddress.postalCode,
            }
          : null,
        delivery_date: order.deliveryDate,
        delivery_time_slot: order.deliveryTimeSlot,
        tracking_number: order.trackingNumber,
        estimated_arrival: order.estimatedArrival,
        notes: order.notes,
        cancelled_reason: order.cancelledReason,
        cancelled_at: order.cancelledAt,
        paid_at: order.paidAt,
        reviews: order.reviews,
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

/**
 * @swagger
 * /api/v1/farmers/me/orders/{id}:
 *   patch:
 *     summary: Update order status (as seller)
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
 *               status:
 *                 type: string
 *                 enum: [confirmed, processing, shipped, delivered, completed, cancelled]
 *               tracking_number:
 *                 type: string
 *               estimated_arrival:
 *                 type: string
 *                 format: date-time
 *               cancelled_reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
export async function PATCH(
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

    // Check if order exists and belongs to the seller
    const order = await prisma.order.findFirst({
      where: {
        id,
        sellerId: payload.userId,
      },
    });

    if (!order) {
      return NextResponse.json(
        { status: "error", message: "Order not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { status, tracking_number, estimated_arrival, cancelled_reason } =
      body;

    // Build update data
    const updateData: any = {};

    if (status) {
      // Validate status transition
      const validTransitions: Record<string, string[]> = {
        pending_payment: ["confirmed", "cancelled"],
        pending: ["confirmed", "cancelled"],
        confirmed: ["processing", "cancelled"],
        processing: ["shipped", "cancelled"],
        shipped: ["delivered"],
        delivered: ["completed"],
        completed: [],
        cancelled: [],
      };

      const currentStatus = order.status;
      if (!validTransitions[currentStatus]?.includes(status)) {
        return NextResponse.json(
          {
            status: "error",
            message: `Cannot transition from ${currentStatus} to ${status}`,
          },
          { status: 400 },
        );
      }

      updateData.status = status;

      if (status === "cancelled") {
        updateData.cancelledAt = new Date();
        if (cancelled_reason) {
          updateData.cancelledReason = cancelled_reason;
        }
      }
    }

    if (tracking_number !== undefined) {
      updateData.trackingNumber = tracking_number;
    }

    if (estimated_arrival !== undefined) {
      updateData.estimatedArrival = estimated_arrival
        ? new Date(estimated_arrival)
        : null;
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      status: "success",
      message: "Order updated successfully",
      data: {
        id: updatedOrder.id,
        order_number: updatedOrder.orderNumber,
        status: updatedOrder.status,
        tracking_number: updatedOrder.trackingNumber,
        estimated_arrival: updatedOrder.estimatedArrival,
        cancelled_reason: updatedOrder.cancelledReason,
        cancelled_at: updatedOrder.cancelledAt,
        updated_at: updatedOrder.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to update order",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
