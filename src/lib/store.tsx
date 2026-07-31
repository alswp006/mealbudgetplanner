import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getItem, setItem } from "@/lib/storage";
import { getMonthSpent, isOverBudget, pruneOldData } from "@/lib/calc";
import type { Budget, MealRecord, CheckinLog, MealSlot, MealCategory } from "@/lib/types";

const KEYS = {
  budgets: "mbp.budgets",
  meals: "mbp.meals",
  checkins: "mbp.checkins",
} as const;

export interface AppDataError {
  reason: "quota";
}

export interface RecordMealInput {
  date: string;
  slot: MealSlot;
  category: MealCategory;
  amount: number;
  memo: string;
}

export interface CheckinInput {
  date: string;
  paceBadge: "ahead" | "ontrack" | "over";
}

export interface AppDataActions {
  saveBudget: (input: { month: string; totalBudget: number }) => void;
  recordMeal: (input: RecordMealInput) => void;
  removeMeal: (id: string) => void;
  checkin: (input: CheckinInput) => void;
}

export interface AppDataValue {
  budget: Budget | null;
  meals: MealRecord[];
  checkins: CheckinLog[];
  loading: boolean;
  overBudget: { over: boolean; excess: number };
  error: AppDataError | null;
  actions: AppDataActions;
}

const AppDataContext = createContext<AppDataValue | null>(null);

function persist<T>(key: string, value: T): AppDataError | null {
  try {
    setItem(key, value);
    return null;
  } catch {
    return { reason: "quota" };
  }
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [checkins, setCheckins] = useState<CheckinLog[]>([]);
  const [error, setError] = useState<AppDataError | null>(null);

  useEffect(() => {
    Promise.resolve().then(() => {
      const budgets = getItem<Record<string, Budget>>(KEYS.budgets) ?? {};
      const storedMeals = getItem<MealRecord[]>(KEYS.meals) ?? [];
      const storedCheckins = getItem<Record<string, CheckinLog>>(KEYS.checkins) ?? {};

      const prunedMeals = pruneOldData(storedMeals, todayStr());
      if (prunedMeals.length !== storedMeals.length) {
        setItem(KEYS.meals, prunedMeals);
      }

      setBudget(budgets[currentMonth()] ?? null);
      setMeals(prunedMeals);
      setCheckins(Object.values(storedCheckins));
      setLoading(false);
    });
  }, []);

  const overBudget = useMemo(() => {
    if (!budget) return { over: false, excess: 0 };
    const spent = getMonthSpent(meals, budget.month);
    return isOverBudget(budget.totalBudget, spent);
  }, [budget, meals]);

  const actions: AppDataActions = useMemo(
    () => ({
      saveBudget: ({ month, totalBudget }) => {
        const now = new Date().toISOString();
        const budgets = getItem<Record<string, Budget>>(KEYS.budgets) ?? {};
        const existing = budgets[month];
        const next: Budget = {
          month,
          totalBudget,
          createdAt: existing ? existing.createdAt : now,
          updatedAt: now,
        };
        const err = persist(KEYS.budgets, { ...budgets, [month]: next });
        setError(err);
        if (err) return;
        setBudget(next);
      },
      recordMeal: (input) => {
        const record: MealRecord = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          ...input,
        };
        setMeals((prev) => {
          const next = [...prev, record];
          const err = persist(KEYS.meals, next);
          setError(err);
          return err ? prev : next;
        });
      },
      removeMeal: (id) => {
        setMeals((prev) => {
          const next = prev.filter((m) => m.id !== id);
          const err = persist(KEYS.meals, next);
          setError(err);
          return err ? prev : next;
        });
      },
      checkin: (input) => {
        const now = new Date().toISOString();
        const checkinsMap = getItem<Record<string, CheckinLog>>(KEYS.checkins) ?? {};
        const log: CheckinLog = { date: input.date, paceBadge: input.paceBadge, grantedAt: now };
        const nextMap = { ...checkinsMap, [input.date]: log };
        const err = persist(KEYS.checkins, nextMap);
        setError(err);
        if (err) return;
        setCheckins(Object.values(nextMap));
      },
    }),
    []
  );

  const value: AppDataValue = { budget, meals, checkins, loading, overBudget, error, actions };

  return React.createElement(AppDataContext.Provider, { value }, children);
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
