import { IMasterDataRepository } from '../../../domain/repositories/master-data.repository';
import { CityDTO, DistrictDTO, ProvinceDTO, toCityDTO, toDistrictDTO, toProvinceDTO } from '../../dtos/master-data.dto';

export class GetProvincesUseCase {
  constructor(private readonly repo: IMasterDataRepository) { }
  async execute(): Promise<ProvinceDTO[]> {
    const provinces = await this.repo.getProvinces();
    return provinces.map(toProvinceDTO);
  }
}

export class GetCitiesUseCase {
  constructor(private readonly repo: IMasterDataRepository) { }
  async execute(provinceId?: number): Promise<CityDTO[]> {
    const cities = await this.repo.getCities(provinceId);
    return cities.map(toCityDTO);
  }
}

export class GetDistrictsUseCase {
  constructor(private readonly repo: IMasterDataRepository) { }
  async execute(cityId?: number): Promise<DistrictDTO[]> {
    const districts = await this.repo.getDistricts(cityId);
    return districts.map(toDistrictDTO);
  }
}
