import { ICommunityRepository } from "../../domain/repositories/community.repository";
import { AppError } from "@/core/errors";

export class LikeCommentUseCase {
  constructor(private readonly communityRepo: ICommunityRepository) {}

  async execute(commentId: string, userId: string): Promise<void> {
    const comment = await this.communityRepo.findCommentById(commentId);
    if (!comment) {
      throw AppError.notFound("Comment not found");
    }

    const hasLiked = await this.communityRepo.checkCommentLike(commentId, userId);
    if (hasLiked) {
      throw AppError.badRequest("You have already liked this comment");
    }

    await this.communityRepo.likeComment(commentId, userId);
  }
}

export class UnlikeCommentUseCase {
  constructor(private readonly communityRepo: ICommunityRepository) {}

  async execute(commentId: string, userId: string): Promise<void> {
    const comment = await this.communityRepo.findCommentById(commentId);
    if (!comment) {
      throw AppError.notFound("Comment not found");
    }

    const hasLiked = await this.communityRepo.checkCommentLike(commentId, userId);
    if (!hasLiked) {
      throw AppError.badRequest("You have not liked this comment");
    }

    await this.communityRepo.unlikeComment(commentId, userId);
  }
}
