import { IProductRepository } from '../../../domain/repositories/product.repository';
import { ICategoryRepository } from '../../../domain/repositories/category.repository';
import { IFarmerRepository } from '../../../domain/repositories/farmer.repository';

export interface SuggestionDTO {
  type: "product" | "category" | "farmer";
  text: string;
  id: string;
}

export class GetSearchSuggestionsUseCase {
  constructor(
    private readonly productRepo: IProductRepository,
    private readonly categoryRepo: ICategoryRepository,
    private readonly farmerRepo: IFarmerRepository
  ) {}

  async execute(query: string, type?: string | null, limit: number = 10): Promise<SuggestionDTO[]> {
    const suggestions: SuggestionDTO[] = [];

    // Search products
    if (!type || type === "products") {
      const [products] = await this.productRepo.findMany(
        { searchQuery: query, isAvailable: true },
        { skip: 0, take: limit }
      );
      suggestions.push(...products.map(p => ({ type: "product" as const, text: p.name, id: p.id })));
    }

    // Search categories
    if (!type || type === "categories") {
      // For category suggestions, we just want to match the name. 
      // The current category repository might not support text search directly, so we can fetch all or modify it.
      // Assuming getCategories() fetches all and we filter here for suggestions to keep it simple.
      const categories = await this.categoryRepo.findAll();
      const matched = categories.filter((c: any) => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, limit);
      suggestions.push(...matched.map((c: any) => ({ type: "category" as const, text: c.name, id: c.id })));
    }

    // Search farmers
    if (!type || type === "farmers") {
      const [farmers] = await this.farmerRepo.findMany(
        { searchQuery: query },
        0,
        limit
      );
      suggestions.push(...farmers.map(f => ({ type: "farmer" as const, text: f.name, id: f.id })));
    }

    return suggestions.slice(0, limit);
  }
}
