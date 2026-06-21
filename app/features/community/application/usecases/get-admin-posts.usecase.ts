import { ICommunityRepository } from "../../domain/repositories/community.repository";
import { GetAdminPostsInputDTO, PaginatedAdminPostsDTO } from "../dtos/community.dto";

export class GetAdminPostsUseCase {
  constructor(private readonly communityRepo: ICommunityRepository) {}

  async execute(input: GetAdminPostsInputDTO): Promise<PaginatedAdminPostsDTO> {
    const { search, page, limit } = input;
    
    const [posts, total] = await Promise.all([
      this.communityRepo.findPosts({ search, page, limit }),
      this.communityRepo.countPosts({ search, page, limit }),
    ]);

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }
}
