import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import {
  LikeCommentUseCase,
  UnlikeCommentUseCase,
  communityRepository,
} from "@/features/community";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await verifyAuth(request);

    const useCase = new LikeCommentUseCase(communityRepository);
    await useCase.execute(id, user.userId);

    return successResponse(undefined, {
      message: "Comment liked successfully",
    });
  } catch (error) {
    return handleRouteError(error, "Like comment");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await verifyAuth(request);

    const useCase = new UnlikeCommentUseCase(communityRepository);
    await useCase.execute(id, user.userId);

    return successResponse(undefined, {
      message: "Comment unliked successfully",
    });
  } catch (error) {
    return handleRouteError(error, "Unlike comment");
  }
}
