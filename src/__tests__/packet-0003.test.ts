import { describe, it, expect } from "vitest";
import type { MealRecord } from "@/lib/types";
import {
  getMonthSpent,
  getAllowancePerMeal,
  calcPaceBadge,
  isOverBudget,
  pruneOldData,
  getRemainingMeals,
  getSpentByCategory,
  getRecent7DaysStats,
} from "@/lib/calc";

/**
 * TDD RED PHASE — 파생계산 유틸 & 데이터 정리 (packet-0003)
 *
 * Tests for calculation utilities that don't exist yet.
 * These tests define the contract that the implementation must satisfy.
 */

describe("파생계산 유틸 & 데이터 정리 (packet-0003)", () => {
  describe("AC-1: getMonthSpent — 월별 총 지출 합계", () => {
    it("should sum amounts from records with matching month", () => {
      const records: MealRecord[] = [
        {
          id: "1",
          date: "2026-08-01",
          slot: "breakfast",
          category: "main",
          amount: 12000,
          memo: "",
          createdAt: "2026-08-01T09:00:00Z",
        },
        {
          id: "2",
          date: "2026-08-15",
          slot: "lunch",
          category: "main",
          amount: 8000,
          memo: "",
          createdAt: "2026-08-15T12:00:00Z",
        },
        {
          id: "3",
          date: "2026-08-28",
          slot: "dinner",
          category: "main",
          amount: 5000,
          memo: "",
          createdAt: "2026-08-28T18:00:00Z",
        },
      ];

      const result = getMonthSpent(records, "2026-08");

      expect(result).toBe(25000);
      expect(typeof result).toBe("number");
    });

    it("should return 0 when no records match month", () => {
      const records: MealRecord[] = [
        {
          id: "1",
          date: "2026-07-15",
          slot: "lunch",
          category: "main",
          amount: 8000,
          memo: "",
          createdAt: "2026-07-15T12:00:00Z",
        },
      ];

      const result = getMonthSpent(records, "2026-08");

      expect(result).toBe(0);
    });

    it("should return 0 when records array is empty", () => {
      const result = getMonthSpent([], "2026-08");

      expect(result).toBe(0);
    });
  });

  describe("AC-2: getAllowancePerMeal — 끼니당 허용예산 (내림)", () => {
    it("should calculate floor division of remaining budget by remaining meals", () => {
      const remainingBudget = 150000;
      const remainingMeals = 29;

      const result = getAllowancePerMeal(remainingBudget, remainingMeals);

      expect(result).toBe(5172);
      expect(typeof result).toBe("number");
      expect(result).toEqual(Math.floor(remainingBudget / remainingMeals));
    });

    it("should return floor value, not rounded", () => {
      const remainingBudget = 100000;
      const remainingMeals = 3; // 100000 / 3 = 33333.333... → 33333

      const result = getAllowancePerMeal(remainingBudget, remainingMeals);

      expect(result).toBe(33333);
      expect(result).not.toBe(33334);
    });

    it("should return 0 when remaining meals is 0", () => {
      const remainingBudget = 150000;
      const remainingMeals = 0;

      const result = getAllowancePerMeal(remainingBudget, remainingMeals);

      expect(result).toBeNull();
    });

    it("should return null when remaining meals is negative", () => {
      const remainingBudget = 150000;
      const remainingMeals = -1;

      const result = getAllowancePerMeal(remainingBudget, remainingMeals);

      expect(result).toBeNull();
    });

    it("should handle 0 remaining budget", () => {
      const remainingBudget = 0;
      const remainingMeals = 10;

      const result = getAllowancePerMeal(remainingBudget, remainingMeals);

      expect(result).toBe(0);
    });
  });

  describe("AC-4: calcPaceBadge — 소비 페이스 배지 (ahead/ontrack/over)", () => {
    it("should return 'ahead' when spent is <95% of expected pace", () => {
      const budget = 500000;
      const spent = 200000;
      const dayN = 15;
      const totalDays = 31;

      const result = calcPaceBadge(budget, spent, dayN, totalDays);

      expect(result).toBe("ahead");
      // Expected pace: 500000 * (15/31) = 241935
      // Actual spent: 200000 < 241935 * 0.95 = 229738
    });

    it("should return 'ontrack' when spent is between 95% and 105% of expected pace", () => {
      const budget = 500000;
      const spent = 250000;
      const dayN = 15;
      const totalDays = 31;

      const result = calcPaceBadge(budget, spent, dayN, totalDays);

      expect(result).toBe("ontrack");
      // Expected pace: 500000 * (15/31) ≈ 241935
      // 95% of pace ≈ 229738, 105% of pace ≈ 254213
      // 250000 is within this range
    });

    it("should return 'over' when spent is >105% of expected pace", () => {
      const budget = 500000;
      const spent = 270000;
      const dayN = 15;
      const totalDays = 31;

      const result = calcPaceBadge(budget, spent, dayN, totalDays);

      expect(result).toBe("over");
      // Expected pace: 500000 * (15/31) ≈ 241935
      // 105% of pace ≈ 254213
      // 270000 > 254213
    });

    it("should handle edge case: day 1 of month", () => {
      const budget = 500000;
      const spent = 5000;
      const dayN = 1;
      const totalDays = 31;

      const result = calcPaceBadge(budget, spent, dayN, totalDays);

      expect(["ahead", "ontrack"]).toContain(result);
      expect(typeof result).toBe("string");
    });
  });

  describe("AC-5: isOverBudget — 예산 초과 여부 & 초과액", () => {
    it("should return { over: true, excess: 20000 } when spent exceeds budget", () => {
      const budget = 500000;
      const spent = 520000;

      const result = isOverBudget(budget, spent);

      expect(result).toEqual({ over: true, excess: 20000 });
      expect(result.over).toBe(true);
      expect(result.excess).toBe(20000);
    });

    it("should return { over: false, excess: 0 } when spent is within budget", () => {
      const budget = 500000;
      const spent = 400000;

      const result = isOverBudget(budget, spent);

      expect(result).toEqual({ over: false, excess: 0 });
      expect(result.over).toBe(false);
      expect(result.excess).toBe(0);
    });

    it("should return { over: false, excess: 0 } when spent equals budget", () => {
      const budget = 500000;
      const spent = 500000;

      const result = isOverBudget(budget, spent);

      expect(result).toEqual({ over: false, excess: 0 });
      expect(result.over).toBe(false);
      expect(result.excess).toBe(0);
    });

    it("should calculate exact excess amount", () => {
      const budget = 200000;
      const spent = 250000;

      const result = isOverBudget(budget, spent);

      expect(result.over).toBe(true);
      expect(result.excess).toBe(50000);
    });
  });

  describe("AC-6: pruneOldData — 13개월 초과 레코드 제거", () => {
    it("should remove records older than 13 months from today", () => {
      const today = "2026-08-01";
      const records: MealRecord[] = [
        // 14 months old (should be removed)
        {
          id: "old",
          date: "2025-06-01",
          slot: "breakfast",
          category: "main",
          amount: 5000,
          memo: "",
          createdAt: "2025-06-01T09:00:00Z",
        },
        // Recent (should be kept)
        {
          id: "recent",
          date: "2026-08-01",
          slot: "lunch",
          category: "main",
          amount: 8000,
          memo: "",
          createdAt: "2026-08-01T12:00:00Z",
        },
      ];

      const result = pruneOldData(records, today);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("recent");
      expect(result[0].date).toBe("2026-08-01");
    });

    it("should keep records exactly 13 months old", () => {
      const today = "2026-08-01";
      const records: MealRecord[] = [
        // Exactly 13 months old (should be kept)
        {
          id: "boundary",
          date: "2025-07-01",
          slot: "breakfast",
          category: "main",
          amount: 5000,
          memo: "",
          createdAt: "2025-07-01T09:00:00Z",
        },
      ];

      const result = pruneOldData(records, today);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("boundary");
    });

    it("should handle empty array", () => {
      const result = pruneOldData([], "2026-08-01");

      expect(result).toEqual([]);
    });

    it("should preserve all records within 13 months", () => {
      const today = "2026-08-01";
      const records: MealRecord[] = [
        {
          id: "1",
          date: "2026-01-15",
          slot: "breakfast",
          category: "main",
          amount: 5000,
          memo: "",
          createdAt: "2026-01-15T09:00:00Z",
        },
        {
          id: "2",
          date: "2026-07-30",
          slot: "lunch",
          category: "main",
          amount: 8000,
          memo: "",
          createdAt: "2026-07-30T12:00:00Z",
        },
      ];

      const result = pruneOldData(records, today);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual(["1", "2"]);
    });
  });

  describe("Bonus: getRemainingMeals — 남은 끼니 & 일수", () => {
    it("should calculate remaining meals (3 per day) and remaining days", () => {
      const today = "2026-08-15";
      const totalDaysInMonth = 31;
      const dayN = 15;

      const result = getRemainingMeals(today, dayN, totalDaysInMonth);

      expect(result).toMatchObject({
        remainingMeals: expect.any(Number),
        remainingDays: expect.any(Number),
      });
      expect(result.remainingDays).toBe(31 - 15); // 16 days left
      expect(result.remainingMeals).toBe((31 - 15) * 3); // 48 meals
    });

    it("should return 0 remaining meals on last day", () => {
      const today = "2026-08-31";
      const totalDaysInMonth = 31;
      const dayN = 31;

      const result = getRemainingMeals(today, dayN, totalDaysInMonth);

      expect(result.remainingDays).toBe(0);
      expect(result.remainingMeals).toBe(0);
    });
  });

  describe("Bonus: getSpentByCategory — 카테고리별 지출 & 비율", () => {
    it("should sum amounts by category and calculate ratio", () => {
      const records: MealRecord[] = [
        {
          id: "1",
          date: "2026-08-01",
          slot: "breakfast",
          category: "main",
          amount: 10000,
          memo: "",
          createdAt: "2026-08-01T09:00:00Z",
        },
        {
          id: "2",
          date: "2026-08-02",
          slot: "lunch",
          category: "main",
          amount: 10000,
          memo: "",
          createdAt: "2026-08-02T12:00:00Z",
        },
        {
          id: "3",
          date: "2026-08-03",
          slot: "dinner",
          category: "side",
          amount: 5000,
          memo: "",
          createdAt: "2026-08-03T18:00:00Z",
        },
        {
          id: "4",
          date: "2026-08-04",
          slot: "snack",
          category: "drink",
          amount: 5000,
          memo: "",
          createdAt: "2026-08-04T20:00:00Z",
        },
      ];

      const result = getSpentByCategory(records, "2026-08");

      expect(result).toMatchObject({
        total: 30000,
        byCategory: expect.objectContaining({
          main: expect.any(Object),
          side: expect.any(Object),
          drink: expect.any(Object),
          snack: expect.any(Object),
        }),
      });

      // Verify main category
      expect(result.byCategory.main).toMatchObject({
        amount: 20000,
        ratio: expect.closeTo(20000 / 30000),
      });

      // Verify side category
      expect(result.byCategory.side).toMatchObject({
        amount: 5000,
        ratio: expect.closeTo(5000 / 30000),
      });
    });

    it("should handle categories with no spending", () => {
      const records: MealRecord[] = [
        {
          id: "1",
          date: "2026-08-01",
          slot: "breakfast",
          category: "main",
          amount: 10000,
          memo: "",
          createdAt: "2026-08-01T09:00:00Z",
        },
      ];

      const result = getSpentByCategory(records, "2026-08");

      expect(result.byCategory.main.amount).toBe(10000);
      expect(result.byCategory.side.amount).toBe(0);
      expect(result.byCategory.drink.amount).toBe(0);
      expect(result.byCategory.snack.amount).toBe(0);
    });
  });

  describe("Bonus: getRecent7DaysStats — 최근 7일 통계", () => {
    it("should calculate 7-day sum, average, and daily breakdown", () => {
      const today = "2026-08-15";
      const records: MealRecord[] = [
        {
          id: "1",
          date: "2026-08-15",
          slot: "breakfast",
          category: "main",
          amount: 5000,
          memo: "",
          createdAt: "2026-08-15T09:00:00Z",
        },
        {
          id: "2",
          date: "2026-08-15",
          slot: "lunch",
          category: "main",
          amount: 8000,
          memo: "",
          createdAt: "2026-08-15T12:00:00Z",
        },
        {
          id: "3",
          date: "2026-08-14",
          slot: "breakfast",
          category: "main",
          amount: 6000,
          memo: "",
          createdAt: "2026-08-14T09:00:00Z",
        },
      ];

      const result = getRecent7DaysStats(records, today);

      expect(result).toMatchObject({
        total: expect.any(Number),
        average: expect.any(Number),
        count: expect.any(Number),
      });

      expect(result.total).toBe(19000);
      expect(result.count).toBe(3);
      expect(result.average).toBeCloseTo(19000 / 3);
    });

    it("should only include last 7 days", () => {
      const today = "2026-08-15";
      const records: MealRecord[] = [
        // 8 days ago (should be excluded)
        {
          id: "old",
          date: "2026-08-07",
          slot: "breakfast",
          category: "main",
          amount: 10000,
          memo: "",
          createdAt: "2026-08-07T09:00:00Z",
        },
        // 7 days ago (should be included)
        {
          id: "boundary",
          date: "2026-08-08",
          slot: "lunch",
          category: "main",
          amount: 8000,
          memo: "",
          createdAt: "2026-08-08T12:00:00Z",
        },
        // Today
        {
          id: "today",
          date: "2026-08-15",
          slot: "dinner",
          category: "main",
          amount: 12000,
          memo: "",
          createdAt: "2026-08-15T18:00:00Z",
        },
      ];

      const result = getRecent7DaysStats(records, today);

      expect(result.total).toBe(20000); // 8000 + 12000, excluding 10000
      expect(result.count).toBe(2);
    });
  });
});
