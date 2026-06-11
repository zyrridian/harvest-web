import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import {
  parsePagination,
  buildPaginationMeta,
} from "@/core/helpers/pagination";

/**
 * @swagger
 * /api/v1/community/posts:
 *   get:
 *     summary: Get community posts
 *     tags: [Community]
 *     parameters:
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [all, following, my_posts, farmers]
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of community posts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";
    const tag = searchParams.get("tag");
    const farmerId = searchParams.get("farmer_id");
    const { page, limit, skip } = parsePagination(searchParams);

    let userId: string | undefined;
    try {
      const user = await verifyAuth(request);
      userId = user.userId;
    } catch {
      // Allow unauthenticated access for browsing posts
    }

    const where: Record<string, unknown> = {};
    if (filter === "my_posts" && userId) where.userId = userId;
    if (filter === "farmers") where.farmerId = { not: null };
    if (farmerId) where.farmerId = farmerId;
    if (tag) where.tags = { some: { tag } };

    const [posts, total] = await Promise.all([
      prisma.communityPost.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true, userType: true },
          },
          farmer: {
            select: {
              id: true,
              name: true,
              profileImage: true,
              isVerified: true,
            },
          },
          images: { orderBy: { displayOrder: "asc" } },
          tags: true,
          _count: { select: { likes: true, comments: true } },
        },
      }),
      prisma.communityPost.count({ where }),
    ]);

    let postsWithLikeStatus = posts.map((p) => ({
      ...p,
      is_liked_by_user: false,
    }));
    if (userId) {
      const userLikes = await prisma.postLike.findMany({
        where: { userId, postId: { in: posts.map((p) => p.id) } },
        select: { postId: true },
      });
      const likedPostIds = new Set(userLikes.map((l) => l.postId));
      postsWithLikeStatus = posts.map((post) => ({
        ...post,
        is_liked_by_user: likedPostIds.has(post.id),
      }));
    }

    return successResponse({
      posts: postsWithLikeStatus,
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (error) {
    return handleRouteError(error, "Get community posts");
  }
}

/**
 * @swagger
 * /api/v1/community/posts:
 *   post:
 *     summary: Create a new community post
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Post created successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    const body = await request.json();
    const { title, content, images, tags } = body;

    if (!title || !content) {
      throw AppError.badRequest("Title and content are required");
    }

    let farmerId: string | null = null;
    const farmer = await prisma.farmer.findUnique({
      where: { userId: user.userId },
      select: { id: true },
    });
    if (farmer) farmerId = farmer.id;

    const post = await prisma.communityPost.create({
      data: {
        userId: user.userId,
        farmerId,
        title,
        content,
        images: images?.length
          ? {
              create: images.map((url: string, index: number) => ({
                url,
                displayOrder: index,
              })),
            }
          : undefined,
        tags: tags?.length
          ? { create: tags.map((tag: string) => ({ tag: tag.toLowerCase() })) }
          : undefined,
      },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true, userType: true },
        },
        farmer: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            isVerified: true,
          },
        },
        images: true,
        tags: true,
      },
    });

    return successResponse(post, {
      message: "Post created successfully",
      status: 201,
    });
  } catch (error) {
    return handleRouteError(error, "Create community post");
  }
}
