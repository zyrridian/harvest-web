import { z } from "zod";

export const AdminCommunityPaginationSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminCommunityPaginationQuery = z.infer<typeof AdminCommunityPaginationSchema>;

// --- Core Schemas ---

export const GetPostsQuerySchema = z.object({
  filter: z.enum(["all", "following", "my_posts", "farmers"]).default("all"),
  tag: z.string().optional(),
  farmer_id: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const CreatePostSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  images: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
});

export const UpdatePostSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
});

export const AddCommentSchema = z.object({
  content: z.string().min(1, "Content is required"),
  parent_id: z.string().optional(),
  reply_to_user_id: z.string().optional(),
});
