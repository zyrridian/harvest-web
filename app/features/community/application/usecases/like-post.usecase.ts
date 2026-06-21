import { ICommunityRepository } from "../../domain/repositories/community.repository";
import { AppError } from "@/core/errors";

export class LikePostUseCase {
  constructor(private readonly communityRepo: ICommunityRepository) {}

  async execute(postId: string, userId: string): Promise<void> {
    const post = await this.communityRepo.findPostById(postId);
    if (!post) {
      throw AppError.notFound("Post not found");
    }

    const hasLiked = await this.communityRepo.checkPostLike(postId, userId);
    if (hasLiked) {
      throw AppError.badRequest("You have already liked this post");
    }

    await this.communityRepo.likePost(postId, userId);
  }
}

export class UnlikePostUseCase {
  constructor(private readonly communityRepo: ICommunityRepository) {}

  async execute(postId: string, userId: string): Promise<void> {
    const post = await this.communityRepo.findPostById(postId);
    if (!post) {
      throw AppError.notFound("Post not found");
    }

    const hasLiked = await this.communityRepo.checkPostLike(postId, userId);
    if (!hasLiked) {
      throw AppError.badRequest("You have not liked this post");
    }

    await this.communityRepo.unlikePost(postId, userId);
  }
}
