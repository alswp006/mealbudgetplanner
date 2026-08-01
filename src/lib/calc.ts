import type {
  MealRecord,
  MonthlyBudget,
  PaceBadge,
  SavingResult,
  WeeklyStats,
  RemainingResult,
  MealCategory,
} from '@/lib/types';

function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function dayOfMonth(date: string): number {
  return Number(date.split('-')[2]);
}

function sumMealsForMonth(meals: MealRecord[], month: string): number {
  return meals
    .filter((meal) => meal.date.startsWith(month))
    .reduce((total, meal) => total + meal.amount, 0);
}

function sumMealsForDate(meals: MealRecord[], date: string): number {
  return meals
    .filter((meal) => meal.date === date)
    .reduce((total, meal) => total + meal.amount, 0);
}

export function getRemainingPerMeal(params: {
  budget: MonthlyBudget;
  meals: MealRecord[];
  month: string;
  today: string;
}): RemainingResult {
  const { budget, meals, month, today } = params;

  if (!budget.amount || budget.amount <= 0) {
    return { dailyAllowance: 0, todayRemaining: 0, isOver: false };
  }

  const remainingDays = daysInMonth(month) - dayOfMonth(today) + 1;
  const spentThisMonth = sumMealsForMonth(meals, month);
  const dailyAllowance = Math.floor((budget.amount - spentThisMonth) / remainingDays);
  const todaySpent = sumMealsForDate(meals, today);
  const rawRemaining = dailyAllowance - todaySpent;

  return {
    dailyAllowance,
    todayRemaining: Math.max(rawRemaining, 0),
    isOver: rawRemaining < 0,
  };
}

export function getPaceBadge(params: {
  budget: number;
  spent: number;
  month: string;
  today: string;
}): PaceBadge {
  const { budget, spent, month, today } = params;
  const elapsedDays = dayOfMonth(today);
  const totalDays = daysInMonth(month);
  const ideal = budget * (elapsedDays / totalDays);

  if (spent <= ideal * 0.9) return 'ahead';
  if (spent <= ideal * 1.1) return 'ontrack';
  return 'over';
}

export function getSaving(params: { meals: MealRecord[]; today: string }): SavingResult {
  const { meals, today } = params;
  const start = addDays(today, -29);

  const deliveryTotal = meals
    .filter((meal) => meal.category === 'delivery' && meal.date >= start && meal.date <= today)
    .reduce((total, meal) => total + meal.amount, 0);

  return { savingAmount: Math.round(deliveryTotal * 0.3) };
}

export function getWeeklyStats(params: { meals: MealRecord[]; today: string }): WeeklyStats {
  const { meals, today } = params;
  const start = addDays(today, -7);

  const recent = meals.filter((meal) => meal.date >= start && meal.date <= today);

  const totalByCategory: Record<MealCategory, number> = {
    delivery: 0,
    homemade: 0,
    dining_out: 0,
  };

  for (const meal of recent) {
    totalByCategory[meal.category] += meal.amount;
  }

  const totalAmount = totalByCategory.delivery + totalByCategory.homemade + totalByCategory.dining_out;

  const categoryPercentage: Record<MealCategory, number> = {
    delivery: totalAmount > 0 ? Math.round((totalByCategory.delivery / totalAmount) * 100) : 0,
    homemade: totalAmount > 0 ? Math.round((totalByCategory.homemade / totalAmount) * 100) : 0,
    dining_out: totalAmount > 0 ? Math.round((totalByCategory.dining_out / totalAmount) * 100) : 0,
  };

  return { totalByCategory, categoryPercentage, totalAmount };
}

export function getOverBudgetStatus(params: { budget: number; spent: number }):
  | { status: 'normal' }
  | { status: 'approaching'; remainingBudget: number }
  | { status: 'exceeded'; overAmount: number } {
  const { budget, spent } = params;

  if (budget <= 0) return { status: 'normal' };

  if (spent >= budget) {
    return { status: 'exceeded', overAmount: spent - budget };
  }

  if (spent >= budget * 0.9) {
    return { status: 'approaching', remainingBudget: budget - spent };
  }

  return { status: 'normal' };
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const result = new Date(Date.UTC(y, m - 1, d + days));
  const yyyy = result.getUTCFullYear();
  const mm = String(result.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(result.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
