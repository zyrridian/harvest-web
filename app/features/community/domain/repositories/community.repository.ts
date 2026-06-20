import { CommunityPostEntity, PostCommentEntity } from "../entities/community.entity";

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface FindPostsParams extends PaginationParams {
  search?: string;
  filter?: string;
  tag?: string;
  farmerId?: string;
  userId?: string;
}

export interface FindCommentsParams extends PaginationParams {
  search?: string;
  postId?: string;
  parentId?: string | null;
}

export interface ICommunityRepository {
  // --- Admin/Generic Posts ---
  findPosts(params: FindPostsParams): Promise<CommunityPostEntity[]>;
  countPosts(params: FindPostsParams): Promise<number>;
  findPostById(id: string): Promise<CommunityPostEntity | null>;
  deletePost(id: string): Promise<void>;

  // --- Core Posts ---
  createPost(data: {
    userId: string;
    farmerId: string | null;
    title: string;
    content: string;
    images?: string[];
    tags?: string[];
  }): Promise<CommunityPostEntity>;
  updatePost(id: string, data: { title?: string; content?: string }): Promise<CommunityPostEntity>;
  findUserPostLikes(userId: string, postIds: string[]): Promise<string[]>; // Returns liked post IDs
  likePost(postId: string, userId: string): Promise<void>;
  unlikePost(postId: string, userId: string): Promise<void>;
  checkPostLike(postId: string, userId: string): Promise<boolean>;
  getFarmerIdByUserId(userId: string): Promise<string | null>;

  // --- Admin/Generic Comments ---
  findComments(params: FindCommentsParams): Promise<PostCommentEntity[]>;
  countComments(params: FindCommentsParams): Promise<number>;
  findCommentById(id: string): Promise<PostCommentEntity | null>;
  deleteComment(id: string): Promise<void>;

  // --- Core Comments ---
  addComment(data: {
    postId: string;
    userId: string;
    parentId?: string | null;
    replyToUserId?: string | null;
    content: string;
  }): Promise<PostCommentEntity>;
  findUserCommentLikes(userId: string, commentIds: string[]): Promise<string[]>;
  likeComment(commentId: string, userId: string): Promise<void>;
  unlikeComment(commentId: string, userId: string): Promise<void>;
  checkCommentLike(commentId: string, userId: string): Promise<boolean>;
}
