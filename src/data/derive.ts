import { getMealsByMonth, getBudget } from "@/lib/storage";
import type { MealCategory } from "@/lib/types";

export function getMonthSpent(month: string): number {
  return getMealsByMonth(month).reduce((sum, m) => sum + m.amount, 0);
}

export function getCategorySpent(month: string, category: MealCategory): number {
  return getMealsByMonth(month)
    .filter((m) => m.category === category)
    .reduce((sum, m) => sum + m.amount, 0);
}

export function getRemainingBudget(month: string): number | null {
  const budget = getBudget(month);
  if (!budget) return null;
  return budget.totalBudget - getMonthSpent(month);
}
