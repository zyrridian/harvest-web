import { NextRequest } from "next/server";
import { handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { GetCategoriesUseCase } from "@/features/catalog/application/usecases/categories/get-categories.usecase";
import { categoryRepository } from "@/features/catalog/infrastructure/repositories/prisma-category.repository";

/**
 * @swagger
 * /api/v1/catalog/categories:
 *   get:
 *     summary: Get all product categories
 *     tags: [Catalog]
 *     responses:
 *       200:
 *         description: List of categories
 */
export async function GET(request: NextRequest) {
  try {
    const useCase = new GetCategoriesUseCase(categoryRepository);
    const formattedCategories = await useCase.execute();

    return successResponse(formattedCategories);
  } catch (error) {
    return handleRouteError(error, "Fetch categories");
  }
}
