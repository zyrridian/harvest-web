export interface ProvinceEntity {
  id: number;
  name: string;
}

export interface CityEntity {
  id: number;
  provinceId: number;
  name: string;
}

export interface DistrictEntity {
  id: number;
  cityId: number;
  name: string;
}


