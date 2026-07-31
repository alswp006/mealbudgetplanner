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

// Packet 0002: localStorage CRUD 헬퍼 — 구현 대기
// @AI:WARN — Coder: Implement all functions below. Stub signatures only.

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

// Budget operations (keyed by month: "2026-08")
export function getBudget(month: string): Budget | null {
  throw new Error("TODO: implement getBudget");
}

export function setBudget(
  month: string,
  data: { amount: number }
): Budget {
  throw new Error("TODO: implement setBudget");
}

// Meal operations (array storage at 'mbp.meals')
export function addMeal(data: {
  name: string;
  amount: number;
  date: string;
}): { ok: boolean; id?: string; reason?: string } {
  throw new Error("TODO: implement addMeal");
}

export function deleteMeal(id: string): void {
  throw new Error("TODO: implement deleteMeal");
}

export function getMealsByMonth(month: string): MealRecord[] {
  throw new Error("TODO: implement getMealsByMonth");
}

// Checkin operations (keyed by date: "2026-08-01")
export function getCheckin(date: string): CheckinLog | null {
  throw new Error("TODO: implement getCheckin");
}

export function setCheckin(date: string, data: unknown): void {
  throw new Error("TODO: implement setCheckin");
}

// Flags operations (single object at 'mbp.flags')
export function getFlags(): AppFlags {
  throw new Error("TODO: implement getFlags");
}

export function setFlags(data: AppFlags): void {
  throw new Error("TODO: implement setFlags");
}
