import { IHarvestScheduleRepository } from "../../domain/repositories/harvest-schedule.repository";
import { PayDepositInputDTO, PayDepositResponseDTO } from "../dtos/harvest-schedule.dto";
import { AppError } from "@/core/errors";

export class PayDepositUseCase {
  constructor(private readonly harvestRepo: IHarvestScheduleRepository) {}

  async execute(userId: string, input: PayDepositInputDTO): Promise<PayDepositResponseDTO> {
    const reservation = await this.harvestRepo.findReservationById(input.harvest_id);

    if (!reservation) {
      throw AppError.notFound("Harvest reservation not found");
    }

    if (reservation.userId !== userId) {
      throw AppError.unauthorized("Not authorized to pay for this reservation");
    }

    if (reservation.status === "DEPOSIT_PAID" || reservation.status === "FULLY_PAID") {
      throw AppError.badRequest("Deposit already paid for this harvest");
    }

    const updatedReservation = await this.harvestRepo.updateReservationStatus(reservation.id, "DEPOSIT_PAID");

    return {
      harvest_id: updatedReservation.id,
      status: "Confirmed"
    };
  }
}
