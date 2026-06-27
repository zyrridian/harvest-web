import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { GetPreOrderDashboardUseCase } from "@/features/preorder/application/usecases/get-dashboard.usecase";
import { preOrderRepository } from "@/features/preorder/infrastructure/repositories/prisma-preorder.repository";

/**
 * @swagger
 * /api/v1/preorders/dashboard:
 *   get:
 *     summary: Get pre-order dashboard data
 *     description: Fetches active harvests, reservations, and pre-order stats
 *     tags:
 *       - Preorders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pre-order dashboard data retrieved successfully
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    
    const searchParams = request.nextUrl.searchParams;
    const latitude = searchParams.get("latitude") ? parseFloat(searchParams.get("latitude") as string) : undefined;
    const longitude = searchParams.get("longitude") ? parseFloat(searchParams.get("longitude") as string) : undefined;
    
    // Status query param mapping could be added if specifically asked for filtering in usecase
    // const status = searchParams.get("status") || undefined;

    const useCase = new GetPreOrderDashboardUseCase(preOrderRepository);
    const result = await useCase.execute(payload.userId, latitude, longitude);

    return successResponse(result);
  } catch (error) {
    return handleRouteError(error, "GetPreOrderDashboard");
  }
}
