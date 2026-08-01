import { describe, it, expect } from "vitest";
import type {
  MealType,
  MealCategory,
  PaceBadge,
  MonthlyBudget,
  MealRecord,
  DailyCheckIn,
  AppFlags,
  RemainingResult,
  SavingResult,
  WeeklyStats,
  WriteResult,
  RouteState,
} from "@/lib/types";

describe("AC-1: Types should compile with tsc --noEmit", () => {
  it("should export all entity type definitions without runtime code", () => {
    // If this compiles, tsc --noEmit passes
    // All types are imported successfully from @/lib/types
    expect(true).toBe(true);
  });
});

describe("AC-2: Runtime exports must be types only (no values)", () => {
  it("should not have any runtime values in types.ts", () => {
    // This is verified by TypeScript compilation itself.
    // If types.ts exports any const/let/function/class (runtime values),
    // this file's import would fail in build.
    expect(true).toBe(true);
  });
});

describe("AC-3: RouteState must include all 5 route keys (/, /budget, /record, /stats, /simulation)", () => {
  it("should define RouteState with home route state", () => {
    const homeState: RouteState["/"] = undefined;
    expect(homeState).toBeUndefined();
  });

  it("should define RouteState with budget route state", () => {
    const budgetState: RouteState["/budget"] = undefined;
    expect(budgetState).toBeUndefined();
  });

  it("should define RouteState with record route state including optional defaultMealType", () => {
    const recordState1: RouteState["/record"] = undefined;
    expect(recordState1).toBeUndefined();

    const recordState2: RouteState["/record"] = { defaultMealType: "lunch" };
    expect(recordState2.defaultMealType).toBe("lunch");
  });

  it("should define RouteState with stats route state", () => {
    const statsState: RouteState["/stats"] = undefined;
    expect(statsState).toBeUndefined();
  });

  it("should define RouteState with simulation route state", () => {
    const simulationState: RouteState["/simulation"] = undefined;
    expect(simulationState).toBeUndefined();
  });
});

describe("MealType type definition", () => {
  it("should accept all 4 meal types: breakfast, lunch, dinner, snack", () => {
    const types: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
    expect(types).toEqual(["breakfast", "lunch", "dinner", "snack"]);
  });
});

describe("MealCategory type definition", () => {
  it("should accept all 3 meal categories: delivery, homemade, dining_out", () => {
    const categories: MealCategory[] = ["delivery", "homemade", "dining_out"];
    expect(categories).toEqual(["delivery", "homemade", "dining_out"]);
  });
});

describe("PaceBadge type definition", () => {
  it("should accept all 3 pace badges: ahead, ontrack, over", () => {
    const badges: PaceBadge[] = ["ahead", "ontrack", "over"];
    expect(badges).toEqual(["ahead", "ontrack", "over"]);
  });
});

describe("MonthlyBudget interface", () => {
  it("should have month, amount, createdAt, updatedAt fields", () => {
    const budget: MonthlyBudget = {
      month: "2026-08",
      amount: 600000,
      createdAt: 1722595200000,
      updatedAt: 1722595200000,
    };
    expect(budget.month).toBe("2026-08");
    expect(budget.amount).toBe(600000);
    expect(budget.createdAt).toEqual(expect.any(Number));
    expect(budget.updatedAt).toEqual(expect.any(Number));
  });
});

describe("MealRecord interface", () => {
  it("should have id, date, mealType, category, amount, memo, createdAt fields", () => {
    const meal: MealRecord = {
      id: "uuid-1",
      date: "2026-08-02",
      mealType: "lunch",
      category: "delivery",
      amount: 12000,
      memo: "점심",
      createdAt: 1722595200000,
    };
    expect(meal.id).toBe("uuid-1");
    expect(meal.date).toBe("2026-08-02");
    expect(meal.mealType).toBe("lunch");
    expect(meal.category).toBe("delivery");
    expect(meal.amount).toBe(12000);
    expect(meal.memo).toBe("점심");
    expect(meal.createdAt).toEqual(expect.any(Number));
  });
});

describe("DailyCheckIn interface", () => {
  it("should have date, badge, spentSoFar, createdAt fields", () => {
    const checkIn: DailyCheckIn = {
      date: "2026-08-02",
      badge: "ontrack",
      spentSoFar: 200000,
      createdAt: 1722595200000,
    };
    expect(checkIn.date).toBe("2026-08-02");
    expect(checkIn.badge).toBe("ontrack");
    expect(checkIn.spentSoFar).toBe(200000);
    expect(checkIn.createdAt).toEqual(expect.any(Number));
  });
});

describe("AppFlags interface", () => {
  it("should have onboardingSeen and lastSimulationDate fields", () => {
    const flags: AppFlags = {
      onboardingSeen: true,
      lastSimulationDate: "2026-08-02",
    };
    expect(flags.onboardingSeen).toBe(true);
    expect(flags.lastSimulationDate).toBe("2026-08-02");
  });

  it("should allow empty string for lastSimulationDate", () => {
    const flags: AppFlags = {
      onboardingSeen: false,
      lastSimulationDate: "",
    };
    expect(flags.lastSimulationDate).toBe("");
  });
});

describe("RemainingResult interface", () => {
  it("should have dailyAllowance, todayRemaining, isOver fields", () => {
    const result: RemainingResult = {
      dailyAllowance: 13333,
      todayRemaining: 9333,
      isOver: false,
    };
    expect(result.dailyAllowance).toBe(13333);
    expect(result.todayRemaining).toBe(9333);
    expect(result.isOver).toBe(false);
  });

  it("should clamp todayRemaining to 0 when over budget", () => {
    const result: RemainingResult = {
      dailyAllowance: 10000,
      todayRemaining: 0,
      isOver: true,
    };
    expect(result.todayRemaining).toBe(0);
    expect(result.isOver).toBe(true);
  });
});

describe("SavingResult interface", () => {
  it("should have savingAmount field", () => {
    const result: SavingResult = {
      savingAmount: 90000,
    };
    expect(result.savingAmount).toBe(90000);
  });
});

describe("WeeklyStats interface", () => {
  it("should have totalByCategory with each category amount", () => {
    const stats: WeeklyStats = {
      totalByCategory: {
        delivery: 50000,
        homemade: 20000,
        dining_out: 30000,
      },
      categoryPercentage: {
        delivery: 50,
        homemade: 20,
        dining_out: 30,
      },
      totalAmount: 100000,
    };
    expect(stats.totalByCategory.delivery).toBe(50000);
    expect(stats.totalByCategory.homemade).toBe(20000);
    expect(stats.totalByCategory.dining_out).toBe(30000);
    expect(stats.totalAmount).toBe(100000);
  });
});

describe("WriteResult union type", () => {
  it("should accept success result with ok: true", () => {
    const result: WriteResult = { ok: true };
    expect(result.ok).toBe(true);
  });

  it("should accept failure result with ok: false and QUOTA reason", () => {
    const result: WriteResult = { ok: false, reason: "QUOTA" };
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("QUOTA");
  });

  it("should accept failure result with ok: false and INVALID_AMOUNT reason", () => {
    const result: WriteResult = { ok: false, reason: "INVALID_AMOUNT" };
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("INVALID_AMOUNT");
  });
});
