import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import {
  DeleteCommentUseCase,
  communityRepository,
} from "@/features/community";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await verifyAuth(request);

    const useCase = new DeleteCommentUseCase(communityRepository);
    await useCase.execute(id, user.userId);

    return successResponse(undefined, {
      message: "Comment deleted successfully",
    });
  } catch (error) {
    return handleRouteError(error, "Delete comment");
  }
}
