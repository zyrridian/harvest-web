import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";
import { nanoid } from "nanoid";

/**
 * @swagger
 * /api/v1/upload/image:
 *   post:
 *     summary: Upload an image
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
 *               medium_url:
 *                 type: string
 *               file_name:
 *                 type: string
 *               file_size:
 *                 type: integer
 *               mime_type:
 *                 type: string
 *               width:
 *                 type: integer
 *               height:
 *                 type: integer
 *               type:
 *                 type: string
 *     responses:
 *       201:
 *         description: Image uploaded successfully
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
      medium_url,
      file_name,
      file_size,
      mime_type,
      width,
      height,
      type,
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

    const image = await prisma.uploadedImage.create({
      data: {
        userId: user.userId,
        url,
        thumbnailUrl: thumbnail_url,
        mediumUrl: medium_url,
        fileName: file_name,
        fileSize: file_size,
        mimeType: mime_type,
        width,
        height,
        type,
      },
    });

    return NextResponse.json(
      {
        status: "success",
        message: "Image uploaded successfully",
        data: image,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Upload image error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error.message || "Failed to upload image",
      },
      { status: error.status || 500 },
    );
  }
}
