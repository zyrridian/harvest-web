import { ICommunityRepository } from "../../domain/repositories/community.repository";
import { AppError } from "@/core/errors";

export class DeletePostUseCase {
  constructor(private readonly communityRepo: ICommunityRepository) {}

  async execute(id: string, userId: string): Promise<void> {
    const post = await this.communityRepo.findPostById(id);

    if (!post) {
      throw AppError.notFound("Post not found");
    }

    if (post.userId !== userId) {
      throw AppError.forbidden("Not authorized to delete this post");
    }

    await this.communityRepo.deletePost(id);
  }
}
