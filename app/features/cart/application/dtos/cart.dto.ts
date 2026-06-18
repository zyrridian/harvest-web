import { z } from "zod";

export const AddCartItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().min(1),
});

export type AddCartItemInputDTO = z.infer<typeof AddCartItemSchema>;

export interface CartSummaryResponseDTO {
  cart_item_count: number;
  cart_total: number;
}
