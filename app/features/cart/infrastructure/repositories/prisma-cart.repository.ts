import { ICartRepository, CartWithItems } from "../../domain/repositories/cart.repository";
import prisma from "@/core/database/prisma";
import { Product } from "@/generated/prisma/client";

export class PrismaCartRepository implements ICartRepository {
  private cartInclude = {
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

  async findCartByUserId(userId: string): Promise<CartWithItems | null> {
    return prisma.cart.findUnique({
      where: { userId },
      include: this.cartInclude,
    }) as any;
  }

  async createCart(userId: string): Promise<CartWithItems> {
    return prisma.cart.create({
      data: { userId },
      include: this.cartInclude,
    }) as any;
  }

  async addOrUpdateCartItem(cartId: string, productId: string, quantity: number, unitPrice: number): Promise<void> {
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId,
          productId,
        },
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          subtotal: newQuantity * existingItem.unitPrice,
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId,
          productId,
          quantity,
          unitPrice,
          subtotal: quantity * unitPrice,
        },
      });
    }
  }

  async getCartSummary(cartId: string): Promise<{ itemCount: number; total: number }> {
    const items = await prisma.cartItem.findMany({
      where: { cartId },
    });

    // The mobile app expects cart_item_count to be the number of unique items (items.length)
    // or total quantity. The prompt says "total number of unique items in the cart" so we use length.
    const itemCount = items.length;
    const total = items.reduce((acc, item) => acc + item.subtotal, 0);

    return { itemCount, total };
  }

  async findProductById(productId: string): Promise<Product | null> {
    return prisma.product.findUnique({ where: { id: productId } });
  }

  async clearCart(userId: string): Promise<void> {
    await prisma.cartItem.deleteMany({
      where: { cart: { userId } },
    });
  }

  async findCartItemById(cartItemId: string): Promise<any> {
    return prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        cart: true,
        product: {
          select: {
            id: true,
            price: true,
            stockQuantity: true,
            minimumOrder: true,
            maximumOrder: true,
            discounts: {
              where: {
                isActive: true,
                validFrom: { lte: new Date() },
                validUntil: { gte: new Date() },
              },
              take: 1,
              orderBy: { value: "desc" },
            },
          },
        },
      },
    });
  }

  async updateCartItem(cartItemId: string, data: any): Promise<any> {
    return prisma.cartItem.update({
      where: { id: cartItemId },
      data,
    });
  }

  async removeCartItem(cartItemId: string): Promise<void> {
    await prisma.cartItem.delete({ where: { id: cartItemId } });
  }

  async updateCartUpdatedAt(cartId: string): Promise<void> {
    await prisma.cart.update({
      where: { id: cartId },
      data: { updatedAt: new Date() },
    });
  }

  async getCartItems(cartId: string): Promise<any[]> {
    return prisma.cartItem.findMany({
      where: { cartId },
    });
  }
}

export const cartRepository = new PrismaCartRepository();
