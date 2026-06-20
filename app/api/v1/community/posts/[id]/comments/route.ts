import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import {
  GetPostCommentsUseCase,
  AddCommentUseCase,
  communityRepository,
  AddCommentSchema,
  AdminCommunityPaginationSchema as PaginationSchema, // Reusing generic pagination
} from "@/features/community";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const queryData = {
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    };
    const input = PaginationSchema.parse(queryData);

    let currentUserId: string | undefined;
    try {
      const user = await verifyAuth(request);
      currentUserId = user.userId;
    } catch {
      // Allow unauthenticated access
    }

    const useCase = new GetPostCommentsUseCase(communityRepository);
    const result = await useCase.execute({
      postId: id,
      page: input.page,
      limit: input.limit,
      currentUserId,
    });

    return successResponse(result);
  } catch (error) {
    return handleRouteError(error, "Get comments");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await verifyAuth(request);
    const body = await request.json();

    const input = AddCommentSchema.parse(body);

    const useCase = new AddCommentUseCase(communityRepository);
    const comment = await useCase.execute({
      postId: id,
      userId: user.userId,
      content: input.content,
      parentId: input.parent_id,
      replyToUserId: input.reply_to_user_id,
    });

    return successResponse(comment, {
      message: "Comment added successfully",
      status: 201,
    });
  } catch (error) {
    return handleRouteError(error, "Add comment");
  }
}
