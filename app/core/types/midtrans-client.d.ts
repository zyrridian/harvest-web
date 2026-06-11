declare module "midtrans-client" {
  interface MidtransConfig {
    isProduction: boolean;
    serverKey: string;
    clientKey?: string;
  }

  interface TransactionDetails {
    order_id: string;
    gross_amount: number;
  }

  interface ItemDetail {
    id: string;
    price: number;
    quantity: number;
    name: string;
  }

  interface CustomerDetails {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  }

  interface SnapCallbacks {
    finish?: string;
    error?: string;
    pending?: string;
  }

  interface SnapParameter {
    transaction_details: TransactionDetails;
    item_details?: ItemDetail[];
    customer_details?: CustomerDetails;
    enabled_payments?: string[];
    callbacks?: SnapCallbacks;
  }

  interface SnapResponse {
    token: string;
    redirect_url: string;
  }

  class Snap {
    constructor(config: MidtransConfig);
    createTransaction(parameter: SnapParameter): Promise<SnapResponse>;
  }

  interface CoreApiConfig extends MidtransConfig {}

  class CoreApi {
    constructor(config: CoreApiConfig);
    transaction: {
      status(orderId: string): Promise<any>;
      cancel(orderId: string): Promise<any>;
      refund(orderId: string, parameter?: any): Promise<any>;
    };
  }

  export { Snap, CoreApi };
}
