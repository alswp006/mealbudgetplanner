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

// Packet 0002: localStorage CRUD 헬퍼

export interface MealRecord {
  id: string;
  name: string;
  amount: number;
  date: string;
}

export interface Budget {
  amount: number;
  createdAt: number;
  updatedAt: number;
}

export interface CheckinLog {
  [key: string]: unknown;
}

export interface AppFlags {
  [key: string]: unknown;
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

function safeSet(key: string, value: unknown): { ok: true } | { ok: false; reason: "quota" } {
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

export function setBudget(month: string, data: { amount: number }): Budget {
  const budgets = safeGet<Record<string, Budget>>(STORAGE_KEYS.budgets, {});
  const now = Date.now();
  const existing = budgets[month];
  const budget: Budget = {
    amount: data.amount,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
  };
  budgets[month] = budget;
  safeSet(STORAGE_KEYS.budgets, budgets);
  return budget;
}

// Meal operations (array storage at 'mbp.meals')
export function addMeal(data: {
  name: string;
  amount: number;
  date: string;
}): { ok: boolean; id?: string; reason?: string } {
  const meals = safeGet<MealRecord[]>(STORAGE_KEYS.meals, []);
  const meal: MealRecord = { id: crypto.randomUUID(), ...data };
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

export function setCheckin(date: string, data: unknown): void {
  const checkins = safeGet<Record<string, CheckinLog>>(STORAGE_KEYS.checkins, {});
  checkins[date] = data as CheckinLog;
  safeSet(STORAGE_KEYS.checkins, checkins);
}

// Flags operations (single object at 'mbp.flags')
export function getFlags(): AppFlags {
  return safeGet<AppFlags>(STORAGE_KEYS.flags, {});
}

export function setFlags(data: AppFlags): void {
  const existing = getFlags();
  safeSet(STORAGE_KEYS.flags, { ...existing, ...data });
}
