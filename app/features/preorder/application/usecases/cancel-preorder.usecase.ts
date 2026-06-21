import { IPreOrderRepository } from "../../domain/repositories/preorder.repository";
import { AppError } from "@/core/errors";

export class CancelPreOrderUseCase {
  constructor(private readonly preorderRepo: IPreOrderRepository) {}

  async executeUserCancellation(userId: string, orderId: string): Promise<void> {
    const order = await this.preorderRepo.findOrderById(orderId);
    if (!order) throw AppError.notFound("Order not found");
    if (order.buyerId !== userId) throw AppError.forbidden("Not authorized to cancel this order");

    // 7 days before harvest cancellation policy
    if (order.status !== "pending_payment" && order.status !== "confirmed") {
      throw AppError.badRequest("Order cannot be cancelled in its current state");
    }

    const item = (order as any).items?.[0];
    const harvestDate = item?.product?.harvestDate;
    
    if (harvestDate) {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      if (harvestDate < sevenDaysFromNow) {
        throw AppError.badRequest("Cannot cancel reservation less than 7 days before harvest");
      }
    }

    await this.preorderRepo.cancelReservation(orderId, "cancelled_by_user");
  }

  async executeCronCancellation(): Promise<{ cancelledCount: number }> {
    // 24 hours expiration for unpaid reservations
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() - 24);

    const unpaidOrders = await this.preorderRepo.getUnpaidReservations(expirationDate);
    
    let cancelledCount = 0;
    for (const order of unpaidOrders) {
      try {
        await this.preorderRepo.cancelReservation(order.id, "auto_cancelled_unpaid");
        cancelledCount++;
      } catch (err) {
        console.error(`Failed to cancel order ${order.id}:`, err);
      }
    }

    return { cancelledCount };
  }
}
