import { ISearchRepository } from '../../../domain/repositories/search.repository';
import { SearchHistoryDTO, toSearchHistoryDTO } from '../../dtos/search.dto';

export class GetSearchHistoryUseCase {
  constructor(private readonly searchRepo: ISearchRepository) {}

  async execute(userId: string, limit: number): Promise<SearchHistoryDTO[]> {
    const history = await this.searchRepo.getSearchHistory(userId, limit);
    return history.map(toSearchHistoryDTO);
  }
}

export class ClearSearchHistoryUseCase {
  constructor(private readonly searchRepo: ISearchRepository) {}

  async execute(userId: string): Promise<void> {
    await this.searchRepo.clearSearchHistory(userId);
  }
}
