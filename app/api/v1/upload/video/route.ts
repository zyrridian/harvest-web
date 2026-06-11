import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";

/**
 * @swagger
 * /api/v1/upload/video:
 *   post:
 *     summary: Upload a video
 *     tags: [Utility]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *               - file_name
 *               - file_size
 *               - mime_type
 *             properties:
 *               url:
 *                 type: string
 *               thumbnail_url:
 *                 type: string
 *               file_name:
 *                 type: string
 *               file_size:
 *                 type: integer
 *               mime_type:
 *                 type: string
 *               duration:
 *                 type: integer
 *               width:
 *                 type: integer
 *               height:
 *                 type: integer
 *               type:
 *                 type: string
 *               upload_status:
 *                 type: string
 *     responses:
 *       201:
 *         description: Video uploaded successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    const body = await request.json();

    const {
      url,
      thumbnail_url,
      file_name,
      file_size,
      mime_type,
      duration,
      width,
      height,
      type,
      upload_status,
    } = body;

    if (!url || !file_name || !file_size || !mime_type) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Missing required fields: url, file_name, file_size, mime_type",
        },
        { status: 400 },
      );
    }

    const video = await prisma.uploadedVideo.create({
      data: {
        userId: user.userId,
        url,
        thumbnailUrl: thumbnail_url,
        fileName: file_name,
        fileSize: file_size,
        mimeType: mime_type,
        duration,
        width,
        height,
        type,
        uploadStatus: upload_status || "pending",
      },
    });

    return NextResponse.json(
      {
        status: "success",
        message: "Video uploaded successfully",
        data: video,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Upload video error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error.message || "Failed to upload video",
      },
      { status: error.status || 500 },
    );
  }
}
