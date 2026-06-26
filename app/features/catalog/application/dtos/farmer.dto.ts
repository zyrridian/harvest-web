import { FarmerEntity } from '../../domain/entities/farmer.entity';

export interface FarmerDTO {
  id: string;
  user_id: string;
  name: string;
  description: string;
  profile_image: string | null;
  rating: number;
  city: string;
  specialties: string[];
  total_products: number;
}

export function toFarmerDTO(farmer: FarmerEntity): FarmerDTO {
  return {
    id: farmer.id,
    user_id: farmer.userId,
    name: farmer.name,
    description: farmer.description,
    profile_image: farmer.profileImage,
    rating: farmer.rating,
    city: farmer.city,
    specialties: farmer.specialties,
    total_products: farmer.totalProducts,
  };
}
