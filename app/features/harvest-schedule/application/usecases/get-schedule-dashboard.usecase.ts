import { IHarvestScheduleRepository } from "../../domain/repositories/harvest-schedule.repository";
import { HarvestScheduleDashboardResponseDTO, HarvestScheduleItemDTO } from "../dtos/harvest-schedule.dto";

export class GetHarvestScheduleDashboardUseCase {
  constructor(private readonly harvestRepo: IHarvestScheduleRepository) {}

  async execute(userId: string, targetMonth: string, latitude?: number, longitude?: number): Promise<HarvestScheduleDashboardResponseDTO> {
    const [year, month] = targetMonth.split("-").map(Number);
    const dateObj = new Date(year, month - 1, 1);
    
    const orders = await this.harvestRepo.getUserHarvestSchedule(userId, dateObj, latitude, longitude);

    const now = new Date();
    let thisWeekCount = 0;
    let readyTodayCount = 0;

    const items: HarvestScheduleItemDTO[] = orders.map(order => {
      const item = order.items[0];
      const product = item?.product;
      const harvestDate = product?.harvestDate || new Date();
      
      const isToday = this.isSameDay(now, harvestDate);
      if (isToday) readyTodayCount++;
      
      if (this.isThisWeek(now, harvestDate)) {
        thisWeekCount++;
      }

      let statusText = "Upcoming";
      if (isToday) statusText = "Now";
      else if (harvestDate < now) statusText = "Ready";

      const badges = [];
      if (order.status === "confirmed" || order.paymentStatus === "paid") badges.push("Pre-ordered");
      if (isToday || harvestDate <= now) badges.push("Ready to pick");

      let action1 = "Chat\\nfarmer";
      let action2 = "Pay\\ndeposit";
      if (order.status === "confirmed" || order.paymentStatus === "paid") {
        action2 = "Arrange\\npickup";
      }
      if (order.status === "pickup_arranged") {
        action2 = "Pickup\\nArranged";
      }

      const descText = `${item?.quantity || 0} ${product?.unit || ""} reserved · ` + 
        (order.paymentStatus === "paid" ? `paid Rp ${order.totalAmount} deposit` : `Rp ${order.totalAmount} to pay`);

      const dateGroup = isToday ? `TODAY — ${this.formatShortDate(harvestDate)}` : this.formatShortDate(harvestDate);

      return {
        id: order.id,
        title: product?.name || "Unknown Product",
        farmer_name: product?.seller?.farmer?.name || product?.seller?.name || "Unknown Farmer",
        distance: (order as any).distance || 0,
        image_url: product?.images?.[0]?.url || "🍅",
        status_text: statusText,
        price: product?.price || 0,
        badges,
        description_text: descText,
        action_button_1: action1,
        action_button_2: action2,
        date_group: dateGroup.toUpperCase(),
        is_today: isToday,
        date_day_filter: harvestDate.getDate().toString()
      };
    });

    return {
      this_week_count: thisWeekCount,
      ready_today_count: readyTodayCount,
      this_month_count: orders.length,
      items
    };
  }

  private isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  private isThisWeek(now: Date, d: Date): boolean {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0,0,0,0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23,59,59,999);

    return d >= startOfWeek && d <= endOfWeek;
  }

  private formatShortDate(d: Date): string {
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  }
}
