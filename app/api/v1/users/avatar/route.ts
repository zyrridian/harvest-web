import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError, AppError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import {
  UpdateAvatarUseCase,
  userProfileRepository,
} from "@/features/users";

/**
 * @swagger
 * /api/v1/users/avatar:
 *   put:
 *     summary: Update user avatar image
 *     description: Upload and update the current user's avatar image
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Avatar image file
 *     responses:
 *       200:
 *         description: Avatar updated successfully
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
 *                   example: Avatar updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     avatar_url:
 *                       type: string
 *       400:
 *         description: Bad request - no file uploaded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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

    // Parse form data
    const formData = await request.formData();
    const avatar = formData.get("avatar") as File;

    if (!avatar) {
      throw AppError.badRequest("No avatar file provided");
    }

    const useCase = new UpdateAvatarUseCase(userProfileRepository);
    const result = await useCase.execute(user.userId, avatar);

    return successResponse(
      { avatar_url: result.avatarUrl },
      { message: "Avatar updated successfully" }
    );
  } catch (error) {
    return handleRouteError(error, "Update avatar");
  }
}
