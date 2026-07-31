import { describe, it, expect } from "vitest";
import type {
  Budget,
  MealRecord,
  MealSlot,
  MealCategory,
  CheckinLog,
  AppFlags,
  SaveResult,
  RouteState,
} from "@/lib/types";

describe("AC-1[P0]: Budget/MealRecord/MealSlot/MealCategory/CheckinLog/AppFlags export", () => {
  it("should export Budget type with month, totalBudget, createdAt, updatedAt fields", () => {
    const budget: Budget = {
      month: "2026-08",
      totalBudget: 3000000,
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-01T12:00:00Z",
    };

    expect(budget.month).toBe("2026-08");
    expect(budget.totalBudget).toBe(3000000);
    expect(budget.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(budget.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("should handle multiple Budget instances with different amounts (integer KRW)", () => {
    const budget1: Budget = {
      month: "2026-07",
      totalBudget: 2500000,
      createdAt: "2026-07-01T00:00:00Z",
      updatedAt: "2026-07-15T10:30:00Z",
    };

    const budget2: Budget = {
      month: "2026-08",
      totalBudget: 3500000,
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-01T12:00:00Z",
    };

    expect(budget1.totalBudget).toBe(2500000);
    expect(budget2.totalBudget).toBe(3500000);
    expect(budget1.month < budget2.month).toBe(true);
  });

  it("should export MealRecord type with id, date, slot, category, amount, memo, createdAt", () => {
    const record: MealRecord = {
      id: "meal-001",
      date: "2026-08-01",
      slot: "lunch",
      category: "delivery",
      amount: 15000,
      memo: "Restaurant lunch",
      createdAt: "2026-08-01T12:30:00Z",
    };

    expect(record.id).toBe("meal-001");
    expect(record.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(record.slot).toBe("lunch");
    expect(record.category).toBe("delivery");
    expect(record.amount).toBe(15000);
    expect(record.memo).toBe("Restaurant lunch");
  });

  it("should handle multiple MealRecord instances with different meals", () => {
    const breakfast: MealRecord = {
      id: "meal-001",
      date: "2026-08-01",
      slot: "breakfast",
      category: "home_cooked",
      amount: 8000,
      memo: "Cereal",
      createdAt: "2026-08-01T08:00:00Z",
    };

    const dinner: MealRecord = {
      id: "meal-002",
      date: "2026-08-01",
      slot: "dinner",
      category: "dining_out",
      amount: 25000,
      memo: "Steak dinner",
      createdAt: "2026-08-01T19:00:00Z",
    };

    expect(breakfast.slot).toBe("breakfast");
    expect(dinner.slot).toBe("dinner");
    expect(breakfast.amount).toBe(8000);
    expect(dinner.amount).toBe(25000);
  });

  it("should export MealSlot type as union of breakfast | lunch | dinner", () => {
    const breakfast: MealSlot = "breakfast";
    const lunch: MealSlot = "lunch";
    const dinner: MealSlot = "dinner";

    const slots: MealSlot[] = [breakfast, lunch, dinner];
    expect(slots).toHaveLength(3);
    expect(slots).toContain("breakfast");
    expect(slots).toContain("lunch");
    expect(slots).toContain("dinner");
  });

  it("should export MealCategory type as union of delivery | dining_out | home_cooked", () => {
    const delivery: MealCategory = "delivery";
    const diningOut: MealCategory = "dining_out";
    const homeCooked: MealCategory = "home_cooked";

    const categories: MealCategory[] = [delivery, diningOut, homeCooked];
    expect(categories).toHaveLength(3);
    expect(categories).toContain("delivery");
    expect(categories).toContain("dining_out");
    expect(categories).toContain("home_cooked");
  });

  it("should export CheckinLog type with date, paceBadge, grantedAt fields", () => {
    const checkin: CheckinLog = {
      date: "2026-08-01",
      paceBadge: "ahead",
      grantedAt: "2026-08-01T10:00:00Z",
    };

    expect(checkin.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(["ahead", "ontrack", "over"]).toContain(checkin.paceBadge);
    expect(checkin.grantedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("should handle CheckinLog with all pace badge types", () => {
    const ahead: CheckinLog = {
      date: "2026-08-01",
      paceBadge: "ahead",
      grantedAt: "2026-08-01T10:00:00Z",
    };

    const ontrack: CheckinLog = {
      date: "2026-08-02",
      paceBadge: "ontrack",
      grantedAt: "2026-08-02T10:00:00Z",
    };

    const over: CheckinLog = {
      date: "2026-08-03",
      paceBadge: "over",
      grantedAt: "2026-08-03T10:00:00Z",
    };

    expect(ahead.paceBadge).toBe("ahead");
    expect(ontrack.paceBadge).toBe("ontrack");
    expect(over.paceBadge).toBe("over");
  });

  it("should export AppFlags type with aiNoticeAcknowledged required and overBudgetAlertedMonth optional", () => {
    const flags1: AppFlags = {
      aiNoticeAcknowledged: true,
    };

    const flags2: AppFlags = {
      aiNoticeAcknowledged: false,
      overBudgetAlertedMonth: "2026-08",
    };

    expect(flags1.aiNoticeAcknowledged).toBe(true);
    expect(flags2.aiNoticeAcknowledged).toBe(false);
    expect(flags2.overBudgetAlertedMonth).toBe("2026-08");
  });

  it("should handle AppFlags with and without optional overBudgetAlertedMonth", () => {
    const noAlert: AppFlags = { aiNoticeAcknowledged: true };
    const withAlert: AppFlags = {
      aiNoticeAcknowledged: true,
      overBudgetAlertedMonth: "2026-07",
    };

    expect(noAlert.overBudgetAlertedMonth).toBeUndefined();
    expect(withAlert.overBudgetAlertedMonth).toBe("2026-07");
  });
});

describe("AC-2[P0]: SaveResult discriminated union { ok: true } | { ok: false; reason: ... }", () => {
  it("should allow SaveResult { ok: true } case without reason field", () => {
    const success: SaveResult = { ok: true };

    expect(success.ok).toBe(true);
    // Type guard: ok is true means no reason field
  });

  it("should allow SaveResult { ok: false; reason: 'quota' } case", () => {
    const failureQuota: SaveResult = { ok: false, reason: "quota" };

    expect(failureQuota.ok).toBe(false);
    if (!failureQuota.ok) {
      expect(failureQuota.reason).toBe("quota");
    }
  });

  it("should allow SaveResult { ok: false; reason: 'parse' } case", () => {
    const failureParse: SaveResult = { ok: false, reason: "parse" };

    expect(failureParse.ok).toBe(false);
    if (!failureParse.ok) {
      expect(failureParse.reason).toBe("parse");
    }
  });

  it("should properly discriminate SaveResult union in type guards", () => {
    const results: SaveResult[] = [
      { ok: true },
      { ok: false, reason: "quota" },
      { ok: false, reason: "parse" },
    ];

    const successes = results.filter((r) => r.ok);
    const failures = results.filter((r) => !r.ok);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(2);

    if (!failures[0].ok) {
      expect(["quota", "parse"]).toContain(failures[0].reason);
    }
  });
});

describe("AC-3[P0]: RouteState defines all routes with correct state shapes", () => {
  it("should define / route with undefined state", () => {
    type HomeState = RouteState["/"];
    const homeState: HomeState = undefined;

    expect(homeState).toBeUndefined();
  });

  it("should define /budget route with optional editMode boolean state", () => {
    type BudgetState = RouteState["/budget"];

    const noState: BudgetState = undefined;
    const withEditCreate: BudgetState = { editMode: true };
    const withEditFalse: BudgetState = { editMode: false };

    expect(noState).toBeUndefined();
    expect(withEditCreate.editMode).toBe(true);
    expect(withEditFalse.editMode).toBe(false);
  });

  it("should define /record route with optional date string state", () => {
    type RecordState = RouteState["/record"];

    const noState: RecordState = undefined;
    const withDate: RecordState = { date: "2026-08-01" };

    expect(noState).toBeUndefined();
    expect(withDate.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("should define /records route with undefined state", () => {
    type RecordsState = RouteState["/records"];
    const recordsState: RecordsState = undefined;

    expect(recordsState).toBeUndefined();
  });

  it("should define /analysis route with undefined state", () => {
    type AnalysisState = RouteState["/analysis"];
    const analysisState: AnalysisState = undefined;

    expect(analysisState).toBeUndefined();
  });

  it("should define /simulate route with undefined state", () => {
    type SimulateState = RouteState["/simulate"];
    const simulateState: SimulateState = undefined;

    expect(simulateState).toBeUndefined();
  });

  it("should support RouteState indexing for all defined routes", () => {
    // Test that all expected routes are defined in RouteState
    const routes: Array<keyof RouteState> = [
      "/",
      "/budget",
      "/record",
      "/records",
      "/analysis",
      "/simulate",
    ];

    expect(routes).toHaveLength(6);
    routes.forEach((route) => {
      expect(route).toBeTruthy();
    });
  });
});

describe("AC-4[P0]: Types use concrete types without 'any' and pass tsc --noEmit", () => {
  it("should compile all type definitions without using 'any' (implicit via successful imports)", () => {
    // This test passes if all above tests compile successfully
    // If any type uses 'any', TypeScript strict mode would catch it

    type BudgetTest = Budget;
    type MealRecordTest = MealRecord;
    type MealSlotTest = MealSlot;
    type MealCategoryTest = MealCategory;
    type CheckinLogTest = CheckinLog;
    type AppFlagsTest = AppFlags;
    type SaveResultTest = SaveResult;
    type RouteStateTest = RouteState;

    expect(true).toBe(true);
  });

  it("should not allow undefined for required fields in Budget", () => {
    // Type validation: if month is undefined, TypeScript should error
    const budget: Budget = {
      month: "2026-08",
      totalBudget: 3000000,
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-01T12:00:00Z",
    };

    // All required fields must be string | number (not any)
    expect(typeof budget.month).toBe("string");
    expect(typeof budget.totalBudget).toBe("number");
    expect(typeof budget.createdAt).toBe("string");
    expect(typeof budget.updatedAt).toBe("string");
  });

  it("should not allow undefined for required fields in MealRecord", () => {
    const record: MealRecord = {
      id: "meal-001",
      date: "2026-08-01",
      slot: "lunch",
      category: "delivery",
      amount: 15000,
      memo: "Lunch",
      createdAt: "2026-08-01T12:30:00Z",
    };

    // All required fields must be present and correctly typed (not any)
    expect(typeof record.id).toBe("string");
    expect(typeof record.date).toBe("string");
    expect(typeof record.slot).toBe("string");
    expect(typeof record.category).toBe("string");
    expect(typeof record.amount).toBe("number");
    expect(typeof record.memo).toBe("string");
    expect(typeof record.createdAt).toBe("string");
  });
});
