import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import {
  GetPostsUseCase,
  CreatePostUseCase,
  communityRepository,
  GetPostsQuerySchema,
  CreatePostSchema,
} from "@/features/community";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const queryData = {
      filter: searchParams.get("filter") || undefined,
      tag: searchParams.get("tag") || undefined,
      farmer_id: searchParams.get("farmer_id") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    };

    const input = GetPostsQuerySchema.parse(queryData);

    let currentUserId: string | undefined;
    try {
      const user = await verifyAuth(request);
      currentUserId = user.userId;
    } catch {
      // Allow unauthenticated access
    }

    const useCase = new GetPostsUseCase(communityRepository);
    const result = await useCase.execute({
      filter: input.filter,
      tag: input.tag,
      farmerId: input.farmer_id,
      page: input.page,
      limit: input.limit,
      currentUserId,
    });

    return successResponse(result);
  } catch (error) {
    return handleRouteError(error, "Get community posts");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    const body = await request.json();
    
    const input = CreatePostSchema.parse(body);

    const useCase = new CreatePostUseCase(communityRepository);
    const post = await useCase.execute({
      title: input.title,
      content: input.content,
      images: input.images,
      tags: input.tags,
      userId: user.userId,
    });

    return successResponse(post, {
      message: "Post created successfully",
      status: 201,
    });
  } catch (error) {
    return handleRouteError(error, "Create community post");
  }
}
