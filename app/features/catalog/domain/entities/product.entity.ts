export interface ProductEntity {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  sellerId: string;
  sellerName: string;
  sellerAvatarUrl: string | null;
  price: number;
  currency: string;
  unit: string;
  isOrganic: boolean;
  isAvailable: boolean;
  stockQuantity: number;
  rating: number;
  reviewCount: number;
  isHarvest: boolean;
  targetAmount: number | null;
  currentBooked: number;
  harvestDate: Date | null;
  createdAt: Date;
  
  // Relations mapped
  primaryImageUrl: string | null;
  imageUrls: string[];
  tags: string[];
  
  // Computed/Discount
  activeDiscountValue: number | null;
  activeDiscountType: string | null;
  
  // Farmer data if available
  farmer?: {
    name: string;
    profileImage: string | null;
    isVerified: boolean;
  };
}


