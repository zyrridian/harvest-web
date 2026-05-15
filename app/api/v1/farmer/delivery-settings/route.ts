import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";

/**
 * GET /api/v1/farmer/delivery-settings
 * Returns current farmer's delivery settings
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    const userId = payload.userId;

    const farmer = await prisma.farmer.findUnique({
      where: { userId },
      select: { id: true, deliverySettings: true },
    });
    if (!farmer) throw AppError.notFound("Farmer profile not found");

    return successResponse({
      delivery_settings: farmer.deliverySettings
        ? {
            farmer_delivery_enabled: farmer.deliverySettings.farmerDeliveryEnabled,
            base_fee: farmer.deliverySettings.baseFee,
            per_km_rate: farmer.deliverySettings.perKmRate,
            max_radius_km: farmer.deliverySettings.maxRadiusKm,
            min_order_for_free: farmer.deliverySettings.minOrderForFree,
            cash_on_delivery_enabled: farmer.deliverySettings.cashOnDeliveryEnabled,
            notes: farmer.deliverySettings.notes,
          }
        : null,
    });
  } catch (error) {
    return handleRouteError(error, "Get delivery settings");
  }
}

/**
 * PUT /api/v1/farmer/delivery-settings
 * Upsert farmer delivery settings
 */
export async function PUT(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    const userId = payload.userId;

    const farmer = await prisma.farmer.findUnique({ where: { userId } });
    if (!farmer) throw AppError.notFound("Farmer profile not found");

    const body = await request.json();
    const {
      farmer_delivery_enabled,
      base_fee,
      per_km_rate,
      max_radius_km,
      min_order_for_free,
      cash_on_delivery_enabled,
      notes,
    } = body;

    const settings = await prisma.farmerDeliverySettings.upsert({
      where: { farmerId: farmer.id },
      create: {
        farmerId: farmer.id,
        farmerDeliveryEnabled: farmer_delivery_enabled ?? false,
        baseFee: base_fee ?? 10000,
        perKmRate: per_km_rate ?? 2000,
        maxRadiusKm: max_radius_km ?? 30,
        minOrderForFree: min_order_for_free ?? null,
        cashOnDeliveryEnabled: cash_on_delivery_enabled ?? false,
        notes: notes ?? null,
      },
      update: {
        ...(farmer_delivery_enabled !== undefined && { farmerDeliveryEnabled: farmer_delivery_enabled }),
        ...(base_fee !== undefined && { baseFee: base_fee }),
        ...(per_km_rate !== undefined && { perKmRate: per_km_rate }),
        ...(max_radius_km !== undefined && { maxRadiusKm: max_radius_km }),
        ...(min_order_for_free !== undefined && { minOrderForFree: min_order_for_free }),
        ...(cash_on_delivery_enabled !== undefined && { cashOnDeliveryEnabled: cash_on_delivery_enabled }),
        ...(notes !== undefined && { notes }),
      },
    });

    return successResponse(
      {
        farmer_delivery_enabled: settings.farmerDeliveryEnabled,
        base_fee: settings.baseFee,
        per_km_rate: settings.perKmRate,
        max_radius_km: settings.maxRadiusKm,
        min_order_for_free: settings.minOrderForFree,
        cash_on_delivery_enabled: settings.cashOnDeliveryEnabled,
        notes: settings.notes,
      },
      { message: "Delivery settings updated" }
    );
  } catch (error) {
    return handleRouteError(error, "Update delivery settings");
  }
}
