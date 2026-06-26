import prisma from '@/core/database/prisma';
import { IMasterDataRepository } from '../../domain/repositories/master-data.repository';
import { ProvinceEntity, CityEntity, DistrictEntity } from '../../domain/entities/master-data.entity';

export class PrismaMasterDataRepository implements IMasterDataRepository {
  async getProvinces(): Promise<ProvinceEntity[]> {
    return prisma.province.findMany({ orderBy: { name: "asc" } });
  }

  async getCities(provinceId?: number): Promise<CityEntity[]> {
    return prisma.city.findMany({
      where: provinceId ? { provinceId } : undefined,
      orderBy: { name: "asc" },
    });
  }

  async getDistricts(cityId?: number): Promise<DistrictEntity[]> {
    return prisma.district.findMany({
      where: cityId ? { cityId } : undefined,
      orderBy: { name: "asc" },
    });
  }
}

export const masterDataRepository = new PrismaMasterDataRepository();
