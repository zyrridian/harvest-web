import prisma from '@/core/database/prisma';
import { ISearchRepository } from '../../domain/repositories/search.repository';
import { SearchHistoryEntity } from '../../domain/entities/search.entity';

export class PrismaSearchRepository implements ISearchRepository {
  async getSearchHistory(userId: string, limit: number): Promise<SearchHistoryEntity[]> {
    const history = await prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { searchedAt: 'desc' },
      take: limit,
    });
    
    return history.map(h => ({
      id: h.id,
      userId: h.userId,
      query: h.query,
      resultCount: h.resultCount,
      searchedAt: h.searchedAt,
    }));
  }

  async clearSearchHistory(userId: string): Promise<void> {
    await prisma.searchHistory.deleteMany({
      where: { userId },
    });
  }

  async saveSearchHistory(userId: string, query: string, resultCount: number): Promise<void> {
    await prisma.searchHistory.create({
      data: {
        userId,
        query,
        resultCount,
      },
    });
  }
}

export const searchRepository = new PrismaSearchRepository();
