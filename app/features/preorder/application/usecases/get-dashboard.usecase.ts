import { IPreOrderRepository } from "../../domain/repositories/preorder.repository";
import { PreOrderDashboardResponseDTO, AvailableHarvestDTO, ActiveReservationDTO } from "../dtos/preorder.dto";

export class GetPreOrderDashboardUseCase {
  constructor(private readonly preorderRepo: IPreOrderRepository) {}

  async execute(userId: string, latitude?: number, longitude?: number): Promise<PreOrderDashboardResponseDTO> {
    const [harvestsData, reservationsData, activeCount] = await Promise.all([
      this.preorderRepo.getAvailableHarvests(latitude, longitude),
      this.preorderRepo.getUserReservations(userId),
      this.preorderRepo.getActiveHarvestsCount()
    ]);

    const available_harvests: AvailableHarvestDTO[] = harvestsData.map(h => {
      const daysLeft = h.harvestDate ? Math.ceil((h.harvestDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
      const total = h.targetAmount || 100;
      const booked = h.currentBooked || 0;
      let status = "Available";
      if (booked >= total) status = "Full";
      else if (booked >= total * 0.8) status = "Almost full";

      return {
        id: h.id,
        title: h.name,
        farmer_name: h.seller.farmer?.name || h.seller.name,
        distance: this.formatDistance((h as any).distance),
        image_url: h.images[0]?.url || "🍓",
        price: h.price,
        unit: h.unit,
        booked_quantity: booked,
        total_quantity: total,
        days_left: daysLeft > 0 ? daysLeft : 0,
        status
      };
    });

    const active_reservations: ActiveReservationDTO[] = reservationsData.map(r => {
      const item = r.items[0]; // Assuming 1 item per reservation for simplicity, based on UI
      const product = item?.product;
      const daysToHarvest = product?.harvestDate ? Math.ceil((product.harvestDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
      
      let statusStr = "Pending";
      if (r.status === "confirmed") statusStr = "Confirmed";
      else if (r.status === "processing") statusStr = "Processing";

      return {
        id: r.id,
        title: product?.name || "Unknown Product",
        quantity_str: `${item?.quantity || 0} ${product?.unit || ""}`,
        farmer_name: product?.seller?.farmer?.name || product?.seller?.name || "Unknown Farmer",
        days_to_harvest: daysToHarvest > 0 ? daysToHarvest : 0,
        image_url: product?.images?.[0]?.url || "🍅",
        status: statusStr
      };
    });

    return {
      active_harvests_count: activeCount,
      your_reservations_count: active_reservations.length,
      avg_savings: "30%", // Placeholder or based on actual discount calculation
      available_harvests,
      active_reservations
    };
  }

  private formatDistance(distanceInKm?: number): string {
    if (distanceInKm === undefined || distanceInKm === null) return "Unknown distance";
    if (distanceInKm < 1) {
      return `${(distanceInKm * 1000).toFixed(0)} m`;
    }
    return `${distanceInKm.toFixed(1)} km`;
  }
}
