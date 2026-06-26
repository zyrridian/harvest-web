import { PreorderReservation, PreorderCampaign, Farmer } from "@/generated/prisma/client";

export type ScheduleReservation = PreorderReservation & {
  campaign: PreorderCampaign & {
    farmer: Farmer;
  };
  distance?: number;
};

export interface IHarvestScheduleRepository {
  getUserHarvestSchedule(userId: string, targetMonth: Date, latitude?: number, longitude?: number): Promise<ScheduleReservation[]>;
  updateReservationStatus(reservationId: string, status: string): Promise<PreorderReservation>;
  findReservationById(reservationId: string): Promise<PreorderReservation | null>;
}
