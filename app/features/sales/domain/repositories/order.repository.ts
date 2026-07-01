export interface IOrderRepository {
  findOrders(where: Record<string, unknown>, skip: number, limit: number): Promise<any[]>;
  countOrders(where: Record<string, unknown>): Promise<number>;
  findOrderById(id: string): Promise<any>;
  findOrderWithTracking(id: string, buyerId: string): Promise<any>;
  updateOrder(id: string, data: any): Promise<any>;
  
  // For CreateOrderUseCase
  getUser(userId: string): Promise<any>;
  getCartItemsForOrder(userId: string, cartItemIds: string[]): Promise<any[]>;
  createOrdersInTransaction(
    userId: string,
    itemsBySeller: Record<string, any[]>,
    payload: any,
    orderLimit: number
  ): Promise<any[]>;
  updateTrackingNumber(orderId: string, trackingNumber: string): Promise<void>;

  // For Tracking
  getStopAheadCount(routeId: string, stopOrder: number): Promise<number>;
}
