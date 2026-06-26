import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";
import { GetProductDetailsUseCase } from "@/features/catalog/application/usecases/products/get-product-details.usecase";
import { productRepository } from "@/features/catalog/infrastructure/repositories/prisma-product.repository";

/**
 * @swagger
 * /api/v1/catalog/products/{id}:
 *   get:
 *     summary: Get detailed information about a specific product
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const useCase = new GetProductDetailsUseCase(productRepository);
    const product = await useCase.execute(id);

    return successResponse(product);
  } catch (error) {
    return handleRouteError(error, "Fetch product");
  }
}
