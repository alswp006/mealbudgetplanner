// Meal classification types
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type MealCategory = 'delivery' | 'homemade' | 'dining_out';
export type PaceBadge = 'ahead' | 'ontrack' | 'over';

// Database schemas (localStorage records)
export interface MonthlyBudget {
  month: string; // "YYYY-MM"
  amount: number; // 원, 정수, 1 ~ 9,999,999
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
}

export interface MealRecord {
  id: string; // crypto.randomUUID()
  date: string; // "YYYY-MM-DD"
  mealType: MealType;
  category: MealCategory;
  amount: number; // 원, 정수, 1 ~ 999,999
  memo: string; // 최대 40자, 없으면 ""
  createdAt: number; // epoch ms
}

export interface DailyCheckIn {
  date: string; // "YYYY-MM-DD" (하루 1건, unique)
  badge: PaceBadge;
  spentSoFar: number; // 체크인 시점 이번 달 누적 지출(원)
  createdAt: number; // epoch ms
}

export interface AppFlags {
  onboardingSeen: boolean; // 최초 예산 미설정 안내 확인 여부
  lastSimulationDate: string; // "YYYY-MM-DD" | ""
}

// Calculation result types
export interface RemainingResult {
  dailyAllowance: number; // 오늘 하루 남은 끼니별 허용 금액
  todayRemaining: number; // 오늘 실제 남은 금액 (0 이상)
  isOver: boolean; // 초과 여부
}

export interface SavingResult {
  savingAmount: number; // 절약 가능액(원)
}

export interface WeeklyStats {
  totalByCategory: Record<MealCategory, number>; // 카테고리별 총액
  categoryPercentage: Record<MealCategory, number>; // 카테고리별 비율 (0~100)
  totalAmount: number; // 주간 총액
}

// Write operation result
export type WriteResult =
  | { ok: true }
  | { ok: false; reason: 'QUOTA' | 'INVALID_AMOUNT' };

// Navigation state contracts per route
export type RouteState = {
  '/': undefined;
  '/budget': undefined;
  '/record': { defaultMealType?: MealType } | undefined;
  '/stats': undefined;
  '/simulation': undefined;
};
