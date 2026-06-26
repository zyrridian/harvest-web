import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";

// Haversine distance in km
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Third-party delivery estimate based on distance tiers (no Raja Ongkir key needed)
function estimateThirdPartyFee(distanceKm: number): {
  options: { service: string; fee: number; eta: string }[];
} {
  const tiers = [
    { maxKm: 5, regular: 9000, express: 15000 },
    { maxKm: 15, regular: 12000, express: 20000 },
    { maxKm: 30, regular: 18000, express: 28000 },
    { maxKm: 60, regular: 25000, express: 38000 },
    { maxKm: Infinity, regular: 35000, express: 55000 },
  ];
  const tier = tiers.find((t) => distanceKm <= t.maxKm)!;
  return {
    options: [
      { service: "JNE REG", fee: tier.regular, eta: "2-3 days" },
      { service: "JNE YES", fee: tier.express, eta: "Next day" },
      { service: "Sicepat REG", fee: tier.regular - 1000, eta: "2-3 days" },
      { service: "Sicepat BEST", fee: tier.express - 2000, eta: "Next day" },
    ],
  };
}

/**
 * GET /api/v1/delivery/estimate
 * Query: address_id, seller_id, subtotal?
 * Returns fee estimates for all 3 methods
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const addressId = searchParams.get("address_id");
    const sellerId = searchParams.get("seller_id");
    const subtotal = parseFloat(searchParams.get("subtotal") || "0");

    if (!addressId || !sellerId) {
      throw AppError.badRequest("address_id and seller_id are required");
    }

    // Fetch buyer address coords
    const address = await prisma.address.findUnique({
      where: { id: addressId },
      select: { latitude: true, longitude: true, city: true },
    });
    if (!address) throw AppError.notFound("Address not found");

    // Fetch farmer coords via seller user → farmer
    const farmer = await prisma.farmer.findUnique({
      where: { userId: sellerId },
      select: {
        name: true,
        latitude: true,
        longitude: true,
        city: true,
        deliverySettings: true,
      },
    });
    if (!farmer) throw AppError.notFound("Farmer not found");

    const hasCoords =
      address.latitude &&
      address.longitude &&
      farmer.latitude &&
      farmer.longitude;

    const distanceKm = hasCoords
      ? haversineKm(
          farmer.latitude!,
          farmer.longitude!,
          address.latitude!,
          address.longitude!,
        )
      : null;

    // --- Self pickup: always free ---
    const selfPickup = {
      method: "self_pickup",
      name: "Self Pickup",
      description: "Pick up at farmer's location",
      fee: 0,
      distance_km: distanceKm,
    };

    // --- Third party: estimated by distance ---
    const thirdParty = {
      method: "third_party",
      name: "Third Party Delivery",
      description: "JNE / Sicepat",
      fee:
        distanceKm !== null
          ? estimateThirdPartyFee(distanceKm).options[0].fee
          : 15000,
      distance_km: distanceKm,
      services:
        distanceKm !== null ? estimateThirdPartyFee(distanceKm).options : null,
      note: "Prices are estimates. Actual fee set by courier at pickup.",
    };

    // --- Farmer delivery ---
    const settings = farmer.deliverySettings;
    let farmerDelivery: object;

    if (!settings || settings.farmerDeliveryEnabled === false) {
      farmerDelivery = {
        method: "farmer_delivery",
        name: "Farmer Delivery",
        available: false,
        reason: `${farmer.name} has not enabled direct delivery`,
      };
    } else if (distanceKm !== null && distanceKm > settings.maxRadiusKm) {
      farmerDelivery = {
        method: "farmer_delivery",
        name: "Farmer Delivery",
        available: false,
        reason: `Outside ${farmer.name}'s delivery radius (${settings.maxRadiusKm} km)`,
        distance_km: distanceKm,
      };
    } else {
      const isFreeByOrder =
        settings.minOrderForFree !== null &&
        subtotal >= settings.minOrderForFree;
      const calculatedFee = isFreeByOrder
        ? 0
        : settings.baseFee +
          (distanceKm !== null ? distanceKm * settings.perKmRate : 0);

      farmerDelivery = {
        method: "farmer_delivery",
        name: "Farmer Delivery",
        available: true,
        fee: Math.round(calculatedFee),
        distance_km: distanceKm,
        base_fee: settings.baseFee,
        per_km_rate: settings.perKmRate,
        is_free: isFreeByOrder,
        negotiable: true,
        farmer_notes: settings.notes,
        cash_on_delivery_available: settings.cashOnDeliveryEnabled,
      };
    }

    return successResponse({
      distance_km: distanceKm,
      estimates: [selfPickup, thirdParty, farmerDelivery],
    });
  } catch (error) {
    return handleRouteError(error, "Estimate delivery");
  }
}
