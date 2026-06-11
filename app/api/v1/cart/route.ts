import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { BUSINESS } from "@/core/config/constants";

/**
 * @swagger
 * /api/v1/cart:
 *   get:
 *     summary: Get user's shopping cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shopping cart details
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    const userId = payload.userId;

    // Cart include config (reused for find and create)
    const cartInclude = {
      items: {
        include: {
          product: {
            include: {
              seller: {
                select: { id: true, name: true, avatarUrl: true },
              },
              images: {
                where: { isPrimary: true },
                take: 1,
              },
              discounts: {
                where: {
                  isActive: true,
                  validFrom: { lte: new Date() },
                  validUntil: { gte: new Date() },
                },
                take: 1,
                orderBy: { value: "desc" as const },
              },
            },
          },
        },
      },
    };

    // Get or create cart
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: cartInclude,
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: cartInclude,
      });
    }

    // Format cart items
    const formattedItems = cart.items.map((item) => {
      const primaryImage = item.product.images[0];
      const activeDiscount = item.product.discounts[0];
      const discountPrice = activeDiscount
        ? activeDiscount.type === "percentage"
          ? item.product.price * (1 - activeDiscount.value / 100)
          : item.product.price - activeDiscount.value
        : null;

      return {
        cart_item_id: item.id,
        product: {
          product_id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          discount: activeDiscount
            ? {
                discounted_price: discountPrice,
                value: activeDiscount.value,
                valid_until: activeDiscount.validUntil,
              }
            : null,
          image: primaryImage?.url || null,
          unit: item.product.unit,
          stock_quantity: item.product.stockQuantity,
          minimum_order: item.product.minimumOrder,
          maximum_order: item.product.maximumOrder,
          seller: {
            user_id: item.product.seller.id,
            name: item.product.seller.name,
            location: { city: null },
          },
          availability: {
            status:
              item.product.isAvailable && item.product.stockQuantity > 0
                ? "in_stock"
                : "out_of_stock",
          },
        },
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_price: item.discountPrice,
        subtotal: item.subtotal,
        notes: item.notes,
        is_selected: item.isSelected,
        is_available: item.isAvailable && item.product.isAvailable,
        added_at: item.addedAt,
        updated_at: item.updatedAt,
      };
    });

    // Group items by seller
    const groupedBySeller: Record<
      string,
      {
        seller: { user_id: string; name: string };
        items: typeof formattedItems;
        subtotal: number;
        delivery_fee: number;
        free_delivery_threshold: number;
      }
    > = {};

    formattedItems.forEach((item) => {
      const sellerId = item.product.seller.user_id;
      if (!groupedBySeller[sellerId]) {
        groupedBySeller[sellerId] = {
          seller: item.product.seller,
          items: [],
          subtotal: 0,
          delivery_fee: BUSINESS.DELIVERY_FEE,
          free_delivery_threshold: BUSINESS.FREE_DELIVERY_THRESHOLD,
        };
      }
      groupedBySeller[sellerId].items.push(item);
      if (item.is_selected) {
        groupedBySeller[sellerId].subtotal += item.subtotal;
      }
    });

    const groupedArray = Object.values(groupedBySeller).map((group) => ({
      ...group,
      is_eligible_free_delivery:
        group.subtotal >= group.free_delivery_threshold,
      amount_for_free_delivery: Math.max(
        0,
        group.free_delivery_threshold - group.subtotal,
      ),
      total:
        group.subtotal +
        (group.subtotal >= group.free_delivery_threshold
          ? 0
          : group.delivery_fee),
    }));

    // Calculate summary
    const selectedItems = formattedItems.filter((item) => item.is_selected);
    const subtotal = selectedItems.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );
    const totalDiscount = selectedItems.reduce(
      (sum, item) =>
        sum +
        (item.unit_price - (item.discount_price || item.unit_price)) *
          item.quantity,
      0,
    );
    const totalDeliveryFee = groupedArray.reduce(
      (sum, group) =>
        sum + (group.is_eligible_free_delivery ? 0 : group.delivery_fee),
      0,
    );
    const serviceFee = BUSINESS.SERVICE_FEE;
    const grandTotal = subtotal + totalDeliveryFee + serviceFee;

    return successResponse({
      cart_id: cart.id,
      items: formattedItems,
      item_count: formattedItems.length,
      selected_count: selectedItems.length,
      subtotal,
      discount_total: totalDiscount,
      total: grandTotal,
      currency: BUSINESS.CURRENCY,
      grouped_by_seller: groupedArray,
      summary: {
        total_items: formattedItems.length,
        total_quantity: formattedItems.reduce(
          (sum, item) => sum + item.quantity,
          0,
        ),
        subtotal,
        total_discount: totalDiscount,
        total_delivery_fee: totalDeliveryFee,
        service_fee: serviceFee,
        grand_total: grandTotal,
      },
      unavailable_items: formattedItems.filter((item) => !item.is_available),
      recommendations: [],
      updated_at: cart.updatedAt,
    });
  } catch (error) {
    return handleRouteError(error, "Fetch cart");
  }
}

/**
 * @swagger
 * /api/v1/cart:
 *   delete:
 *     summary: Clear entire cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 *       401:
 *         description: Unauthorized
 */
export async function DELETE(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);

    await prisma.cartItem.deleteMany({
      where: { cart: { userId: payload.userId } },
    });

    return successResponse(undefined, {
      message: "Cart cleared successfully",
    });
  } catch (error) {
    return handleRouteError(error, "Clear cart");
  }
}
