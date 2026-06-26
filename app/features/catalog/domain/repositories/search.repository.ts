import { SearchHistoryEntity } from '../entities/search.entity';

export interface ISearchRepository {
  getSearchHistory(userId: string, limit: number): Promise<SearchHistoryEntity[]>;
  clearSearchHistory(userId: string): Promise<void>;
  saveSearchHistory(userId: string, query: string, resultCount: number): Promise<void>;
}
