import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";

/**
 * @swagger
 * /api/v1/addresses/{id}:
 *   put:
 *     summary: Update existing address
 *     tags: [Addresses]
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
 *             properties:
 *               label:
 *                 type: string
 *               recipient_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               full_address:
 *                 type: string
 *               notes:
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
 *               is_primary:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Address updated successfully
 *       401:
 *         description: Unauthorized
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payload = await verifyAuth(request);
    const userId = payload.userId;

    const body = await request.json();
    const {
      label,
      recipient_name,
      phone,
      full_address,
      notes,
      province_id,
      city_id,
      district_id,
      postal_code,
      latitude,
      longitude,
      is_primary
    } = body;

    const address = await prisma.address.findUnique({ where: { id } });

    if (!address) {
      throw AppError.notFound("Address not found");
    }

    if (address.userId !== userId) {
      throw AppError.forbidden("Not authorized to update this address");
    }

    // Geograhical Master Data Check if ANY of the IDs are provided
    let updatedProvinceName, updatedCityName, updatedDistrictName;

    if (province_id !== undefined || city_id !== undefined || district_id !== undefined) {
      const pId = province_id ?? address.provinceId;
      const cId = city_id ?? address.cityId;
      const dId = district_id ?? address.districtId;

      const [provinceData, cityData, districtData] = await Promise.all([
        prisma.province.findUnique({ where: { id: pId } }),
        prisma.city.findUnique({ where: { id: cId } }),
        prisma.district.findUnique({ where: { id: dId } }),
      ]);

      if (!provinceData || !cityData || !districtData) {
        throw AppError.badRequest("Invalid location IDs provided");
      }

      updatedProvinceName = provinceData.name;
      updatedCityName = cityData.name;
      updatedDistrictName = districtData.name;
    }

    if (is_primary === true) {
      await prisma.address.updateMany({
        where: { userId, isPrimary: true, id: { not: id } },
        data: { isPrimary: false },
      });
    }

    const updated = await prisma.address.update({
      where: { id },
      data: {
        ...(label !== undefined && { label }),
        ...(recipient_name !== undefined && { recipientName: recipient_name }),
        ...(phone !== undefined && { phone }),
        ...(full_address !== undefined && { fullAddress: full_address }),
        ...(notes !== undefined && { notes }),
        ...(province_id !== undefined && { provinceId: province_id, province: updatedProvinceName }),
        ...(city_id !== undefined && { cityId: city_id, city: updatedCityName }),
        ...(district_id !== undefined && { districtId: district_id, district: updatedDistrictName }),
        ...(postal_code !== undefined && { postalCode: postal_code }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        ...(is_primary !== undefined && { isPrimary: is_primary }),
      },
    });

    return successResponse(
      { address_id: updated.id, label: updated.label, updated_at: updated.updatedAt },
      { message: "Address updated successfully" },
    );
  } catch (error) {
    return handleRouteError(error, "Update address");
  }
}

/**
 * @swagger
 * /api/v1/addresses/{id}:
 *   delete:
 *     summary: Delete an address
 *     tags: [Addresses]
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
 *         description: Address deleted successfully
 *       401:
 *         description: Unauthorized
 */
export async function DELETE(
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
      throw AppError.forbidden("Not authorized to delete this address");
    }

    await prisma.address.delete({ where: { id } });

    return successResponse(undefined, { message: "Address deleted successfully" });
  } catch (error) {
    return handleRouteError(error, "Delete address");
  }
}
