import { IPreOrderRepository } from "../../domain/repositories/preorder.repository";
import { ReservePreOrderInputDTO, ReservePreOrderResponseDTO } from "../dtos/preorder.dto";
import { AppError } from "@/core/errors";

export class ReservePreOrderUseCase {
  constructor(private readonly preorderRepo: IPreOrderRepository) {}

  async execute(userId: string, input: ReservePreOrderInputDTO): Promise<ReservePreOrderResponseDTO> {
    const product = await this.preorderRepo.findHarvestById(input.harvest_id);

    if (!product || !product.isHarvest || !product.isAvailable) {
      throw AppError.notFound("Harvest product not found or unavailable");
    }

    const total = product.targetAmount || 100;
    const booked = product.currentBooked || 0;

    if (booked + input.quantity > total) {
      throw AppError.badRequest("Not enough quantity available for this harvest");
    }

    const order = await this.preorderRepo.createReservation(userId, input.harvest_id, input.quantity);

    return {
      reservation_id: order.id,
      status: "Pending" // Initial status when created
    };
  }
}
