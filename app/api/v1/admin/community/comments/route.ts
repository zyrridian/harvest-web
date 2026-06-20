import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/features/auth";
import {
  GetAdminCommentsUseCase,
  communityRepository,
  AdminCommunityPaginationSchema,
} from "@/features/community";
import { handleRouteError } from "@/core/errors";

/**
 * @swagger
 * /api/v1/admin/community/comments:
 *   get:
 *     summary: Get all comments for moderation
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
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
 *         description: List of comments
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);

    const { searchParams } = new URL(request.url);
    
    // Convert searchParams to an object to validate with Zod
    const queryData = {
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    };

    const input = AdminCommunityPaginationSchema.parse(queryData);

    const useCase = new GetAdminCommentsUseCase(communityRepository);
    const result = await useCase.execute(input);

    return NextResponse.json({
      status: "success",
      data: result,
    });
  } catch (error) {
    return handleRouteError(error, "Get admin comments");
  }
}
