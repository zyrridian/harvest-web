import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import {
  GetPostByIdUseCase,
  UpdatePostUseCase,
  DeletePostUseCase,
  communityRepository,
  UpdatePostSchema,
} from "@/features/community";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    let currentUserId: string | undefined;
    try {
      const user = await verifyAuth(request);
      currentUserId = user.userId;
    } catch {
      // Allow unauthenticated access
    }

    const useCase = new GetPostByIdUseCase(communityRepository);
    const post = await useCase.execute(id, currentUserId);

    return successResponse(post);
  } catch (error) {
    return handleRouteError(error, "Get community post");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await verifyAuth(request);
    const body = await request.json();

    const input = UpdatePostSchema.parse(body);

    const useCase = new UpdatePostUseCase(communityRepository);
    const updated = await useCase.execute({
      id,
      userId: user.userId,
      title: input.title,
      content: input.content,
    });

    return successResponse(updated, { message: "Post updated successfully" });
  } catch (error) {
    return handleRouteError(error, "Update community post");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await verifyAuth(request);

    const useCase = new DeletePostUseCase(communityRepository);
    await useCase.execute(id, user.userId);

    return successResponse(undefined, { message: "Post deleted successfully" });
  } catch (error) {
    return handleRouteError(error, "Delete community post");
  }
}
