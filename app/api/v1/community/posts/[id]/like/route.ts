import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import {
  LikePostUseCase,
  UnlikePostUseCase,
  communityRepository,
} from "@/features/community";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await verifyAuth(request);

    const useCase = new LikePostUseCase(communityRepository);
    await useCase.execute(id, user.userId);

    return successResponse(undefined, { message: "Post liked successfully" });
  } catch (error) {
    return handleRouteError(error, "Like post");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await verifyAuth(request);

    const useCase = new UnlikePostUseCase(communityRepository);
    await useCase.execute(id, user.userId);

    return successResponse(undefined, { message: "Post unliked successfully" });
  } catch (error) {
    return handleRouteError(error, "Unlike post");
  }
}
