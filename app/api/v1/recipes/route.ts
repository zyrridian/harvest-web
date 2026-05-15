import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { verifyAuth } from "@/features/auth";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";

/**
 * GET /api/v1/recipes
 * Query params:
 * - is_featured=true
 * - limit=10
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isFeatured = searchParams.get("is_featured") === "true";
    const limit = parseInt(searchParams.get("limit") || "20");

    const recipes = await prisma.recipe.findMany({
      where: {
        ...(isFeatured && { isFeatured: true }),
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    return successResponse({ recipes });
  } catch (error) {
    return handleRouteError(error, "Get recipes");
  }
}

/**
 * POST /api/v1/recipes
 * Create a new recipe
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    const userId = payload.userId;

    const body = await request.json();
    const {
      title,
      description,
      image_url,
      prep_time_minutes,
      cook_time_minutes,
      servings,
      difficulty,
      instructions,
      ingredients, // Array of { name, quantity, unit, product_id? }
    } = body;

    if (!title || !instructions || !ingredients) {
      throw AppError.badRequest("Missing required fields");
    }

    const recipe = await prisma.recipe.create({
      data: {
        authorId: userId,
        title,
        description,
        imageUrl: image_url,
        prepTimeMinutes: prep_time_minutes,
        cookTimeMinutes: cook_time_minutes,
        servings,
        difficulty,
        instructions,
        ingredients: {
          create: ingredients.map((ing: any) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            productId: ing.product_id || null,
          })),
        },
      },
      include: {
        ingredients: true,
      },
    });

    return successResponse({ recipe }, { message: "Recipe created successfully", status: 201 });
  } catch (error) {
    return handleRouteError(error, "Create recipe");
  }
}
