import { IProductRepository } from '../../../domain/repositories/product.repository';
import { buildPaginationMeta } from '@/core/helpers/pagination';
import { AppError } from '@/core/errors';

export class GetProductReviewsUseCase {
  constructor(private readonly productRepo: IProductRepository) {}

  async execute(productId: string, page: number, limit: number): Promise<{ reviews: any[], pagination: any }> {
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw AppError.notFound("Product not found");
    }

    const skip = (page - 1) * limit;
    const [reviews, totalItems] = await this.productRepo.findReviews(productId, skip, limit);

    return {
      reviews: reviews.map((review: any) => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        is_verified_purchase: review.isVerifiedPurchase,
        helpful_count: review.helpfulCount,
        created_at: review.createdAt,
        user: {
          name: review.user.name,
          avatar_url: review.user.avatarUrl,
        },
        images: review.images.map((img: any) => img.url),
        seller_response: review.sellerResponse
          ? {
              comment: review.sellerResponse.comment,
              responded_at: review.sellerResponse.respondedAt,
            }
          : null,
      })),
      pagination: buildPaginationMeta(page, limit, totalItems),
    };
  }
}
