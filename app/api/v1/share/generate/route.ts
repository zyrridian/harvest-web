import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { nanoid } from "nanoid";

/**
 * @swagger
 * /api/v1/share/generate:
 *   post:
 *     summary: Generate a share link
 *     tags: [Utility]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reference_type
 *               - reference_id
 *             properties:
 *               reference_type:
 *                 type: string
 *                 enum: [product, farmer, post, order]
 *               reference_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Share link generated successfully
 *       400:
 *         description: Invalid request
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { reference_type, reference_id } = body;

    if (!reference_type || !reference_id) {
      return NextResponse.json(
        {
          status: "error",
          message: "Missing required fields: reference_type, reference_id",
        },
        { status: 400 },
      );
    }

    // Check if share link already exists
    let shareLink = await prisma.shareLink.findFirst({
      where: {
        referenceType: reference_type,
        referenceId: reference_id,
      },
    });

    if (shareLink) {
      // Increment share count
      shareLink = await prisma.shareLink.update({
        where: { id: shareLink.id },
        data: {
          shareCount: {
            increment: 1,
          },
        },
      });
    } else {
      // Generate new short code
      const shortCode = nanoid(8);

      shareLink = await prisma.shareLink.create({
        data: {
          referenceType: reference_type,
          referenceId: reference_id,
          shortCode,
          shareCount: 1,
        },
      });
    }

    return NextResponse.json(
      {
        status: "success",
        message: "Share link generated successfully",
        data: {
          share_url: `${
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
          }/share/${shareLink.shortCode}`,
          short_code: shareLink.shortCode,
          share_count: shareLink.shareCount,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Generate share link error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error.message || "Failed to generate share link",
      },
      { status: 500 },
    );
  }
}
