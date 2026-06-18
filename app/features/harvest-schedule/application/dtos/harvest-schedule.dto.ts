import { z } from "zod";

export interface HarvestScheduleItemDTO {
  id: string;
  title: string;
  farmer_name: string;
  distance: number;
  image_url: string;
  status_text: string;
  price: number;
  badges: string[];
  description_text: string;
  action_button_1: string;
  action_button_2: string;
  date_group: string;
  is_today: boolean;
  date_day_filter: string;
}

export interface HarvestScheduleDashboardResponseDTO {
  this_week_count: number;
  ready_today_count: number;
  this_month_count: number;
  items: HarvestScheduleItemDTO[];
}

export const PayDepositSchema = z.object({
  harvest_id: z.string(), // Order IDs or Harvest Product IDs? The prompt says "harvest_id": "2", which refers to the item id. In our case, the item id is the Order ID.
});

export type PayDepositInputDTO = z.infer<typeof PayDepositSchema>;

export interface PayDepositResponseDTO {
  harvest_id: string;
  status: string;
}

export const ArrangePickupSchema = z.object({
  harvest_id: z.string(),
  pickup_time: z.string(),
});

export type ArrangePickupInputDTO = z.infer<typeof ArrangePickupSchema>;

export interface ArrangePickupResponseDTO {
  harvest_id: string;
  pickup_time: string;
  status: string;
}
