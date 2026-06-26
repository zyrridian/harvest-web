import { SearchHistoryEntity } from '../../domain/entities/search.entity';

export interface SearchHistoryDTO {
  id: string;
  query: string;
  result_count: number;
  searched_at: string;
}

export function toSearchHistoryDTO(entity: SearchHistoryEntity): SearchHistoryDTO {
  return {
    id: entity.id,
    query: entity.query,
    result_count: entity.resultCount,
    searched_at: entity.searchedAt.toISOString(),
  };
}
