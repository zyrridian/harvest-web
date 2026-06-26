import { ProvinceEntity, CityEntity, DistrictEntity } from '../../domain/entities/master-data.entity';

export interface ProvinceDTO {
  id: number;
  name: string;
}

export interface CityDTO {
  id: number;
  province_id: number;
  name: string;
}

export interface DistrictDTO {
  id: number;
  city_id: number;
  name: string;
}

export function toProvinceDTO(entity: ProvinceEntity): ProvinceDTO {
  return { id: entity.id, name: entity.name };
}

export function toCityDTO(entity: CityEntity): CityDTO {
  return { id: entity.id, province_id: entity.provinceId, name: entity.name };
}

export function toDistrictDTO(entity: DistrictEntity): DistrictDTO {
  return { id: entity.id, city_id: entity.cityId, name: entity.name };
}
