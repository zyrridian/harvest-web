import { Cart, CartItem, Product } from "@/generated/prisma/client";

export interface CartWithItems extends Cart {
  items: (CartItem & { product: Product })[];
}

export interface ICartRepository {
  findCartByUserId(userId: string): Promise<CartWithItems | null>;
  createCart(userId: string): Promise<CartWithItems>;
  addOrUpdateCartItem(cartId: string, productId: string, quantity: number, unitPrice: number): Promise<void>;
  getCartSummary(cartId: string): Promise<{ itemCount: number; total: number }>;
  findProductById(productId: string): Promise<Product | null>;
}
