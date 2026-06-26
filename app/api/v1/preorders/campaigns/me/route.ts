import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { preOrderRepository } from "@/features/preorder/infrastructure/repositories/prisma-preorder.repository";

/**
 * @swagger
 * /api/v1/preorders/campaigns/me:
 *   get:
 *     summary: Get farmer's own campaigns
 *     description: Fetch all preorder campaigns created by the authenticated farmer
 *     tags:
 *       - Preorders
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Farmer's campaigns retrieved
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    
    // Assumes payload.userId is the farmerId, in reality there might be a check if user is a farmer
    const campaigns = await preOrderRepository.getFarmerCampaigns(payload.userId);

    return successResponse(campaigns);
  } catch (error) {
    return handleRouteError(error, "GetFarmerCampaigns");
  }
}
