import { FarmerEntity } from '../entities/farmer.entity';

export interface FindFarmersQuery {
  searchQuery?: string;
  specialties?: string[];
  minRating?: number;
}

export interface IFarmerRepository {
  findMany(query: FindFarmersQuery, skip: number, limit: number): Promise<[FarmerEntity[], number]>;
}
