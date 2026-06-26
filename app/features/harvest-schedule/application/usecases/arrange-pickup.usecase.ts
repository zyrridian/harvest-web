import { IHarvestScheduleRepository } from "../../domain/repositories/harvest-schedule.repository";
import { ArrangePickupInputDTO, ArrangePickupResponseDTO } from "../dtos/harvest-schedule.dto";
import { AppError } from "@/core/errors";

export class ArrangePickupUseCase {
  constructor(private readonly harvestRepo: IHarvestScheduleRepository) {}

  async execute(userId: string, input: ArrangePickupInputDTO): Promise<ArrangePickupResponseDTO> {
    const reservation = await this.harvestRepo.findReservationById(input.harvest_id);

    if (!reservation) {
      throw AppError.notFound("Harvest reservation not found");
    }

    if (reservation.userId !== userId) {
      throw AppError.unauthorized("Not authorized to arrange pickup for this reservation");
    }

    if (reservation.status !== "DEPOSIT_PAID" && reservation.status !== "FULLY_PAID") {
      throw AppError.badRequest("Cannot arrange pickup before paying deposit");
    }

    // In a real system, you might add a pickup_time field to the schema.
    // For now, we just change the status if we don't have that field.
    const updatedReservation = await this.harvestRepo.updateReservationStatus(reservation.id, "PICKUP_ARRANGED");

    return {
      harvest_id: updatedReservation.id,
      pickup_time: input.pickup_time,
      status: "Pickup Arranged"
    };
  }
}
