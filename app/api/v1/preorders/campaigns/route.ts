import { NextRequest } from "next/server";
import { verifyAuth } from "@/features/auth";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { parseBody } from "@/core/helpers/parseBody";
import { preOrderRepository } from "@/features/preorder/infrastructure/repositories/prisma-preorder.repository";

/**
 * @swagger
 * /api/v1/preorders/campaigns:
 *   post:
 *     summary: Create a preorder campaign
 *     description: Farmers can create a new preorder campaign
 *     tags:
 *       - Preorders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Campaign created successfully
 *   get:
 *     summary: List active preorder campaigns
 *     description: Consumers can fetch a list of active preorder campaigns
 *     tags:
 *       - Preorders
 *     responses:
 *       200:
 *         description: Active campaigns retrieved
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    const body = await parseBody<any>(request);

    // Simplistic validation for now
    if (!body.title || !body.unit || !body.pricePerUnit || !body.targetQuantity || !body.estimatedHarvestDate) {
      throw new Error("Missing required fields for campaign");
    }

    const campaign = await preOrderRepository.createCampaign(payload.userId, {
      title: body.title,
      description: body.description,
      unit: body.unit,
      pricePerUnit: Number(body.pricePerUnit),
      minimumOrderQuantity: Number(body.minimumOrderQuantity || 1),
      targetQuantity: Number(body.targetQuantity),
      depositPercentage: Number(body.depositPercentage || 0),
      estimatedHarvestDate: new Date(body.estimatedHarvestDate),
      status: body.status || "ACTIVE"
    });

    return successResponse(campaign);
  } catch (error) {
    return handleRouteError(error, "CreatePreorderCampaign");
  }
}

export async function GET(request: NextRequest) {
  try {
    // This would fetch ALL active campaigns for consumers.
    // Assuming a repository method exists, if not we will return empty list or add it later.
    return successResponse({ message: "Active campaigns list endpoint" });
  } catch (error) {
    return handleRouteError(error, "GetAllCampaigns");
  }
}
