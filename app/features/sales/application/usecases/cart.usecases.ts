import { ICartRepository } from "../../domain/repositories/cart.repository";
import { BUSINESS } from "@/core/config/constants";
import { AppError } from "@/core/errors";

export class GetCartUseCase {
  constructor(private readonly cartRepo: ICartRepository) { }

  async execute(userId: string): Promise<any> {
    let cart = await this.cartRepo.findCartByUserId(userId);

    if (!cart) {
      cart = await this.cartRepo.createCart(userId);
    }

    // Format cart items
    const formattedItems = cart.items.map((item: any) => {
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

    return {
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
    };
  }
}

export class ClearCartUseCase {
  constructor(private readonly cartRepo: ICartRepository) { }

  async execute(userId: string): Promise<void> {
    await this.cartRepo.clearCart(userId);
  }
}

export class UpdateCartItemUseCase {
  constructor(private readonly cartRepo: ICartRepository) { }

  async execute(userId: string, cartItemId: string, input: { quantity?: number; notes?: string }): Promise<any> {
    const { quantity, notes } = input;

    if (quantity !== undefined && (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1)) {
      throw AppError.badRequest("Quantity must be a positive integer");
    }

    const cartItem = await this.cartRepo.findCartItemById(cartItemId);

    if (!cartItem) {
      throw AppError.notFound("Cart item not found");
    }

    if (cartItem.cart.userId !== userId) {
      throw AppError.forbidden("Not authorized");
    }

    if (quantity !== undefined) {
      // Validate against product constraints
      if (quantity < cartItem.product.minimumOrder) {
        throw AppError.badRequest(`Minimum order for this product is ${cartItem.product.minimumOrder}`);
      }
      if (quantity > cartItem.product.maximumOrder) {
        throw AppError.badRequest(`Maximum order for this product is ${cartItem.product.maximumOrder}`);
      }
      if (quantity > cartItem.product.stockQuantity) {
        throw AppError.badRequest(`Only ${cartItem.product.stockQuantity} items left in stock`);
      }
    }

    let newSubtotal = cartItem.subtotal;
    if (quantity !== undefined) {
      const activeDiscount = cartItem.product.discounts[0];
      const price = activeDiscount
        ? activeDiscount.type === "percentage"
          ? cartItem.product.price * (1 - activeDiscount.value / 100)
          : cartItem.product.price - activeDiscount.value
        : cartItem.product.price;
      newSubtotal = price * quantity;
    }

    const updated = await this.cartRepo.updateCartItem(cartItemId, {
      ...(quantity !== undefined && { quantity, subtotal: newSubtotal }),
      ...(notes !== undefined && { notes }),
    });

    await this.cartRepo.updateCartUpdatedAt(cartItem.cartId);

    const allItems = await this.cartRepo.getCartItems(cartItem.cartId);
    const cartTotalItems = allItems.length;
    const cartGrandTotal = allItems.reduce((sum, item) => sum + item.subtotal, 0);

    return {
      cart_item_id: updated.id,
      quantity: updated.quantity,
      subtotal: updated.subtotal,
      cart_total_items: cartTotalItems,
      cart_grand_total: cartGrandTotal,
    };
  }
}

export class RemoveCartItemUseCase {
  constructor(private readonly cartRepo: ICartRepository) { }

  async execute(userId: string, cartItemId: string): Promise<any> {
    const cartItem = await this.cartRepo.findCartItemById(cartItemId);

    if (!cartItem) {
      throw AppError.notFound("Cart item not found");
    }

    if (cartItem.cart.userId !== userId) {
      throw AppError.forbidden("Not authorized");
    }

    await this.cartRepo.removeCartItem(cartItemId);

    const remainingItems = await this.cartRepo.getCartItems(cartItem.cartId);
    const cartTotalItems = remainingItems.length;
    const cartGrandTotal = remainingItems.reduce((sum, item) => sum + item.subtotal, 0);

    return { cart_total_items: cartTotalItems, cart_grand_total: cartGrandTotal };
  }
}

export class ToggleCartItemSelectionUseCase {
  constructor(private readonly cartRepo: ICartRepository) { }

  async execute(userId: string, cartItemId: string, is_selected: boolean): Promise<any> {
    if (is_selected === undefined) {
      throw AppError.badRequest("is_selected is required");
    }

    const cartItem = await this.cartRepo.findCartItemById(cartItemId);

    if (!cartItem) {
      throw AppError.notFound("Cart item not found");
    }

    if (cartItem.cart.userId !== userId) {
      throw AppError.forbidden("Not authorized");
    }

    const updated = await this.cartRepo.updateCartItem(cartItemId, { isSelected: is_selected });

    const allItems = await this.cartRepo.getCartItems(cartItem.cartId);
    const selectedItems = allItems.filter(item => item.isSelected);
    const selectedItemsTotal = selectedItems.reduce((sum, item) => sum + item.subtotal, 0);

    return {
      cart_item_id: updated.id,
      is_selected: updated.isSelected,
      selected_items_total: selectedItemsTotal,
    };
  }
}
