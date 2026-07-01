import { ICartRepository } from "../../domain/repositories/cart.repository";
import { AddCartItemInputDTO, CartSummaryResponseDTO } from "../dtos/cart.dto";
import { AppError } from "@/core/errors";

export class AddCartItemUseCase {
  constructor(private readonly cartRepo: ICartRepository) { }

  async execute(userId: string, input: AddCartItemInputDTO): Promise<CartSummaryResponseDTO> {
    // 1. Validate product exists
    const product = await this.cartRepo.findProductById(input.product_id);
    if (!product) {
      throw AppError.notFound("Product not found");
    }

    // 2. Ensure user has a cart
    let cart = await this.cartRepo.findCartByUserId(userId);
    if (!cart) {
      cart = await this.cartRepo.createCart(userId);
    }

    // 3. Add or update cart item
    await this.cartRepo.addOrUpdateCartItem(cart.id, product.id, input.quantity, product.price);

    // 4. Get updated cart summary
    const summary = await this.cartRepo.getCartSummary(cart.id);

    return {
      cart_item_count: summary.itemCount,
      cart_total: summary.total,
    };
  }
}
