import { ProductEntity } from '../../domain/entities/product.entity';

export interface ProductDTO {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  category: string | null;
  category_id?: string | null;
  category_name?: string | null;
  seller_id?: string;
  seller_name?: string;
  price: number;
  currency: string;
  unit: string;
  image: string | null;
  image_url?: string | null;
  images?: string[];
  is_organic: boolean;
  is_available: boolean;
  stock_quantity: number;
  discount: number | string | null;
  rating: number;
  review_count: number;
  farmer?: {
    name: string;
    profile_image: string | null;
    is_verified: boolean;
  };
  is_harvest: boolean;
  target_amount: number | null;
  current_booked: number;
  harvest_date: Date | null;
  tags?: string[];
  created_at?: Date;
}

export function toProductDTO(product: ProductEntity): ProductDTO {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    category: product.categoryName,
    category_id: product.categoryId,
    category_name: product.categoryName,
    seller_id: product.sellerId,
    seller_name: product.sellerName,
    price: product.price,
    currency: product.currency,
    unit: product.unit,
    image: product.primaryImageUrl,
    image_url: product.primaryImageUrl,
    images: product.imageUrls,
    is_organic: product.isOrganic,
    is_available: product.isAvailable,
    stock_quantity: product.stockQuantity,
    discount: product.activeDiscountType === "percentage" 
      ? product.activeDiscountValue 
      : (product.activeDiscountValue ? `${product.activeDiscountValue}` : null),
    rating: product.rating,
    review_count: product.reviewCount,
    farmer: product.farmer ? {
      name: product.farmer.name,
      profile_image: product.farmer.profileImage,
      is_verified: product.farmer.isVerified,
    } : {
      name: product.sellerName,
      profile_image: product.sellerAvatarUrl,
      is_verified: false,
    },
    is_harvest: product.isHarvest,
    target_amount: product.targetAmount,
    current_booked: product.currentBooked,
    harvest_date: product.harvestDate,
    tags: product.tags,
    created_at: product.createdAt,
  };
}
