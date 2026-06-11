import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAdmin } from "@/features/auth";

/**
 * @swagger
 * /api/v1/admin/orders/{id}/status:
 *   put:
 *     summary: Update order status
 *     tags: [Admin]
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
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING_PAYMENT, PAID, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED]
 *               tracking_number:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order status updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Order not found
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await verifyAdmin(request);
    const body = await request.json();

    const { status, tracking_number } = body;

    if (!status) {
      return NextResponse.json(
        {
          status: "error",
          message: "Status is required",
        },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json(
        {
          status: "error",
          message: "Order not found",
        },
        { status: 404 },
      );
    }

    const updateData: any = { status };

    if (tracking_number) {
      updateData.trackingNumber = tracking_number;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      status: "success",
      message: "Order status updated successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("Update order status error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error.message || "Failed to update order status",
      },
      { status: error.status || 500 },
    );
  }
}
