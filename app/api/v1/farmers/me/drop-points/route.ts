import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyToken, extractBearerToken } from "@/features/auth";

/**
 * GET /api/v1/farmer/drop-points
 * Farmer's own drop points
 */
export async function GET(request: NextRequest) {
  try {
    const token = extractBearerToken(request.headers.get("authorization"));
    if (!token)
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 },
      );
    const payload = await verifyToken(token);
    if (!payload || payload.user_type !== "PRODUCER") {
      return NextResponse.json(
        { status: "error", message: "Forbidden" },
        { status: 403 },
      );
    }

    const farmer = await prisma.farmer.findUnique({
      where: { userId: payload.userId },
    });
    if (!farmer) {
      return NextResponse.json(
        { status: "error", message: "Farmer profile not found" },
        { status: 404 },
      );
    }

    const dropPoints = await prisma.dropPoint.findMany({
      where: { farmerId: farmer.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      status: "success",
      data: dropPoints.map((dp) => ({
        id: dp.id,
        name: dp.name,
        description: dp.description,
        what_we_sell: dp.whatWeSell,
        latitude: dp.latitude,
        longitude: dp.longitude,
        address: dp.address,
        image_url: dp.imageUrl,
        is_active: dp.isActive,
        tags: dp.tags,
        operating_hours: dp.operatingHours,
        created_at: dp.createdAt,
        updated_at: dp.updatedAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}

/**
 * POST /api/v1/farmer/drop-points
 * Create new drop point
 */
export async function POST(request: NextRequest) {
  try {
    const token = extractBearerToken(request.headers.get("authorization"));
    if (!token)
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 },
      );
    const payload = await verifyToken(token);
    if (!payload || payload.user_type !== "PRODUCER") {
      return NextResponse.json(
        { status: "error", message: "Forbidden" },
        { status: 403 },
      );
    }

    const farmer = await prisma.farmer.findUnique({
      where: { userId: payload.userId },
    });
    if (!farmer) {
      return NextResponse.json(
        { status: "error", message: "Farmer profile not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      what_we_sell,
      latitude,
      longitude,
      address,
      image_url,
      tags,
      operating_hours,
    } = body;

    if (!name || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { status: "error", message: "name, latitude, longitude required" },
        { status: 400 },
      );
    }

    const dropPoint = await prisma.dropPoint.create({
      data: {
        farmerId: farmer.id,
        name,
        description: description || null,
        whatWeSell: what_we_sell || null,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: address || null,
        imageUrl: image_url || null,
        isActive: true,
        tags: Array.isArray(tags) ? tags : [],
        operatingHours: operating_hours || null,
      },
    });

    return NextResponse.json(
      {
        status: "success",
        message: "Drop point created",
        data: dropPoint,
      },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/v1/farmer/drop-points
 * Update existing drop point
 */
export async function PATCH(request: NextRequest) {
  try {
    const token = extractBearerToken(request.headers.get("authorization"));
    if (!token)
      return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || payload.user_type !== "PRODUCER") {
      return NextResponse.json({ status: "error", message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ status: "error", message: "Drop point id is required" }, { status: 400 });
    }

    // Verify ownership
    const farmer = await prisma.farmer.findUnique({ where: { userId: payload.userId } });
    const dropPoint = await prisma.dropPoint.findUnique({ where: { id } });
    
    if (!farmer || !dropPoint || dropPoint.farmerId !== farmer.id) {
      return NextResponse.json({ status: "error", message: "Drop point not found or forbidden" }, { status: 404 });
    }

    const data: any = {};
    if (updateData.name !== undefined) data.name = updateData.name;
    if (updateData.description !== undefined) data.description = updateData.description;
    if (updateData.what_we_sell !== undefined) data.whatWeSell = updateData.what_we_sell;
    if (updateData.latitude !== undefined) data.latitude = parseFloat(updateData.latitude);
    if (updateData.longitude !== undefined) data.longitude = parseFloat(updateData.longitude);
    if (updateData.address !== undefined) data.address = updateData.address;
    if (updateData.image_url !== undefined) data.imageUrl = updateData.image_url;
    if (updateData.is_active !== undefined) data.isActive = updateData.is_active;
    if (updateData.tags !== undefined) data.tags = Array.isArray(updateData.tags) ? updateData.tags : [];
    if (updateData.operating_hours !== undefined) data.operatingHours = updateData.operating_hours;

    const updated = await prisma.dropPoint.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      status: "success",
      message: "Drop point updated",
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/farmer/drop-points
 * Delete drop point
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = extractBearerToken(request.headers.get("authorization"));
    if (!token)
      return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
      
    const payload = await verifyToken(token);
    if (!payload || payload.user_type !== "PRODUCER") {
      return NextResponse.json({ status: "error", message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ status: "error", message: "Drop point id is required" }, { status: 400 });
    }

    // Verify ownership
    const farmer = await prisma.farmer.findUnique({ where: { userId: payload.userId } });
    const dropPoint = await prisma.dropPoint.findUnique({ where: { id } });
    
    if (!farmer || !dropPoint || dropPoint.farmerId !== farmer.id) {
      return NextResponse.json({ status: "error", message: "Drop point not found or forbidden" }, { status: 404 });
    }

    await prisma.dropPoint.delete({
      where: { id },
    });

    return NextResponse.json({
      status: "success",
      message: "Drop point deleted",
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
