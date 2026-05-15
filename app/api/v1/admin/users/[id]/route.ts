import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAdmin } from "@/features/auth";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   get:
 *     summary: Get user details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await verifyAdmin(request);

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        avatarUrl: true,
        userType: true,
        isVerified: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
        profile: true,
        farmer: true,
        _count: {
          select: {
            buyerOrders: true,
            sellerOrders: true,
            products: true,
            reviews: true,
            communityPosts: true,
            favorites: true,
          },
        },
      },
    });

    if (!user) {
      throw AppError.notFound("User not found");
    }

    return successResponse(user);
  } catch (error) {
    return handleRouteError(error, "Admin get user");
  }
}

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               user_type:
 *                 type: string
 *                 enum: [CONSUMER, PRODUCER, ADMIN]
 *               is_verified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await verifyAdmin(request);
    const body = await request.json();

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw AppError.notFound("User not found");
    }

    const updateData: Record<string, unknown> = {};
    if (body.name) updateData.name = body.name;
    if (body.email) updateData.email = body.email;
    if (body.user_type) updateData.userType = body.user_type;
    if (body.is_verified !== undefined)
      updateData.isVerified = body.is_verified;

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        avatarUrl: true,
        userType: true,
        isVerified: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse(updated, { message: "User updated successfully" });
  } catch (error) {
    return handleRouteError(error, "Admin update user");
  }
}

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await verifyAdmin(request);

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw AppError.notFound("User not found");
    }

    await prisma.user.delete({ where: { id } });

    return successResponse(undefined, {
      message: "User deleted successfully",
    });
  } catch (error) {
    return handleRouteError(error, "Admin delete user");
  }
}
