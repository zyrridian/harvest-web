import { IHarvestScheduleRepository } from "../../domain/repositories/harvest-schedule.repository";
import { PayDepositInputDTO, PayDepositResponseDTO } from "../dtos/harvest-schedule.dto";
import { AppError } from "@/core/errors";

export class PayDepositUseCase {
  constructor(private readonly harvestRepo: IHarvestScheduleRepository) {}

  async execute(userId: string, input: PayDepositInputDTO): Promise<PayDepositResponseDTO> {
    const order = await this.harvestRepo.findOrderById(input.harvest_id);

    if (!order) {
      throw AppError.notFound("Harvest reservation not found");
    }

    if (order.buyerId !== userId) {
      throw AppError.unauthorized("Not authorized to pay for this reservation");
    }

    if (order.paymentStatus === "paid" || order.status === "confirmed") {
      throw AppError.badRequest("Deposit already paid for this harvest");
    }

    const updatedOrder = await this.harvestRepo.updateOrderDeposit(order.id);

    return {
      harvest_id: updatedOrder.id,
      status: "Confirmed"
    };
  }
}
