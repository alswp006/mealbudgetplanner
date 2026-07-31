import type {
  Budget,
  MealRecord,
  CheckinLog,
  AppFlags,
  MealSlot,
  MealCategory,
  SaveResult,
} from "@/lib/types";

export type { Budget, MealRecord, CheckinLog, AppFlags };

export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

const STORAGE_KEYS = {
  budgets: "mbp.budgets",
  meals: "mbp.meals",
  checkins: "mbp.checkins",
  flags: "mbp.flags",
} as const;

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): SaveResult {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.name === "QuotaExceededError") {
      return { ok: false, reason: "quota" };
    }
    return { ok: false, reason: "quota" };
  }
}

// Budget operations (keyed by month: "2026-08")
export function getBudget(month: string): Budget | null {
  const budgets = safeGet<Record<string, Budget>>(STORAGE_KEYS.budgets, {});
  return budgets[month] ?? null;
}

export function setBudget(month: string, totalBudget: number): Budget {
  const budgets = safeGet<Record<string, Budget>>(STORAGE_KEYS.budgets, {});
  const now = new Date().toISOString();
  const existing = budgets[month];
  const budget: Budget = {
    month,
    totalBudget,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
  };
  budgets[month] = budget;
  safeSet(STORAGE_KEYS.budgets, budgets);
  return budget;
}

// Meal operations (array storage at 'mbp.meals')
export interface AddMealInput {
  date: string;
  slot: MealSlot;
  category: MealCategory;
  amount: number;
  memo: string;
}

export function addMeal(input: AddMealInput): { ok: boolean; id?: string; reason?: string } {
  const meals = safeGet<MealRecord[]>(STORAGE_KEYS.meals, []);
  const meal: MealRecord = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };
  const result = safeSet(STORAGE_KEYS.meals, [...meals, meal]);
  if (!result.ok) {
    return { ok: false, reason: result.reason };
  }
  return { ok: true, id: meal.id };
}

export function deleteMeal(id: string): void {
  const meals = safeGet<MealRecord[]>(STORAGE_KEYS.meals, []);
  safeSet(STORAGE_KEYS.meals, meals.filter((m) => m.id !== id));
}

export function getMealsByMonth(month: string): MealRecord[] {
  const meals = safeGet<MealRecord[]>(STORAGE_KEYS.meals, []);
  return meals.filter((m) => m.date.startsWith(month));
}

// Checkin operations (keyed by date: "2026-08-01")
export function getCheckin(date: string): CheckinLog | null {
  const checkins = safeGet<Record<string, CheckinLog>>(STORAGE_KEYS.checkins, {});
  return checkins[date] ?? null;
}

export function setCheckin(date: string, paceBadge: CheckinLog["paceBadge"]): CheckinLog {
  const checkins = safeGet<Record<string, CheckinLog>>(STORAGE_KEYS.checkins, {});
  const log: CheckinLog = { date, paceBadge, grantedAt: new Date().toISOString() };
  checkins[date] = log;
  safeSet(STORAGE_KEYS.checkins, checkins);
  return log;
}

// Flags operations (single object at 'mbp.flags')
export function getFlags(): AppFlags {
  return safeGet<AppFlags>(STORAGE_KEYS.flags, { aiNoticeAcknowledged: false });
}

export function setFlags(data: Partial<AppFlags>): void {
  const existing = getFlags();
  safeSet(STORAGE_KEYS.flags, { ...existing, ...data });
}
