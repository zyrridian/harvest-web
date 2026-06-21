import { ICommunityRepository } from "../../domain/repositories/community.repository";
import { UpdatePostInputDTO } from "../dtos/community.dto";
import { AppError } from "@/core/errors";
import { CommunityPostEntity } from "../../domain/entities/community.entity";

export class UpdatePostUseCase {
  constructor(private readonly communityRepo: ICommunityRepository) {}

  async execute(input: UpdatePostInputDTO): Promise<CommunityPostEntity> {
    const post = await this.communityRepo.findPostById(input.id);

    if (!post) {
      throw AppError.notFound("Post not found");
    }

    if (post.userId !== input.userId) {
      throw AppError.forbidden("Not authorized to update this post");
    }

    const updateData: { title?: string; content?: string } = {};
    if (input.title) updateData.title = input.title;
    if (input.content) updateData.content = input.content;

    const updated = await this.communityRepo.updatePost(input.id, updateData);
    return updated;
  }
}
