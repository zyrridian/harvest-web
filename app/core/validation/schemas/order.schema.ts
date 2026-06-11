import { z } from "zod";

export const CreateOrderSchema = z.object({
  cart_item_ids: z.array(z.string().uuid()).min(1, "At least one cart item is required"),
  delivery_address_id: z.string().uuid().optional(),
  delivery_method: z.string().default("home_delivery"),
  delivery_date: z.string().optional(),
  delivery_time_slot: z.string().default("morning"),
  payment_method: z.string().default("bank_transfer"),
  notes: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
