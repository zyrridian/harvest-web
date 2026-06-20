import { ICommunityRepository } from "../../domain/repositories/community.repository";
import { AppError } from "@/core/errors";

export class DeleteAdminCommentUseCase {
  constructor(private readonly communityRepo: ICommunityRepository) {}

  async execute(id: string): Promise<void> {
    const comment = await this.communityRepo.findCommentById(id);

    if (!comment) {
      throw AppError.notFound("Comment not found");
    }

    await this.communityRepo.deleteComment(id);
  }
}
