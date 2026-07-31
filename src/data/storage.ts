import {
  getBudget,
  setBudget,
  getMealsByMonth,
  addMeal as addMealRaw,
  getCheckin,
  setCheckin,
  getFlags,
  setFlags,
  type AddMealInput,
} from "@/lib/storage";
import type { MealRecord } from "@/lib/types";

export {
  getBudget,
  setBudget,
  getMealsByMonth,
  getCheckin,
  setCheckin,
  getFlags,
  setFlags,
};

export function addMeal(
  input: AddMealInput
): MealRecord | { ok: false; reason: "quota" } {
  const result = addMealRaw(input);
  if (!result.ok) {
    return { ok: false, reason: "quota" };
  }
  const month = input.date.slice(0, 7);
  const saved = getMealsByMonth(month).find((m) => m.id === result.id);
  return saved as MealRecord;
}
