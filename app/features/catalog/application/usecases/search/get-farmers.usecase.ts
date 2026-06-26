import { IFarmerRepository } from '../../../domain/repositories/farmer.repository';
import { FarmerDTO, toFarmerDTO } from '../../dtos/farmer.dto';
import { buildPaginationMeta } from '@/core/helpers/pagination';

export class GetFarmersUseCase {
  constructor(private readonly farmerRepo: IFarmerRepository) {}

  async execute(
    query: {
      searchQuery?: string;
      specialties?: string[];
      minRating?: number;
    },
    pagination: { skip: number; take: number; page: number }
  ): Promise<{ farmers: FarmerDTO[]; pagination: any }> {
    const [farmers, total] = await this.farmerRepo.findMany(
      {
        searchQuery: query.searchQuery,
        specialties: query.specialties,
        minRating: query.minRating,
      },
      pagination.skip,
      pagination.take
    );

    return {
      farmers: farmers.map(toFarmerDTO),
      pagination: buildPaginationMeta(pagination.page, pagination.take, total),
    };
  }
}
