import { ProvinceEntity, CityEntity, DistrictEntity } from '../entities/master-data.entity';

export interface IMasterDataRepository {
  getProvinces(): Promise<ProvinceEntity[]>;
  getCities(provinceId?: number): Promise<CityEntity[]>;
  getDistricts(cityId?: number): Promise<DistrictEntity[]>;
}
