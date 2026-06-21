import { ICommunityRepository } from "../../domain/repositories/community.repository";
import { GetPostCommentsInputDTO, PaginatedCommentsDTO } from "../dtos/community.dto";
import { AppError } from "@/core/errors";

export class GetPostCommentsUseCase {
  constructor(private readonly communityRepo: ICommunityRepository) {}

  async execute(input: GetPostCommentsInputDTO): Promise<PaginatedCommentsDTO> {
    const { postId, page, limit, currentUserId } = input;
    
    const post = await this.communityRepo.findPostById(postId);
    if (!post) {
      throw AppError.notFound("Post not found");
    }

    const [comments, total] = await Promise.all([
      this.communityRepo.findComments({ postId, parentId: null, page, limit }),
      this.communityRepo.countComments({ postId, parentId: null, page, limit }),
    ]);

    const allCommentIds: string[] = [];
    for (const c of comments) {
      allCommentIds.push(c.id);
      if (c.replies) {
        for (const r of c.replies) {
          allCommentIds.push(r.id);
        }
      }
    }

    let likedCommentIds = new Set<string>();
    if (currentUserId && allCommentIds.length > 0) {
      const userLikes = await this.communityRepo.findUserCommentLikes(currentUserId, allCommentIds);
      likedCommentIds = new Set(userLikes);
    }

    const commentsWithStatus = comments.map((c) => ({
      ...c,
      is_liked_by_user: likedCommentIds.has(c.id),
      replies: c.replies?.map((r) => ({
        ...r,
        is_liked_by_user: likedCommentIds.has(r.id),
      })) || [],
    }));

    return {
      comments: commentsWithStatus,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }
}
