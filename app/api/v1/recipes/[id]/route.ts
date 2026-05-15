import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";

/**
 * GET /api/v1/recipes/[id]
 * Get a specific recipe
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
        ingredients: {
          include: {
            product: {
              select: { 
                id: true, 
                name: true, 
                price: true, 
                images: { take: 1, select: { url: true } }
              },
            },
          },
        },
      },
    });

    if (!recipe) {
      throw AppError.notFound("Recipe not found");
    }

    // Increment view count
    await prisma.recipe.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    });

    return successResponse({ recipe });
  } catch (error) {
    return handleRouteError(error, "Get recipe by id");
  }
}
