import MidtransClient from "midtrans-client";

// const isProduction = process.env.NODE_ENV === "production";
const isProduction = false; // Forced to sandbox for testing

export const snap = new MidtransClient.Snap({
  isProduction,
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.MIDTRANS_CLIENT_KEY!,
});

export const coreApi = new MidtransClient.CoreApi({
  isProduction,
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.MIDTRANS_CLIENT_KEY!,
});

export const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY!;
export const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY!;
