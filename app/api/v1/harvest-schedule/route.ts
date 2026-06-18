import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { GetHarvestScheduleDashboardUseCase } from "@/features/harvest-schedule/application/usecases/get-schedule-dashboard.usecase";
import { harvestScheduleRepository } from "@/features/harvest-schedule/infrastructure/repositories/prisma-harvest-schedule.repository";

/**
 * @swagger
 * /api/v1/harvest-schedule:
 *   get:
 *     summary: Get harvest schedule dashboard data
 *     description: Fetches a monthly view of scheduled harvests and reservations
 *     tags:
 *       - HarvestSchedule
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *           example: "2026-06"
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Harvest schedule data retrieved successfully
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get("month");
    if (!month) throw new Error("Month parameter is required (e.g. YYYY-MM)");
    
    const latitude = searchParams.get("latitude") ? parseFloat(searchParams.get("latitude") as string) : undefined;
    const longitude = searchParams.get("longitude") ? parseFloat(searchParams.get("longitude") as string) : undefined;

    const useCase = new GetHarvestScheduleDashboardUseCase(harvestScheduleRepository);
    const result = await useCase.execute(payload.userId, month, latitude, longitude);

    return successResponse(result);
  } catch (error) {
    return handleRouteError(error, "GetHarvestSchedule");
  }
}
