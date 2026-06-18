import { z } from "zod";

export interface AvailableHarvestDTO {
  id: string;
  title: string;
  farmer_name: string;
  distance: string;
  image_url: string;
  price: number;
  unit: string;
  booked_quantity: number;
  total_quantity: number;
  days_left: number;
  status: string;
}

export interface ActiveReservationDTO {
  id: string;
  title: string;
  quantity_str: string;
  farmer_name: string;
  days_to_harvest: number;
  image_url: string;
  status: string;
}

export interface PreOrderDashboardResponseDTO {
  active_harvests_count: number;
  your_reservations_count: number;
  avg_savings: string;
  available_harvests: AvailableHarvestDTO[];
  active_reservations: ActiveReservationDTO[];
}

export const ReservePreOrderSchema = z.object({
  harvest_id: z.string().uuid(),
  quantity: z.coerce.number().min(1),
});

export type ReservePreOrderInputDTO = z.infer<typeof ReservePreOrderSchema>;

export interface ReservePreOrderResponseDTO {
  reservation_id: string;
  status: string;
}
