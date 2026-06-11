import { z } from "zod";

export const AddToCartSchema = z.object({
  product_id: z.string().uuid("Invalid product ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  notes: z.string().optional(),
});

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1").optional(),
  notes: z.string().optional(),
});

export type AddToCartInput = z.infer<typeof AddToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof UpdateCartItemSchema>;
