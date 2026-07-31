import React, { createContext, useContext } from "react";
import type { Budget, MealRecord, CheckinLog, MealSlot, MealCategory } from "@/lib/types";

// STUB — packet-0004 RED phase. Only exists to keep `tsc` green while
// src/__tests__/packet-0004.test.ts defines the real behavioral contract.
// The Coder MUST replace every action body below with a real
// localStorage-backed implementation (see .ai-factory/spec.md F1/F2/F3/F4).
// Until then, every action throws and `loading` never resolves — tests fail.

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

const NOT_IMPLEMENTED = "packet-0004: AppDataProvider is not implemented yet";

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const value: AppDataValue = {
    budget: null,
    meals: [],
    checkins: [],
    loading: true,
    overBudget: { over: false, excess: 0 },
    error: null,
    actions: {
      saveBudget: () => { throw new Error(NOT_IMPLEMENTED); },
      recordMeal: () => { throw new Error(NOT_IMPLEMENTED); },
      removeMeal: () => { throw new Error(NOT_IMPLEMENTED); },
      checkin: () => { throw new Error(NOT_IMPLEMENTED); },
    },
  };

  return React.createElement(AppDataContext.Provider, { value }, children);
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
