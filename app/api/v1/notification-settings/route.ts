import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";

/**
 * @swagger
 * /api/v1/notification-settings:
 *   get:
 *     summary: Get notification settings
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification settings
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    let settings = await prisma.notificationSettings.findUnique({
      where: { userId: user.userId },
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: {
          userId: user.userId,
        },
      });
    }

    return NextResponse.json({
      status: "success",
      data: settings,
    });
  } catch (error: any) {
    console.error("Get notification settings error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error.message || "Failed to get notification settings",
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * @swagger
 * /api/v1/notification-settings:
 *   put:
 *     summary: Update notification settings
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enable_push_notifications:
 *                 type: boolean
 *               enable_order_updates:
 *                 type: boolean
 *               enable_new_messages:
 *                 type: boolean
 *               enable_reviews:
 *                 type: boolean
 *               enable_promotions:
 *                 type: boolean
 *               enable_community:
 *                 type: boolean
 *               enable_email_notifications:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       401:
 *         description: Unauthorized
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    const body = await request.json();

    const updateData: any = {};

    if (body.enable_push_notifications !== undefined) {
      updateData.enablePushNotifications = body.enable_push_notifications;
    }
    if (body.enable_order_updates !== undefined) {
      updateData.enableOrderUpdates = body.enable_order_updates;
    }
    if (body.enable_new_messages !== undefined) {
      updateData.enableNewMessages = body.enable_new_messages;
    }
    if (body.enable_reviews !== undefined) {
      updateData.enableReviews = body.enable_reviews;
    }
    if (body.enable_promotions !== undefined) {
      updateData.enablePromotions = body.enable_promotions;
    }
    if (body.enable_community !== undefined) {
      updateData.enableCommunity = body.enable_community;
    }
    if (body.enable_email_notifications !== undefined) {
      updateData.enableEmailNotifications = body.enable_email_notifications;
    }

    const settings = await prisma.notificationSettings.upsert({
      where: { userId: user.userId },
      create: {
        userId: user.userId,
        ...updateData,
      },
      update: updateData,
    });

    return NextResponse.json({
      status: "success",
      message: "Notification settings updated successfully",
      data: settings,
    });
  } catch (error: any) {
    console.error("Update notification settings error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error.message || "Failed to update notification settings",
      },
      { status: error.status || 500 }
    );
  }
}
