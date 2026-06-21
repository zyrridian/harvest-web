import { ICommunityRepository } from "../../domain/repositories/community.repository";
import { AppError } from "@/core/errors";

export class DeleteAdminPostUseCase {
  constructor(private readonly communityRepo: ICommunityRepository) {}

  async execute(id: string): Promise<void> {
    const post = await this.communityRepo.findPostById(id);

    if (!post) {
      throw AppError.notFound("Post not found");
    }

    await this.communityRepo.deletePost(id);
  }
}
