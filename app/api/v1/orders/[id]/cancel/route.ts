import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyToken, extractBearerToken } from "@/features/auth";

/**
 * @swagger
 * /api/v1/orders/{id}/cancel:
 *   patch:
 *     summary: Cancel an order
 *     tags: [Orders]
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
 *               reason:
 *                 type: string
 *               details:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order cancelled successfully
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

    const body = await request.json();
    const { reason, details } = body;

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: id },
    });

    if (!order) {
      return NextResponse.json(
        { status: "error", message: "Order not found" },
        { status: 404 },
      );
    }

    // Verify ownership (buyer or seller can cancel)
    if (order.buyerId !== userId && order.sellerId !== userId) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 403 },
      );
    }

    // Check if order can be cancelled
    if (["cancelled", "delivered", "refunded"].includes(order.status)) {
      return NextResponse.json(
        { status: "error", message: "Order cannot be cancelled" },
        { status: 400 },
      );
    }

    // Cancel order
    const cancelledOrder = await prisma.order.update({
      where: { id: id },
      data: {
        status: "cancelled",
        cancelledReason: `${reason}${details ? `: ${details}` : ""}`,
        cancelledAt: new Date(),
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Order cancelled successfully",
      data: {
        order_id: cancelledOrder.id,
        status: cancelledOrder.status,
        refund: order.paidAt
          ? {
              amount: order.totalAmount,
              method: order.paymentMethod,
              estimated_days: 7,
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error("Error cancelling order:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to cancel order",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
