import { z } from "zod";

export const CreateProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  long_description: z.string().optional(),
  category_id: z.string().uuid().optional(),
  subcategory_id: z.string().uuid().optional(),
  price: z.number().positive("Price must be positive"),
  unit: z.string().min(1, "Unit is required"),
  unit_weight: z.number().positive().default(1.0),
  stock_quantity: z.number().int().min(0).default(0),
  minimum_order: z.number().int().min(1).default(1),
  maximum_order: z.number().int().min(1).default(999),
  is_organic: z.boolean().default(false),
  is_available: z.boolean().default(true),
  harvest_date: z.string().optional(),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
