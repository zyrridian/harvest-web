import { ICommunityRepository } from "../../domain/repositories/community.repository";
import { GetPostsInputDTO, PaginatedPostsDTO } from "../dtos/community.dto";

export class GetPostsUseCase {
  constructor(private readonly communityRepo: ICommunityRepository) {}

  async execute(input: GetPostsInputDTO): Promise<PaginatedPostsDTO> {
    const { filter, tag, farmerId, page, limit, currentUserId } = input;
    
    const [posts, total] = await Promise.all([
      this.communityRepo.findPosts({ filter, tag, farmerId, page, limit, userId: currentUserId }),
      this.communityRepo.countPosts({ filter, tag, farmerId, page, limit, userId: currentUserId }),
    ]);

    let postsWithLikeStatus = posts.map((p) => ({ ...p, is_liked_by_user: false }));

    if (currentUserId && posts.length > 0) {
      const likedPostIds = await this.communityRepo.findUserPostLikes(
        currentUserId, 
        posts.map(p => p.id)
      );
      const likedSet = new Set(likedPostIds);
      
      postsWithLikeStatus = posts.map(post => ({
        ...post,
        is_liked_by_user: likedSet.has(post.id),
      }));
    }

    return {
      posts: postsWithLikeStatus,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }
}
