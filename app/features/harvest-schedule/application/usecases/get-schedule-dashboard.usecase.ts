import { IHarvestScheduleRepository } from "../../domain/repositories/harvest-schedule.repository";
import { HarvestScheduleDashboardResponseDTO, HarvestScheduleItemDTO } from "../dtos/harvest-schedule.dto";

export class GetHarvestScheduleDashboardUseCase {
  constructor(private readonly harvestRepo: IHarvestScheduleRepository) {}

  async execute(userId: string, targetMonth: string, latitude?: number, longitude?: number): Promise<HarvestScheduleDashboardResponseDTO> {
    const [year, month] = targetMonth.split("-").map(Number);
    const dateObj = new Date(year, month - 1, 1);
    
    const reservations = await this.harvestRepo.getUserHarvestSchedule(userId, dateObj, latitude, longitude);

    const now = new Date();
    let thisWeekCount = 0;
    let readyTodayCount = 0;

    const items: HarvestScheduleItemDTO[] = reservations.map(res => {
      const campaign = res.campaign;
      const harvestDate = campaign?.estimatedHarvestDate || new Date();
      
      const isToday = this.isSameDay(now, harvestDate);
      if (isToday) readyTodayCount++;
      
      if (this.isThisWeek(now, harvestDate)) {
        thisWeekCount++;
      }

      let statusText = "Upcoming";
      if (res.status === "COMPLETED") statusText = "Completed";
      else if (isToday) statusText = "Now";
      else if (harvestDate < now) statusText = "Ready";

      const badges = [];
      if (res.status === "COMPLETED") badges.push("Completed");
      else if (res.status === "DEPOSIT_PAID" || res.status === "FULLY_PAID") badges.push("Pre-ordered");
      
      if (isToday && res.status !== "COMPLETED") badges.push("Ready today");
      else if (harvestDate <= now && res.status !== "COMPLETED") badges.push("Ready to pick");
      
      if (res.status === "PENDING_DEPOSIT") badges.push("Pending confirmation");
      
      const oneDay = 24 * 60 * 60 * 1000;
      if (res.createdAt && (now.getTime() - res.createdAt.getTime()) < oneDay && res.status !== "COMPLETED") {
        badges.push("Just reserved");
      }

      let action1 = "Chat\\nfarmer";
      let action2 = "Pay\\ndeposit";
      if (res.status === "DEPOSIT_PAID" || res.status === "FULLY_PAID") {
        action2 = "Arrange\\npickup";
      }
      if (res.status === "COMPLETED") {
        action1 = "";
        action2 = "Completed";
      }

      const descText = `${res.quantity || 0} ${campaign?.unit || ""} reserved · ` + 
        (res.status === "DEPOSIT_PAID" || res.status === "FULLY_PAID" ? `paid Rp ${res.depositAmount} deposit` : `Rp ${res.depositAmount} deposit to pay`);

      const dateGroup = isToday ? `TODAY — ${this.formatShortDate(harvestDate)}` : this.formatShortDate(harvestDate);

      return {
        id: res.id,
        title: campaign?.title || "Unknown Campaign",
        farmer_name: campaign?.farmer?.name || "Unknown Farmer",
        distance: (res as any).distance || 0,
        image_url: "🍅", // Could add to campaign later
        status_text: statusText,
        price: campaign?.pricePerUnit || 0,
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
      this_month_count: reservations.length,
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
