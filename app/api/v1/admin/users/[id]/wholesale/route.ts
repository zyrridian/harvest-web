import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await verifyAuth(request);
    
    // In a real app, verify admin role here
    if (payload.user_type !== "ADMIN") {
      throw AppError.forbidden("Only admins can approve wholesale requests");
    }

    const { id } = await params;
    const body = await request.json();
    const { is_wholesale = true, wholesale_limit = 500 } = body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        isWholesale: is_wholesale,
        wholesaleLimit: wholesale_limit,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isWholesale: true,
        wholesaleLimit: true,
      }
    });

    return successResponse(
      { user },
      { message: "Wholesale status updated successfully" }
    );
  } catch (error) {
    return handleRouteError(error, "Update wholesale status");
  }
}
