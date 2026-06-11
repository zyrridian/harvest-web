import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAdmin } from "@/features/auth";

/**
 * @swagger
 * /api/v1/admin/farmers/{id}/verify:
 *   put:
 *     summary: Verify or unverify a farmer
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
 *             required:
 *               - is_verified
 *             properties:
 *               is_verified:
 *                 type: boolean
 *               verification_badge:
 *                 type: string
 *     responses:
 *       200:
 *         description: Farmer verification status updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Farmer not found
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await verifyAdmin(request);
    const body = await request.json();

    const { is_verified, verification_badge } = body;

    if (is_verified === undefined) {
      return NextResponse.json(
        {
          status: "error",
          message: "is_verified is required",
        },
        { status: 400 },
      );
    }

    const farmer = await prisma.farmer.findUnique({
      where: { id },
    });

    if (!farmer) {
      return NextResponse.json(
        {
          status: "error",
          message: "Farmer not found",
        },
        { status: 404 },
      );
    }

    const updateData: any = { isVerified: is_verified };

    if (verification_badge) {
      updateData.verificationBadge = verification_badge;
    }

    const updated = await prisma.farmer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      status: "success",
      message: `Farmer ${is_verified ? "verified" : "unverified"} successfully`,
      data: updated,
    });
  } catch (error: any) {
    console.error("Verify farmer error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error.message || "Failed to verify farmer",
      },
      { status: error.status || 500 },
    );
  }
}
