import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";

/**
 * @swagger
 * /api/v1/users/me/addresses:
 *   get:
 *     summary: Get user's saved addresses
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of addresses
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    const userId = payload.userId;

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });

    const formattedAddresses = addresses.map((addr) => ({
      address_id: addr.id,
      label: addr.label,
      recipient_name: addr.recipientName,
      phone: addr.phone,
      full_address: addr.fullAddress,
      province: addr.province,
      province_id: addr.provinceId,
      city: addr.city,
      city_id: addr.cityId,
      district: addr.district,
      district_id: addr.districtId,
      subdistrict: addr.subdistrict,
      postal_code: addr.postalCode,
      latitude: addr.latitude,
      longitude: addr.longitude,
      notes: addr.notes,
      is_primary: addr.isPrimary,
      is_verified: addr.isVerified,
      created_at: addr.createdAt,
      updated_at: addr.updatedAt,
    }));

    return successResponse({
      addresses: formattedAddresses,
      total_count: addresses.length,
    });
  } catch (error) {
    return handleRouteError(error, "Fetch addresses");
  }
}

/**
 * @swagger
 * /api/v1/users/me/addresses:
 *   post:
 *     summary: Add new address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               label:
 *                 type: string
 *               recipient_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               full_address:
 *                 type: string
 *               province_id:
 *                 type: integer
 *               city_id:
 *                 type: integer
 *               district_id:
 *                 type: integer
 *               postal_code:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               notes:
 *                 type: string
 *               is_primary:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Address added successfully
 *       401:
 *         description: Unauthorized
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    const userId = payload.userId;

    const body = await request.json();
    const {
      label,
      recipient_name,
      phone,
      full_address,
      province_id,
      city_id,
      district_id,
      postal_code,
      latitude,
      longitude,
      notes,
      is_primary = false,
    } = body;

    if (
      !label ||
      !recipient_name ||
      !phone ||
      !full_address ||
      !province_id ||
      !city_id ||
      !district_id ||
      !postal_code
    ) {
      throw AppError.badRequest("Missing required fields");
    }

    const [provinceData, cityData, districtData] = await Promise.all([
      prisma.province.findUnique({ where: { id: province_id } }),
      prisma.city.findUnique({ where: { id: city_id } }),
      prisma.district.findUnique({ where: { id: district_id } }),
    ]);

    if (!provinceData || !cityData || !districtData) {
      throw AppError.badRequest("Invalid location IDs provided");
    }

    if (is_primary) {
      await prisma.address.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId,
        label,
        recipientName: recipient_name,
        phone,
        fullAddress: full_address,
        province: provinceData.name,
        provinceId: province_id,
        city: cityData.name,
        cityId: city_id,
        district: districtData.name,
        districtId: district_id,
        subdistrict: null,
        postalCode: postal_code,
        latitude,
        longitude,
        notes,
        isPrimary: is_primary,
      },
    });

    return successResponse(
      {
        address_id: address.id,
        label: address.label,
        recipient_name: address.recipientName,
        phone: address.phone,
        full_address: address.fullAddress,
        province: address.province,
        province_id: address.provinceId,
        city: address.city,
        city_id: address.cityId,
        district: address.district,
        district_id: address.districtId,
        postal_code: address.postalCode,
        latitude: address.latitude,
        longitude: address.longitude,
        notes: address.notes,
        is_primary: address.isPrimary,
        is_verified: address.isVerified,
        created_at: address.createdAt,
        updated_at: address.updatedAt,
      },
      { message: "Address added successfully", status: 201 },
    );
  } catch (error) {
    return handleRouteError(error, "Add address");
  }
}
