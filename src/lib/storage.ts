import type {
  MealRecord,
  MonthlyBudget,
  DailyCheckIn,
  AppFlags,
  WriteResult,
} from '@/lib/types';

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

const MEALS_KEY = 'mbp_meals_v1';
const BUDGET_KEY = 'mbp_budget_v1';
const CHECKINS_KEY = 'mbp_checkins_v1';
const FLAGS_KEY = 'mbp_flags_v1';

const DEFAULT_FLAGS: AppFlags = { onboardingSeen: false, lastSimulationDate: '' };

export function safeParse<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    return fallback;
  }
}

function genId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to manual fallback
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function writeJson<T>(key: string, value: T): WriteResult {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch {
    return { ok: false, reason: 'QUOTA' };
  }
}

// ── Meals ────────────────────────────────────────────────

export function getMeals(): MealRecord[] {
  return safeParse<MealRecord[]>(MEALS_KEY, []);
}

export function addMeal(input: Omit<MealRecord, 'id' | 'createdAt'>): WriteResult {
  if (!Number.isInteger(input.amount) || input.amount < 1 || input.amount > 999999) {
    return { ok: false, reason: 'INVALID_AMOUNT' };
  }

  const record: MealRecord = {
    ...input,
    memo: (input.memo ?? '').slice(0, 40),
    id: genId(),
    createdAt: Date.now(),
  };

  const meals = getMeals();
  meals.unshift(record);
  return writeJson(MEALS_KEY, meals);
}

// ── Budget ───────────────────────────────────────────────

export function getBudget(month: string): MonthlyBudget | null {
  const budgets = safeParse<Record<string, MonthlyBudget>>(BUDGET_KEY, {});
  return budgets[month] ?? null;
}

export function setBudget(month: string, budget: MonthlyBudget): WriteResult {
  const budgets = safeParse<Record<string, MonthlyBudget>>(BUDGET_KEY, {});
  budgets[month] = budget;
  return writeJson(BUDGET_KEY, budgets);
}

// ── Check-ins ────────────────────────────────────────────

export function getCheckIns(): DailyCheckIn[] {
  return safeParse<DailyCheckIn[]>(CHECKINS_KEY, []);
}

export function addCheckIn(input: Omit<DailyCheckIn, 'createdAt'>): WriteResult {
  const record: DailyCheckIn = { ...input, createdAt: Date.now() };
  const checkIns = getCheckIns().filter((c) => c.date !== record.date);
  checkIns.unshift(record);
  return writeJson(CHECKINS_KEY, checkIns);
}

// ── Flags ────────────────────────────────────────────────

export function getFlags(): AppFlags {
  return safeParse<AppFlags>(FLAGS_KEY, DEFAULT_FLAGS);
}

export function setFlags(flags: AppFlags): WriteResult {
  return writeJson(FLAGS_KEY, flags);
}
