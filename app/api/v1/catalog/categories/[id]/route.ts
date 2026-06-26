import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { GetCategoryDetailsUseCase } from "@/features/catalog/application/usecases/categories/get-category-details.usecase";
import { categoryRepository } from "@/features/catalog/infrastructure/repositories/prisma-category.repository";

/**
 * @swagger
 * /api/v1/catalog/categories/{id}:
 *   get:
 *     summary: Get category details
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category details
 *       404:
 *         description: Category not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const useCase = new GetCategoryDetailsUseCase(categoryRepository);
    const category = await useCase.execute(id);

    return successResponse(category);
  } catch (error) {
    return handleRouteError(error, "Fetch category");
  }
}
