import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyToken, extractBearerToken } from "@/features/auth";

async function getFarmerFromToken(request: NextRequest) {
  const token = extractBearerToken(request.headers.get("authorization"));
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.user_type !== "PRODUCER") return null;
  return prisma.farmer.findUnique({ where: { userId: payload.userId } });
}

/**
 * PUT /api/v1/farmer/drop-points/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const farmer = await getFarmerFromToken(request);
    if (!farmer) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const existing = await prisma.dropPoint.findUnique({ where: { id } });
    if (!existing || existing.farmerId !== farmer.id) {
      return NextResponse.json(
        { status: "error", message: "Not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const updated = await prisma.dropPoint.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        description: body.description ?? existing.description,
        whatWeSell: body.what_we_sell ?? existing.whatWeSell,
        latitude:
          body.latitude !== undefined
            ? parseFloat(body.latitude)
            : existing.latitude,
        longitude:
          body.longitude !== undefined
            ? parseFloat(body.longitude)
            : existing.longitude,
        address: body.address ?? existing.address,
        imageUrl: body.image_url ?? existing.imageUrl,
        isActive:
          body.is_active !== undefined ? body.is_active : existing.isActive,
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Drop point updated",
      data: {
        id: updated.id,
        name: updated.name,
        is_active: updated.isActive,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/v1/farmer/drop-points/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const farmer = await getFarmerFromToken(request);
    if (!farmer) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const existing = await prisma.dropPoint.findUnique({ where: { id } });
    if (!existing || existing.farmerId !== farmer.id) {
      return NextResponse.json(
        { status: "error", message: "Not found" },
        { status: 404 },
      );
    }

    await prisma.dropPoint.delete({ where: { id } });

    return NextResponse.json({
      status: "success",
      message: "Drop point deleted",
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
