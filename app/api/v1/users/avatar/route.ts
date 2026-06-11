import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyToken, extractBearerToken } from "@/features/auth";

/**
 * @swagger
 * /api/v1/users/avatar:
 *   put:
 *     summary: Update user avatar image
 *     description: Upload and update the current user's avatar image
 *     tags:
 *       - User Profile
 *     security:
 *       - BearerAuth: []
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
    // Get token from Authorization header
    const authHeader = request.headers.get("Authorization");
    const token = extractBearerToken(authHeader);

    if (!token) {
      return NextResponse.json(
        { status: "error", message: "No token provided" },
        { status: 401 },
      );
    }

    // Verify token
    const payload = await verifyToken(token);

    if (!payload || payload.type !== "access") {
      return NextResponse.json(
        { status: "error", message: "Invalid token" },
        { status: 401 },
      );
    }

    // Parse form data
    const formData = await request.formData();
    const avatar = formData.get("avatar") as File;

    if (!avatar) {
      return NextResponse.json(
        { status: "error", message: "No avatar file provided" },
        { status: 400 },
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(avatar.type)) {
      return NextResponse.json(
        {
          status: "error",
          message: "Invalid file type. Only JPEG, PNG, and WebP are allowed",
        },
        { status: 400 },
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (avatar.size > maxSize) {
      return NextResponse.json(
        { status: "error", message: "File size exceeds 5MB limit" },
        { status: 400 },
      );
    }

    // TODO: Implement actual file upload to cloud storage (S3, Cloudinary, etc.)
    // For now, we'll use a placeholder URL
    // In production, you would:
    // 1. Upload the file to your cloud storage
    // 2. Get the public URL
    // 3. Optionally resize/optimize the image
    // 4. Delete the old avatar from storage

    // Example placeholder implementation:
    const avatarUrl = `https://cdn.farmmarket.com/avatars/${
      payload.userId
    }_${Date.now()}.${avatar.type.split("/")[1]}`;

    // Update user avatar in database
    const user = await prisma.user.update({
      where: { id: payload.userId },
      data: { avatarUrl },
    });

    return NextResponse.json({
      status: "success",
      message: "Avatar updated successfully",
      data: {
        avatar_url: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error("Update avatar error:", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 },
    );
  }
}
