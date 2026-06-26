export interface FarmerEntity {
  id: string;
  userId: string;
  name: string;
  description: string;
  profileImage: string | null;
  rating: number;
  city: string;
  specialties: string[];
  totalProducts: number;
}
