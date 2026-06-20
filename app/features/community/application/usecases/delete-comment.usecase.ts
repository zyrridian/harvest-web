import { ICommunityRepository } from "../../domain/repositories/community.repository";
import { AppError } from "@/core/errors";

export class DeleteCommentUseCase {
  constructor(private readonly communityRepo: ICommunityRepository) {}

  async execute(id: string, userId: string): Promise<void> {
    const comment = await this.communityRepo.findCommentById(id);

    if (!comment) {
      throw AppError.notFound("Comment not found");
    }

    if (comment.userId !== userId) {
      throw AppError.forbidden("Not authorized to delete this comment");
    }

    await this.communityRepo.deleteComment(id);
  }
}
