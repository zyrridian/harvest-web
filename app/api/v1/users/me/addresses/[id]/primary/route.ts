import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";

/**
 * @swagger
 * /api/v1/users/me/addresses/{id}/primary:
 *   patch:
 *     summary: Set address as primary
 *     tags: [Users]
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
 *         description: Primary address updated
 *       401:
 *         description: Unauthorized
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payload = await verifyAuth(request);
    const userId = payload.userId;

    const address = await prisma.address.findUnique({ where: { id } });

    if (!address) {
      throw AppError.notFound("Address not found");
    }

    if (address.userId !== userId) {
      throw AppError.forbidden("Not authorized to update this address");
    }

    await prisma.address.updateMany({
      where: { userId, isPrimary: true },
      data: { isPrimary: false },
    });

    const updated = await prisma.address.update({
      where: { id },
      data: { isPrimary: true },
    });

    return successResponse(
      { address_id: updated.id, is_primary: updated.isPrimary },
      { message: "Primary address updated" },
    );
  } catch (error) {
    return handleRouteError(error, "Set primary address");
  }
}
