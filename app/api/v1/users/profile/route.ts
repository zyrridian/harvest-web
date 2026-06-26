import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import {
  GetProfileUseCase,
  UpdateProfileUseCase,
  userProfileRepository,
  UpdateProfileSchema,
} from "@/features/users";

/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     summary: Get user profile information
 *     description: Retrieve the current user's profile information including bio and stats
 *     tags:
 *       - Users
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                     profile:
 *                       type: object
 *                       properties:
 *                         bio:
 *                           type: string
 *                         followers_count:
 *                           type: integer
 *                         response_rate:
 *                           type: number
 *                         response_time:
 *                           type: string
 *                         joined_since:
 *                           type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    const useCase = new GetProfileUseCase(userProfileRepository);
    const profileData = await useCase.execute(user.userId);

    // Using NextResponse.json manually here to match the exact documented response shape
    // Or we could rely on successResponse if it handles it. 
    // The previous implementation had data: { user: {...}, profile: {...} }
    return successResponse(profileData);
  } catch (error) {
    return handleRouteError(error, "Get profile");
  }
}

/**
 * @swagger
 * /api/v1/users/profile:
 *   put:
 *     summary: Update user profile information
 *     description: Update the current user's profile including name, phone, and bio
 *     tags:
 *       - Users
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe Updated
 *               phone_number:
 *                 type: string
 *                 example: "+6281234567890"
 *               bio:
 *                 type: string
 *                 example: Updated bio text
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Profile updated successfully
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    const body = await request.json();

    const input = UpdateProfileSchema.parse(body);

    const useCase = new UpdateProfileUseCase(userProfileRepository);
    const profileData = await useCase.execute(user.userId, {
      name: input.name,
      phoneNumber: input.phone_number,
      bio: input.bio,
    });

    return successResponse(profileData, {
      message: "Profile updated successfully",
    });
  } catch (error) {
    return handleRouteError(error, "Update profile");
  }
}
