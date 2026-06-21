export interface CommunityPostEntity {
  id: string;
  userId: string;
  farmerId: string | null;
  title: string;
  content: string;
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations commonly loaded
  user?: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string | null;
    userType?: string;
  };
  farmer?: {
    id: string;
    name: string;
    profileImage?: string | null;
    isVerified?: boolean;
  } | null;
  images?: any[];
  tags?: any[];
  _count?: {
    likes: number;
    comments: number;
  };
  is_liked_by_user?: boolean;
}

export interface PostCommentEntity {
  id: string;
  postId: string;
  userId: string;
  parentId: string | null;
  replyToUserId: string | null;
  content: string;
  likesCount: number;
  createdAt: Date;

  // Relations commonly loaded
  user?: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string | null;
  };
  post?: {
    id: string;
    title: string;
  };
  replyToUser?: {
    id: string;
    name: string;
  } | null;
  replies?: PostCommentEntity[];
  _count?: {
    likes: number;
  };
  is_liked_by_user?: boolean;
}
