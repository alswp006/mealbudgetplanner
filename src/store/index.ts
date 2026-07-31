import {
  getBudget,
  setBudget,
  addMeal,
  deleteMeal,
  getMealsByMonth,
  getCheckin,
  setCheckin,
  getFlags,
  setFlags,
} from "@/lib/storage";
import { getSpentByCategory } from "@/lib/calc";
import type { MealCategory } from "@/lib/types";

export {
  getBudget,
  setBudget,
  addMeal,
  deleteMeal,
  getMealsByMonth,
  getCheckin,
  setCheckin,
  getFlags,
  setFlags,
};

export type {
  Budget,
  MealRecord,
  CheckinLog,
  AppFlags,
  MealSlot,
  MealCategory,
  SaveResult,
} from "@/lib/types";

export function getMonthSpent(month: string): number {
  return getMealsByMonth(month).reduce((sum, m) => sum + m.amount, 0);
}

export function getCategoryTotals(
  month: string
): Record<MealCategory, { amount: number; ratio: number }> {
  return getSpentByCategory(getMealsByMonth(month), month).byCategory;
}

export function getRemaining(month: string): number {
  const budget = getBudget(month);
  return (budget?.totalBudget ?? 0) - getMonthSpent(month);
}
