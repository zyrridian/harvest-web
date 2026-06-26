import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/v1/system/utils/upload:
 *   post:
 *     summary: Upload a file
 *     description: Blueprint endpoint for file uploads. Currently returns a mock URL.
 *     tags:
 *       - Utility
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The file to upload
 *     responses:
 *       200:
 *         description: File successfully uploaded
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
 *                   example: File successfully uploaded
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                       example: https://mock-storage.content/123456789-file.jpg
 *                     filename:
 *                       type: string
 *                       example: file.jpg
 *                     size:
 *                       type: integer
 *                       example: 1024
 *                     contentType:
 *                       type: string
 *                       example: image/jpeg
 *       400:
 *         description: Bad Request - No file provided
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { status: "error", message: "No file was provided in the request" },
        { status: 400 }
      );
    }

    // Blueprint: In the future, send this file to S3, Cloudinary, etc.
    // For now, we just return a mocked URL.
    const mockFileUrl = `https://mock-storage.content/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

    return NextResponse.json({
      status: "success",
      message: "File successfully uploaded",
      data: {
        url: mockFileUrl,
        filename: file.name,
        size: file.size,
        contentType: file.type,
      },
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to process the upload" },
      { status: 500 }
    );
  }
}
