// YYYY-MM format (e.g., "2026-08")
type MonthString = string;

// YYYY-MM-DD format (e.g., "2026-08-01")
type DateString = string;

// ISO datetime format (e.g., "2026-08-01T12:30:00Z")
type DateTimeString = string;

// Amount in integer KRW (e.g., 3000000 = ₩3,000,000)
type AmountKRW = number;

export interface Budget {
  month: MonthString;
  totalBudget: AmountKRW;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

export type MealSlot = "breakfast" | "lunch" | "dinner";

export type MealCategory = "delivery" | "dining_out" | "home_cooked";

export interface MealRecord {
  id: string;
  date: DateString;
  slot: MealSlot;
  category: MealCategory;
  amount: AmountKRW;
  memo: string;
  createdAt: DateTimeString;
}

export interface CheckinLog {
  date: DateString;
  paceBadge: "ahead" | "ontrack" | "over";
  grantedAt: DateTimeString;
}

export interface AppFlags {
  aiNoticeAcknowledged: boolean;
  overBudgetAlertedMonth?: MonthString;
}

export type SaveResult = { ok: true } | { ok: false; reason: "quota" | "parse" };

export interface RouteState {
  "/": undefined;
  "/budget": { editMode?: boolean } | undefined;
  "/record": { date?: string } | undefined;
  "/records": undefined;
  "/analysis": undefined;
  "/simulate": undefined;
}

export interface SimulateRequest {
  month: MonthString;
  totalBudget: AmountKRW;
  spentByCategory: {
    delivery: AmountKRW;
    dining_out: AmountKRW;
    home_cooked: AmountKRW;
  };
  recordCount: number;
}

export interface SimulateResponse {
  monthlySaving: AmountKRW;
  targetDeliveryRatio: number;
  aiComment: string;
  generatedByAI: true;
}

export interface ApiError {
  error: string;
}
