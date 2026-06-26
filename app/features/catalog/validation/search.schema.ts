import { z } from "zod";

export const SearchFarmersSchema = z.object({
  q: z.string().min(1, "Search query is required"),
  specialties: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(",").filter(Boolean) : [])),
  min_rating: z.coerce.number().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const SearchSuggestionsSchema = z.object({
  q: z.string().min(1, "Search query is required"),
  type: z
    .enum(["products", "farmers", "categories"])
    .optional()
    .nullable(),
  limit: z.coerce.number().min(1).max(50).default(10),
});

export type SearchFarmersInput = z.infer<typeof SearchFarmersSchema>;
export type SearchSuggestionsInput = z.infer<typeof SearchSuggestionsSchema>;
