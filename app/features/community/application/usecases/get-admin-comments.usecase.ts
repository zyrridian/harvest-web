import { ICommunityRepository } from "../../domain/repositories/community.repository";
import { GetAdminCommentsInputDTO, PaginatedAdminCommentsDTO } from "../dtos/community.dto";

export class GetAdminCommentsUseCase {
  constructor(private readonly communityRepo: ICommunityRepository) {}

  async execute(input: GetAdminCommentsInputDTO): Promise<PaginatedAdminCommentsDTO> {
    const { search, page, limit } = input;
    
    const [comments, total] = await Promise.all([
      this.communityRepo.findComments({ search, page, limit }),
      this.communityRepo.countComments({ search, page, limit }),
    ]);

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }
}
