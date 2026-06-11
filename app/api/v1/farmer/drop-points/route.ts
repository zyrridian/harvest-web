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
      },
    });

    return NextResponse.json(
      {
        status: "success",
        message: "Drop point created",
        data: {
          id: dropPoint.id,
          name: dropPoint.name,
          latitude: dropPoint.latitude,
          longitude: dropPoint.longitude,
        },
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
