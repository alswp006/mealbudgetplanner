import type { MealRecord, MealCategory } from "@/lib/types";

const CATEGORIES: MealCategory[] = ["main", "side", "drink", "snack"];
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateUTC(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function getMonthSpent(records: MealRecord[], month: string): number {
  return records
    .filter((r) => r.date.startsWith(month))
    .reduce((sum, r) => sum + r.amount, 0);
}

export function getSpentByCategory(
  records: MealRecord[],
  month: string
): {
  total: number;
  byCategory: Record<MealCategory, { amount: number; ratio: number }>;
} {
  const monthRecords = records.filter((r) => r.date.startsWith(month));
  const total = monthRecords.reduce((sum, r) => sum + r.amount, 0);

  const byCategory = CATEGORIES.reduce((acc, category) => {
    const amount = monthRecords
      .filter((r) => r.category === category)
      .reduce((sum, r) => sum + r.amount, 0);
    acc[category] = { amount, ratio: total > 0 ? amount / total : 0 };
    return acc;
  }, {} as Record<MealCategory, { amount: number; ratio: number }>);

  return { total, byCategory };
}

export function getRemainingMeals(
  today: string,
  dayN: number,
  totalDaysInMonth: number
): { remainingMeals: number; remainingDays: number } {
  const remainingDays = totalDaysInMonth - dayN;
  return { remainingDays, remainingMeals: remainingDays * 3 };
}

export function getAllowancePerMeal(
  remainingBudget: number,
  remainingMeals: number
): number | null {
  if (remainingMeals <= 0) return null;
  return Math.floor(remainingBudget / remainingMeals);
}

export function calcPaceBadge(
  budget: number,
  spent: number,
  dayN: number,
  totalDays: number
): "ahead" | "ontrack" | "over" {
  const expectedPace = budget * (dayN / totalDays);
  if (spent < expectedPace * 0.95) return "ahead";
  if (spent > expectedPace * 1.05) return "over";
  return "ontrack";
}

export function getRecent7DaysStats(
  records: MealRecord[],
  today: string
): { total: number; average: number; count: number } {
  const todayTs = parseDateUTC(today);
  const recent = records.filter((r) => {
    const diffDays = (todayTs - parseDateUTC(r.date)) / DAY_MS;
    return diffDays >= 0 && diffDays <= 7;
  });

  const total = recent.reduce((sum, r) => sum + r.amount, 0);
  const count = recent.length;
  return { total, count, average: count > 0 ? total / count : 0 };
}

export function isOverBudget(
  budget: number,
  spent: number
): { over: boolean; excess: number } {
  const excess = Math.max(0, spent - budget);
  return { over: excess > 0, excess };
}

export function pruneOldData(
  records: MealRecord[],
  today: string
): MealRecord[] {
  const [y, m, d] = today.split("-").map(Number);
  const cutoff = Date.UTC(y, m - 1 - 13, d);
  return records.filter((r) => parseDateUTC(r.date) >= cutoff);
}
