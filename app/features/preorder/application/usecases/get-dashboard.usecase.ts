import { IPreOrderRepository } from "../../domain/repositories/preorder.repository";
import { PreOrderDashboardResponseDTO, AvailableHarvestDTO, ActiveReservationDTO } from "../dtos/preorder.dto";

export class GetPreOrderDashboardUseCase {
  constructor(private readonly preorderRepo: IPreOrderRepository) {}

  async execute(userId: string, latitude?: number, longitude?: number): Promise<PreOrderDashboardResponseDTO> {
    const [campaignsData, reservationsData] = await Promise.all([
      this.preorderRepo.getAvailableCampaigns(latitude, longitude),
      this.preorderRepo.getUserReservations(userId)
    ]);

    const available_harvests: AvailableHarvestDTO[] = campaignsData.map(c => {
      const daysLeft = c.estimatedHarvestDate ? Math.ceil((c.estimatedHarvestDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
      const total = c.targetQuantity || 100;
      const booked = c.currentBookedQuantity || 0;
      let status = "Available";
      if (booked >= total) status = "Full";
      else if (booked >= total * 0.8) status = "Almost full";

      return {
        id: c.id,
        title: c.title,
        farmer_name: c.farmer?.name || "Unknown Farmer",
        distance: this.formatDistance((c as any).distance),
        image_url: "🍓", // We might add image fields to campaign later
        price: c.pricePerUnit,
        unit: c.unit,
        booked_quantity: booked,
        total_quantity: total,
        days_left: daysLeft > 0 ? daysLeft : 0,
        status
      };
    });

    const active_reservations: ActiveReservationDTO[] = reservationsData.map(r => {
      const c = r.campaign;
      const daysToHarvest = c?.estimatedHarvestDate ? Math.ceil((c.estimatedHarvestDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
      
      let statusStr = "Pending";
      if (r.status === "DEPOSIT_PAID") statusStr = "Confirmed";
      else if (r.status === "FULLY_PAID") statusStr = "Processing";

      return {
        id: r.id,
        title: c?.title || "Unknown Campaign",
        quantity_str: `${r.quantity || 0} ${c?.unit || ""}`,
        farmer_name: c?.farmer?.name || "Unknown Farmer",
        days_to_harvest: daysToHarvest > 0 ? daysToHarvest : 0,
        image_url: "🍅",
        status: statusStr
      };
    });

    return {
      active_harvests_count: available_harvests.length,
      your_reservations_count: active_reservations.length,
      avg_savings: "30%", // Placeholder
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
