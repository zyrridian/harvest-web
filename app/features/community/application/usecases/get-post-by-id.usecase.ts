import { ICommunityRepository } from "../../domain/repositories/community.repository";
import { AppError } from "@/core/errors";
import { CommunityPostEntity } from "../../domain/entities/community.entity";

export class GetPostByIdUseCase {
  constructor(private readonly communityRepo: ICommunityRepository) {}

  async execute(id: string, currentUserId?: string): Promise<CommunityPostEntity> {
    const post = await this.communityRepo.findPostById(id);

    if (!post) {
      throw AppError.notFound("Post not found");
    }

    let is_liked_by_user = false;
    if (currentUserId) {
      is_liked_by_user = await this.communityRepo.checkPostLike(id, currentUserId);
    }

    return { ...post, is_liked_by_user };
  }
}
