import { IHarvestScheduleRepository } from "../../domain/repositories/harvest-schedule.repository";
import { ArrangePickupInputDTO, ArrangePickupResponseDTO } from "../dtos/harvest-schedule.dto";
import { AppError } from "@/core/errors";

export class ArrangePickupUseCase {
  constructor(private readonly harvestRepo: IHarvestScheduleRepository) {}

  async execute(userId: string, input: ArrangePickupInputDTO): Promise<ArrangePickupResponseDTO> {
    const order = await this.harvestRepo.findOrderById(input.harvest_id);

    if (!order) {
      throw AppError.notFound("Harvest reservation not found");
    }

    if (order.buyerId !== userId) {
      throw AppError.unauthorized("Not authorized to arrange pickup for this reservation");
    }

    if (order.paymentStatus !== "paid") {
      throw AppError.badRequest("Cannot arrange pickup before paying deposit");
    }

    const updatedOrder = await this.harvestRepo.updateOrderPickup(order.id, input.pickup_time);

    return {
      harvest_id: updatedOrder.id,
      pickup_time: updatedOrder.deliveryTimeSlot || input.pickup_time,
      status: "Pickup Arranged"
    };
  }
}
