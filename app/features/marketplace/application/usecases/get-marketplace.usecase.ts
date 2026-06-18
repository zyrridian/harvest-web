import { IMarketplaceRepository, ProductWithRelations } from "../../domain/repositories/marketplace.repository";
import { GetMarketplaceInputDTO, MarketplaceResponseDTO, FlashHarvestDTO, CategoryDTO, ProductDTO } from "../dtos/marketplace.dto";

export class GetMarketplaceUseCase {
  constructor(private readonly marketplaceRepo: IMarketplaceRepository) {}

  async execute(input: GetMarketplaceInputDTO): Promise<MarketplaceResponseDTO> {
    const [flashHarvestData, categoriesData, productsData] = await Promise.all([
      this.marketplaceRepo.getFlashHarvest(input.latitude, input.longitude),
      this.marketplaceRepo.getCategories(),
      this.marketplaceRepo.getProducts(input),
    ]);

    let flashHarvest: FlashHarvestDTO | null = null;
    if (flashHarvestData) {
      flashHarvest = {
        id: flashHarvestData.id,
        title: flashHarvestData.name,
        subtitle: flashHarvestData.isHarvest ? "Picked this morning" : "Limited Time Offer",
        distance: this.formatDistance((flashHarvestData as any).distance),
        image_url: flashHarvestData.images[0]?.url || "🍓",
      };
    }

    const categories: CategoryDTO[] = categoriesData.map(c => ({
      id: c.id,
      name: c.name,
      icon_path: c.emoji || "🥦",
      // Parse strings to integers if needed or provide defaults
      gradient_colors: c.gradientColors.length >= 2 
        ? c.gradientColors.map(colorStr => parseInt(colorStr.replace("#", ""), 16) || 0)
        : [13951696, 12109496],
    }));

    const products: ProductDTO[] = productsData.map(p => ({
      id: p.id,
      name: p.name,
      farmer_name: (p.seller as any).farmer?.name || p.seller.name,
      price: p.price,
      unit: p.unit,
      image_url: p.images[0]?.url || "🥬",
      rating: p.rating,
      sold_count: p.viewCount, // Placeholder: Using viewCount as sold_count for demonstration
      is_fresh: p.isHarvest,
    }));

    return {
      flash_harvest: flashHarvest,
      categories,
      products,
    };
  }

  private formatDistance(distanceInKm?: number): string {
    if (distanceInKm === undefined || distanceInKm === null) return "Unknown distance";
    if (distanceInKm < 1) {
      return `${(distanceInKm * 1000).toFixed(0)} m away`;
    }
    return `${distanceInKm.toFixed(1)} km away`;
  }
}
