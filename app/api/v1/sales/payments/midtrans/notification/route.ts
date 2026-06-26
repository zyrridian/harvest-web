import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { coreApi, MIDTRANS_SERVER_KEY } from "@/core/services/midtrans";
import crypto from "crypto";

/**
 * POST /api/v1/payments/midtrans/notification
 * Midtrans server-to-server webhook for payment status updates.
 * Midtrans calls this when any transaction status changes.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      order_id, // e.g. "HARVEST-FM20260503ABCDEF-1746266400000"
      transaction_status,
      fraud_status,
      gross_amount,
      signature_key,
      status_code,
    } = body;

    // --- Verify signature ---
    const expectedSignature = crypto
      .createHash("sha512")
      .update(`${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`)
      .digest("hex");

    if (signature_key !== expectedSignature) {
      console.warn("Midtrans: invalid signature", { order_id });
      return NextResponse.json(
        { status: "error", message: "Invalid signature" },
        { status: 401 },
      );
    }

    // --- Map Midtrans status to our payment/order status ---
    let paymentStatus: string;
    let orderStatus: string | null = null;
    let paidAt: Date | null = null;

    if (transaction_status === "capture") {
      if (fraud_status === "accept") {
        paymentStatus = "paid";
        orderStatus = "confirmed";
        paidAt = new Date();
      } else {
        paymentStatus = "fraud";
        orderStatus = "cancelled";
      }
    } else if (transaction_status === "settlement") {
      paymentStatus = "paid";
      orderStatus = "confirmed";
      paidAt = new Date();
    } else if (
      transaction_status === "cancel" ||
      transaction_status === "deny" ||
      transaction_status === "expire"
    ) {
      paymentStatus = "failed";
      orderStatus = "cancelled";
    } else if (transaction_status === "pending") {
      paymentStatus = "pending";
    } else {
      paymentStatus = transaction_status;
    }

    // --- Find orders by the Midtrans order_id stored in trackingNumber ---
    const orders = await prisma.order.findMany({
      where: { trackingNumber: order_id },
    });

    if (orders.length === 0) {
      console.warn("Midtrans notification: no orders found for", order_id);
      // Return 200 so Midtrans doesn't retry
      return NextResponse.json({ status: "ok", message: "No matching orders" });
    }

    // --- Update all matched orders ---
    await prisma.order.updateMany({
      where: { trackingNumber: order_id },
      data: {
        paymentStatus,
        ...(orderStatus && { status: orderStatus }),
        ...(paidAt && { paidAt }),
      },
    });

    console.log(
      `Midtrans: updated ${orders.length} order(s) for ${order_id} → ${paymentStatus}`,
    );

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("Midtrans notification error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
