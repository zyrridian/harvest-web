import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import {
  parsePagination,
  buildPaginationMeta,
} from "@/core/helpers/pagination";
import { CreateOrderSchema } from "@/core/validation";
import { BUSINESS } from "@/core/config/constants";
import { snap } from "@/core/services/midtrans";

// Helper function to generate order number
function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `FM${year}${month}${day}${random}`;
}

/**
 * @swagger
 * /api/v1/sales/orders:
 *   get:
 *     summary: Get user's orders list
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [buyer, seller]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: List of orders
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    const userId = payload.userId;

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") || "buyer";
    const status = searchParams.get("status");
    const { page, limit, skip } = parsePagination(searchParams);

    // Build where clause
    const where: Record<string, unknown> =
      role === "seller" ? { sellerId: userId } : { buyerId: userId };
    if (status) {
      where.status = status;
    }

    // Get orders
    const [orders, totalItems] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          seller: {
            select: { id: true, name: true, avatarUrl: true },
          },
          items: {
            take: 3,
            include: {
              product: {
                select: { name: true, unit: true },
              },
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    const formattedOrders = orders.map((order) => ({
      order_id: order.id,
      order_number: order.orderNumber,
      status: order.status,
      seller: {
        user_id: order.seller.id,
        name: order.seller.name,
        profile_picture: order.seller.avatarUrl,
      },
      items: order.items.map((item) => ({
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit: item.product.unit,
        image: item.productImage,
      })),
      item_count: order.items.length,
      total_quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
      total_amount: order.totalAmount,
      currency: BUSINESS.CURRENCY,
      delivery: {
        method: order.deliveryMethod,
        date: order.deliveryDate,
        tracking_number: order.trackingNumber,
      },
      created_at: order.createdAt,
    }));

    return successResponse({
      orders: formattedOrders,
      pagination: buildPaginationMeta(page, limit, totalItems),
    });
  } catch (error) {
    return handleRouteError(error, "Fetch orders");
  }
}

/**
 * @swagger
 * /api/v1/sales/orders:
 *   post:
 *     summary: Create new order from cart items
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cart_item_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               delivery_address_id:
 *                 type: string
 *               delivery_method:
 *                 type: string
 *               delivery_date:
 *                 type: string
 *               delivery_time_slot:
 *                 type: string
 *               payment_method:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created successfully
 *       401:
 *         description: Unauthorized
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    const userId = payload.userId;

    const body = await request.json();
    const {
      cart_item_ids,
      delivery_address_id,
      delivery_method,
      delivery_fee: provided_delivery_fee,
      delivery_date,
      delivery_time_slot,
      payment_method,
      notes,
    } = body;

    // delivery_fee from client (already estimated/negotiated)
    // Fall back to constant only for home_delivery if not provided
    const clientDeliveryFee =
      typeof provided_delivery_fee === "number" ? provided_delivery_fee : null;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound("User not found");
    const isWholesale = user.isWholesale;
    const orderLimit = isWholesale ? user.wholesaleLimit || 9999 : 50;

    // Get cart items
    const cartItems = await prisma.cartItem.findMany({
      where: {
        id: { in: cart_item_ids },
        cart: { userId },
      },
      include: {
        product: {
          include: {
            seller: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
    });

    if (cartItems.length === 0) {
      throw AppError.notFound("No valid cart items found");
    }

    // Group items by seller
    const itemsBySeller: Record<string, typeof cartItems> = {};
    cartItems.forEach((item) => {
      const sellerId = item.product.sellerId;
      if (!itemsBySeller[sellerId]) {
        itemsBySeller[sellerId] = [];
      }
      itemsBySeller[sellerId].push(item);
    });

    // Create orders for each seller (wrapped in transaction)
    const createdOrders = await prisma.$transaction(async (tx) => {
      const orders = [];

      for (const [sellerId, items] of Object.entries(itemsBySeller)) {
        const farmer = await tx.farmer.findUnique({
          where: { userId: sellerId },
          include: { deliverySettings: true },
        });

        if (
          payment_method === "cod" &&
          !farmer?.deliverySettings?.cashOnDeliveryEnabled
        ) {
          throw AppError.badRequest(
            `Cash on Delivery is not available for ${farmer?.name || "this farmer"}`,
          );
        }

        const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        // Use client-provided fee if available, else fallback by method
        let deliveryFee: number;
        if (clientDeliveryFee !== null) {
          deliveryFee = clientDeliveryFee;
        } else if (delivery_method === "self_pickup") {
          deliveryFee = 0;
        } else {
          deliveryFee = BUSINESS.DELIVERY_FEE;
        }
        const serviceFee = BUSINESS.SERVICE_FEE;
        const totalDiscount = items.reduce(
          (sum, item) =>
            sum +
            (item.unitPrice - (item.discountPrice || item.unitPrice)) *
              item.quantity,
          0,
        );
        const totalAmount = subtotal + deliveryFee + serviceFee;

        const hasHarvestItems = items.some((item) => item.product.isHarvest);

        // Validate harvest limits
        if (hasHarvestItems) {
          for (const item of items) {
            if (item.product.isHarvest && item.quantity > orderLimit) {
              throw AppError.badRequest(
                `Harvest limit exceeded for ${item.product.name}. Limit is ${orderLimit}.`,
              );
            }
          }
        }

        const isDeposit = hasHarvestItems;
        const depositAmount = isDeposit ? totalAmount * 0.2 : null;

        const isCOD = payment_method === "cod";
        const orderStatus = isCOD ? "confirmed" : "pending_payment";

        const order = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            buyerId: userId,
            sellerId,
            status: orderStatus,
            subtotal,
            deliveryFee,
            serviceFee,
            totalDiscount,
            totalAmount,
            paymentMethod: payment_method,
            paymentStatus: isCOD ? "pending" : "pending", // both pending, but status is different
            isDeposit,
            depositAmount,
            deliveryMethod: delivery_method,
            deliveryAddressId: delivery_address_id,
            deliveryDate: delivery_date ? new Date(delivery_date) : null,
            deliveryTimeSlot: delivery_time_slot,
            notes,
            items: {
              create: items.map((item) => ({
                productId: item.productId,
                productName: item.product.name,
                productImage: item.product.images?.[0]?.url || null,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount:
                  (item.unitPrice - (item.discountPrice || item.unitPrice)) *
                  item.quantity,
                subtotal: item.subtotal,
              })),
            },
          },
          include: { items: true },
        });

        orders.push({
          order_id: order.id,
          order_number: order.orderNumber,
          status: order.status,
          total_amount: order.totalAmount,
        });

        // Remove items from cart
        await tx.cartItem.deleteMany({
          where: { id: { in: items.map((item) => item.id) } },
        });

        // Update harvest currentBooked
        if (hasHarvestItems) {
          for (const item of items) {
            if (item.product.isHarvest) {
              await tx.product.update({
                where: { id: item.productId },
                data: { currentBooked: { increment: item.quantity } },
              });
            }
          }
        }
      }

      return orders;
    });

    const isCOD = payment_method === "cod";
    const totalAmount = createdOrders.reduce(
      (sum, order) => sum + order.total_amount,
      0,
    );

    // Generate Midtrans Snap token for non-COD payments
    let snapToken: string | null = null;
    let paymentUrl: string | null = null;

    if (!isCOD) {
      try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const orderIds = createdOrders.map((o) => o.order_id).join(",");

        const snapParameter = {
          transaction_details: {
            order_id: `HARVEST-${createdOrders[0].order_number}-${Date.now()}`,
            gross_amount: Math.round(totalAmount),
          },
          customer_details: {
            first_name: user?.name || "Customer",
            email: user?.email || undefined,
          },
          item_details: createdOrders.map((o) => ({
            id: o.order_id,
            price: Math.round(o.total_amount),
            quantity: 1,
            name: `Order ${o.order_number}`,
          })),
          callbacks: {
            finish: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/checkout/success?orders=${orderIds}&total=${totalAmount}&method=${payment_method}`,
            error: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/checkout?error=payment_failed`,
            pending: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/checkout/success?orders=${orderIds}&total=${totalAmount}&method=${payment_method}&pending=1`,
          },
          // Allow all enabled Midtrans payment methods, or narrow by type
          enabled_payments:
            payment_method === "bank_transfer"
              ? [
                  "bca_va",
                  "bni_va",
                  "bri_va",
                  "permata_va",
                  "mandiri_bill",
                  "other_va",
                ]
              : payment_method === "e_wallet"
                ? ["gopay", "shopeepay", "dana", "ovo", "qris"]
                : payment_method === "credit_card"
                  ? ["credit_card"]
                  : undefined,
        };

        const snapResponse = await snap.createTransaction(snapParameter);
        snapToken = snapResponse.token;
        paymentUrl = snapResponse.redirect_url;

        // Store the Midtrans order_id reference in each order
        for (const o of createdOrders) {
          await prisma.order.update({
            where: { id: o.order_id },
            data: {
              trackingNumber: snapParameter.transaction_details.order_id,
            },
          });
        }
      } catch (err: any) {
        console.error("Midtrans token generation failed:", err);
        // Don't block order creation — let frontend fall back to success page without Snap
      }
    }

    return successResponse(
      {
        orders: createdOrders,
        snap_token: snapToken,
        payment_url: paymentUrl,
        payment_summary: {
          total_orders: createdOrders.length,
          grand_total: totalAmount,
          payment_method,
          payment_instructions: isCOD
            ? {
                message:
                  "Please prepare the exact amount to pay the farmer upon delivery.",
                amount: totalAmount,
              }
            : snapToken
              ? {
                  message: "Complete your payment via Midtrans.",
                  amount: totalAmount,
                }
              : {
                  bank_name: "Bank Mandiri",
                  account_number: "1234567890",
                  account_name: "Farm Market",
                  amount: totalAmount,
                  valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000),
                },
        },
      },
      { message: "Order created successfully", status: 201 },
    );
  } catch (error) {
    return handleRouteError(error, "Create order");
  }
}
