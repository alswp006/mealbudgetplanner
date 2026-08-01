import { useCallback, useEffect, useState } from 'react';
import type {
  MonthlyBudget,
  MealRecord,
  DailyCheckIn,
  AppFlags,
  RemainingResult,
  WeeklyStats,
  WriteResult,
} from '@/lib/types';
import * as storage from '@/lib/storage';
import * as calc from '@/lib/calc';

function monthOf(date: string): string {
  return date.slice(0, 7);
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const result = new Date(Date.UTC(y, m - 1, d + days));
  const yyyy = result.getUTCFullYear();
  const mm = String(result.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(result.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export interface AppData {
  budget: MonthlyBudget | null;
  meals: MealRecord[];
  checkins: DailyCheckIn[];
  flags: AppFlags;
  loading: boolean;
}

function readAppData(month: string): Omit<AppData, 'loading'> {
  return {
    budget: storage.getBudget(month),
    meals: storage.getMeals(),
    checkins: storage.getCheckIns(),
    flags: storage.getFlags(),
  };
}

export function useAppData(today: string) {
  const month = monthOf(today);
  const [data, setData] = useState<AppData>(() => ({
    budget: null,
    meals: [],
    checkins: [],
    flags: { onboardingSeen: false, lastSimulationDate: '' },
    loading: true,
  }));

  const refresh = useCallback(() => {
    setData({ ...readAppData(month), loading: false });
  }, [month]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveBudget = useCallback(
    (budget: MonthlyBudget): WriteResult => {
      const result = storage.setBudget(budget.month, budget);
      if (result.ok) refresh();
      return result;
    },
    [refresh]
  );

  const recordMeal = useCallback(
    (input: Omit<MealRecord, 'id' | 'createdAt'>): WriteResult => {
      const result = storage.addMeal(input);
      if (result.ok) refresh();
      return result;
    },
    [refresh]
  );

  const doCheckIn = useCallback(
    (input: Omit<DailyCheckIn, 'createdAt'>): WriteResult => {
      const result = storage.addCheckIn(input);
      if (result.ok) refresh();
      return result;
    },
    [refresh]
  );

  const markSimulationSeen = useCallback(
    (date: string): WriteResult => {
      const flags = storage.getFlags();
      const result = storage.setFlags({ ...flags, lastSimulationDate: date });
      if (result.ok) refresh();
      return result;
    },
    [refresh]
  );

  return {
    ...data,
    refresh,
    saveBudget,
    recordMeal,
    doCheckIn,
    markSimulationSeen,
  };
}

function calculateStreak(checkins: DailyCheckIn[], today: string): number {
  const dates = new Set(checkins.map((c) => c.date));
  let streak = 0;
  let cursor = today;
  while (dates.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export interface DerivedValues {
  remaining: RemainingResult;
  weeklyStats: WeeklyStats;
  overStatus: ReturnType<typeof calc.getOverBudgetStatus>;
  todayCheckedIn: boolean;
  streak: number;
  todayHasMeal: boolean;
}

export function useDerived(today: string): DerivedValues & { appData: ReturnType<typeof useAppData> } {
  const appData = useAppData(today);
  const month = monthOf(today);
  const budget: MonthlyBudget = appData.budget ?? {
    month,
    amount: 0,
    createdAt: 0,
    updatedAt: 0,
  };

  const remaining = calc.getRemainingPerMeal({
    budget,
    meals: appData.meals,
    month,
    today,
  });

  const weeklyStats = calc.getWeeklyStats({ meals: appData.meals, today });

  const spentThisMonth = appData.meals
    .filter((meal) => meal.date.startsWith(month))
    .reduce((total, meal) => total + meal.amount, 0);

  const overStatus = calc.getOverBudgetStatus({ budget: budget.amount, spent: spentThisMonth });

  const todayCheckedIn = appData.checkins.some((c) => c.date === today);
  const todayHasMeal = appData.meals.some((m) => m.date === today);
  const streak = calculateStreak(appData.checkins, today);

  return { remaining, weeklyStats, overStatus, todayCheckedIn, streak, todayHasMeal, appData };
}
