import { IFarmerRepository } from "../../domain/repositories/farmer.repository";
import { GetNearbyFarmersQuery, NearbyFarmerData } from "../dtos/farmer.dto";

export class GetNearbyFarmersUseCase {
  constructor(private farmerRepository: IFarmerRepository) { }

  async execute(query: GetNearbyFarmersQuery): Promise<NearbyFarmerData[]> {
    const { lat, lng, radius, search, is_organic, is_open_now } = query;

    const farmers = await this.farmerRepository.getNearbyFarmers({
      lat,
      lng,
      radius: radius || 3,
      search,
      isOrganic: is_organic,
      isOpenNow: is_open_now,
    });

    return farmers.map((farmer) => {
      // Determine tags based on data
      const tags: string[] = [];

      const hasOrganicProduct = farmer.user.products.some((p) => p.isOrganic);
      if (hasOrganicProduct) tags.push("Organic");

      // Determine primary category and subcategory from their products
      let primaryCategory = "General";
      let primarySubcategory = "Various";
      if (farmer.user.products.length > 0) {
        const firstProduct = farmer.user.products[0];
        if (firstProduct.category) primaryCategory = firstProduct.category.name;
        if (firstProduct.subcategory) primarySubcategory = firstProduct.subcategory.name;
      }

      // Mock open status for now, since we defaulted to true in repository
      // If we had real opening hours we would parse it here.
      const isOpen = true;
      const statusText = isOpen ? "Open now" : "Closed";
      const statusSubText = isOpen ? "closes soon" : "opens tomorrow";

      // Products mapping
      const products = farmer.user.products.map((p) => ({ name: p.name }));

      // We fetched up to 5 products in repo, we can mock extra count if they have more
      const totalProductsCount = farmer.totalProducts || farmer.user.products.length;
      const extraProductsCount = totalProductsCount > products.length ? totalProductsCount - products.length : 0;

      return {
        id: farmer.id,
        name: farmer.name,
        distance: farmer.distance ? parseFloat(farmer.distance.toFixed(1)) : 0.0,
        category: primaryCategory,
        subCategory: primarySubcategory,
        rating: farmer.rating || 0.0,
        reviewCount: farmer.totalReviews || 0,
        tags,
        products,
        extraProductsCount,
        statusText,
        statusSubText,
        isOpen,
        latitude: farmer.latitude || 0.0,
        longitude: farmer.longitude || 0.0,
        iconPath: farmer.profileImage || "🧑‍🌾", // Default emoji if no image
      };
    });
  }
}
