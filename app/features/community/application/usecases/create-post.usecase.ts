import { ICommunityRepository } from "../../domain/repositories/community.repository";
import { CreatePostInputDTO } from "../dtos/community.dto";
import { AppError } from "@/core/errors";
import { CommunityPostEntity } from "../../domain/entities/community.entity";

export class CreatePostUseCase {
  constructor(private readonly communityRepo: ICommunityRepository) {}

  async execute(input: CreatePostInputDTO): Promise<CommunityPostEntity> {
    if (!input.title || !input.content) {
      throw AppError.badRequest("Title and content are required");
    }

    const farmerId = await this.communityRepo.getFarmerIdByUserId(input.userId);

    const post = await this.communityRepo.createPost({
      userId: input.userId,
      farmerId,
      title: input.title,
      content: input.content,
      images: input.images,
      tags: input.tags,
    });

    return post;
  }
}
