import { IPreOrderRepository } from "../../domain/repositories/preorder.repository";

export class CancelPreOrderUseCase {
  constructor(private readonly preorderRepo: IPreOrderRepository) {}

  async executeUserCancellation(userId: string, reservationId: string, reason?: string) {
    const reservation = await this.preorderRepo.findReservationById(reservationId);
    
    if (!reservation) {
      throw new Error("Reservation not found");
    }

    if (reservation.userId !== userId) {
      throw new Error("Unauthorized to cancel this reservation");
    }

    if (reservation.status === "CANCELLED") {
      throw new Error("Reservation is already cancelled");
    }
    
    // Additional logic can go here (e.g., refunds if deposit was paid)

    const cancelledReservation = await this.preorderRepo.cancelReservation(reservationId, reason);

    return {
      success: true,
      reservation_id: cancelledReservation.id,
      status: cancelledReservation.status
    };
  }

  async executeCronCancellation(reservationId: string, reason: string = "Payment timeout") {
    const reservation = await this.preorderRepo.findReservationById(reservationId);
    
    if (!reservation || reservation.status === "CANCELLED") {
      return null;
    }

    return await this.preorderRepo.cancelReservation(reservationId, reason);
  }
}
