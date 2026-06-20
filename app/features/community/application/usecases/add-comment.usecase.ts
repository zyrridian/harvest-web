import { ICommunityRepository } from "../../domain/repositories/community.repository";
import { AddCommentInputDTO } from "../dtos/community.dto";
import { AppError } from "@/core/errors";
import { PostCommentEntity } from "../../domain/entities/community.entity";

export class AddCommentUseCase {
  constructor(private readonly communityRepo: ICommunityRepository) {}

  async execute(input: AddCommentInputDTO): Promise<PostCommentEntity> {
    if (!input.content) {
      throw AppError.badRequest("Content is required");
    }

    const post = await this.communityRepo.findPostById(input.postId);
    if (!post) {
      throw AppError.notFound("Post not found");
    }

    let actualParentId = input.parentId || null;
    let actualReplyToUserId = input.replyToUserId || null;

    if (actualParentId) {
      const parentComment = await this.communityRepo.findCommentById(actualParentId);
      if (!parentComment || parentComment.postId !== input.postId) {
        throw AppError.badRequest("Invalid parent comment");
      }

      if (parentComment.parentId) {
        actualParentId = parentComment.parentId;
        if (!actualReplyToUserId) {
          actualReplyToUserId = parentComment.userId;
        }
      } else {
        if (!actualReplyToUserId) {
          actualReplyToUserId = parentComment.userId;
        }
      }
    }

    const comment = await this.communityRepo.addComment({
      postId: input.postId,
      userId: input.userId,
      parentId: actualParentId,
      replyToUserId: actualReplyToUserId,
      content: input.content,
    });

    return comment;
  }
}
