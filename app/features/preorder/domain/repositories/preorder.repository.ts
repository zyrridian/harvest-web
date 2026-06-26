import { PreorderCampaign, PreorderReservation, Farmer } from "@/generated/prisma/client";

export type CampaignWithFarmer = PreorderCampaign & {
  farmer: Farmer;
};

export type ReservationWithCampaign = PreorderReservation & {
  campaign: CampaignWithFarmer;
};

export interface IPreOrderRepository {
  // Consumer Side
  getAvailableCampaigns(latitude?: number, longitude?: number): Promise<CampaignWithFarmer[]>;
  getUserReservations(userId: string): Promise<ReservationWithCampaign[]>;
  createReservation(userId: string, campaignId: string, quantity: number, deliveryMethod: string, addressId?: string): Promise<PreorderReservation>;
  findCampaignById(campaignId: string): Promise<PreorderCampaign | null>;
  findReservationById(reservationId: string): Promise<PreorderReservation | null>;
  cancelReservation(reservationId: string, reason?: string): Promise<PreorderReservation>;
  updateReservationStatus(reservationId: string, status: string, paymentMethod?: string): Promise<PreorderReservation>;

  // Farmer Side
  createCampaign(farmerId: string, data: Partial<PreorderCampaign>): Promise<PreorderCampaign>;
  updateCampaignStatus(campaignId: string, status: string): Promise<PreorderCampaign>;
  getFarmerCampaigns(farmerId: string): Promise<PreorderCampaign[]>;
}
