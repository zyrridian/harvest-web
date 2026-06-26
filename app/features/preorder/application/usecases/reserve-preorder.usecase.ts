import { IPreOrderRepository } from "../../domain/repositories/preorder.repository";
import { ReservePreOrderInputDTO, ReservePreOrderResponseDTO } from "../dtos/preorder.dto";

export class ReservePreOrderUseCase {
  constructor(private readonly preorderRepo: IPreOrderRepository) {}

  async execute(userId: string, input: ReservePreOrderInputDTO): Promise<ReservePreOrderResponseDTO> {
    const reservation = await this.preorderRepo.createReservation(
      userId,
      input.campaign_id,
      input.quantity,
      input.delivery_method,
      input.address_id
    );

    return {
      reservation_id: reservation.id,
      status: reservation.status,
      deposit_amount: reservation.depositAmount,
      total_price: reservation.totalPrice
    };
  }
}
