import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  addMeal,
  deleteMeal,
  getMealsByMonth,
  getBudget,
  setBudget,
  getCheckin,
  setCheckin,
  getFlags,
  setFlags,
  type MealRecord,
  type Budget,
  type CheckinLog,
  type AppFlags,
} from "@/lib/storage";

describe("localStorage CRUD 헬퍼 (packet-0002)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("AC-1: addMeal와 getMealsByMonth", () => {
    it("should add meal with UUID id and retrieve by month", () => {
      const mealData = { name: "아침식사", amount: 5000, date: "2026-08-01" };
      const addResult = addMeal(mealData);

      expect(addResult.ok).toBe(true);
      expect(addResult.id).toBeDefined();
      expect(typeof addResult.id).toBe("string");
      expect(addResult.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );

      const meals = getMealsByMonth("2026-08");
      expect(meals).toHaveLength(1);
      expect(meals[0]).toMatchObject({
        id: addResult.id,
        name: "아침식사",
        amount: 5000,
        date: "2026-08-01",
      });
    });

    it("should return multiple meals when added in same month", () => {
      const meal1 = addMeal({ name: "아침", amount: 5000, date: "2026-08-01" });
      const meal2 = addMeal({ name: "점심", amount: 8000, date: "2026-08-15" });

      const meals = getMealsByMonth("2026-08");
      expect(meals).toHaveLength(2);
      expect(meals.map((m: MealRecord) => m.id)).toEqual([meal1.id, meal2.id]);
    });

    it("should return empty array for month with no meals", () => {
      addMeal({ name: "아침", amount: 5000, date: "2026-08-01" });

      const meals = getMealsByMonth("2026-09");
      expect(meals).toEqual([]);
    });
  });

  describe("AC-2: 손상 JSON 처리", () => {
    it("should return empty array without console error when JSON is corrupted", () => {
      localStorage.setItem("mbp.meals", "{invalid json");

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const meals = getMealsByMonth("2026-08");

      expect(meals).toEqual([]);
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should return empty array when storage has empty string", () => {
      localStorage.setItem("mbp.meals", "");

      const meals = getMealsByMonth("2026-08");
      expect(meals).toEqual([]);
    });
  });

  describe("AC-3: setBudget 타임스탬프", () => {
    it("should set createdAt on new budget and preserve on update", () => {
      vi.useFakeTimers();
      const time1 = 1690000000000;
      vi.setSystemTime(time1);

      const budget1 = setBudget("2026-08", { amount: 100000 });
      expect(budget1.createdAt).toBe(time1);
      expect(budget1.updatedAt).toBe(time1);

      vi.setSystemTime(time1 + 5000);
      const budget2 = setBudget("2026-08", { amount: 120000 });

      expect(budget2.createdAt).toBe(time1);
      expect(budget2.updatedAt).toBe(time1 + 5000);
      expect(budget2.updatedAt).toBeGreaterThan(budget2.createdAt);
    });

    it("should update updatedAt but not createdAt on multiple updates", () => {
      vi.useFakeTimers();
      const time1 = 1690000000000;
      vi.setSystemTime(time1);

      setBudget("2026-08", { amount: 100000 });
      const createdAt = JSON.parse(
        localStorage.getItem("mbp.budgets") || "{}"
      )["2026-08"].createdAt;

      vi.setSystemTime(time1 + 10000);
      setBudget("2026-08", { amount: 120000 });

      vi.setSystemTime(time1 + 20000);
      const budget3 = setBudget("2026-08", { amount: 130000 });

      expect(budget3.createdAt).toBe(createdAt);
      expect(budget3.updatedAt).toBe(time1 + 20000);
    });
  });

  describe("AC-4: QuotaExceededError 처리", () => {
    it("should return quota error when localStorage.setItem throws", () => {
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
      setItemSpy.mockImplementationOnce(() => {
        const err = new Error();
        err.name = "QuotaExceededError";
        throw err;
      });

      const result = addMeal({ name: "test", amount: 5000, date: "2026-08-01" });

      expect(result).toEqual({ ok: false, reason: "quota" });
      expect(result.id).toBeUndefined();

      setItemSpy.mockRestore();
    });

    it("should not propagate exception when quota is exceeded", () => {
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
      setItemSpy.mockImplementationOnce(() => {
        const err = new Error();
        err.name = "QuotaExceededError";
        throw err;
      });

      expect(() => {
        addMeal({ name: "test", amount: 5000, date: "2026-08-01" });
      }).not.toThrow();

      setItemSpy.mockRestore();
    });
  });

  describe("AC-5: 키 부재 시 처리", () => {
    it("should return null when budget doesn't exist", () => {
      const result = getBudget("2026-08");
      expect(result).toBeNull();
    });

    it("should return null when specific month budget is missing", () => {
      setBudget("2026-07", { amount: 100000 });
      const result = getBudget("2026-08");
      expect(result).toBeNull();
    });
  });

  describe("추가 기능: Checkins", () => {
    it("should store and retrieve checkin data", () => {
      const checkinData = { completed: true, notes: "완료" };
      setCheckin("2026-08-01", checkinData);

      const result = getCheckin("2026-08-01");
      expect(result).toMatchObject({
        completed: true,
        notes: "완료",
      });
    });

    it("should return null for missing checkin", () => {
      const result = getCheckin("2026-08-01");
      expect(result).toBeNull();
    });
  });

  describe("추가 기능: Flags", () => {
    it("should store and retrieve app flags", () => {
      const flags = { aiNoticeShown: true, theme: "dark" };
      setFlags(flags);

      const result = getFlags();
      expect(result).toEqual(flags);
    });

    it("should return empty object when no flags exist", () => {
      const result = getFlags();
      expect(result).toEqual({});
    });

    it("should merge flags on update", () => {
      setFlags({ aiNoticeShown: true });
      setFlags({ theme: "dark" });

      const result = getFlags();
      expect(result).toMatchObject({
        aiNoticeShown: true,
        theme: "dark",
      });
    });
  });

  describe("추가 기능: deleteMeal", () => {
    it("should remove meal by id", () => {
      const meal = addMeal({ name: "test", amount: 5000, date: "2026-08-01" });
      expect(meal.ok).toBe(true);
      expect(meal.id).toBeDefined();

      let meals = getMealsByMonth("2026-08");
      expect(meals).toHaveLength(1);

      deleteMeal(meal.id!);

      meals = getMealsByMonth("2026-08");
      expect(meals).toHaveLength(0);
    });

    it("should not error when deleting non-existent meal", () => {
      expect(() => {
        deleteMeal("non-existent-id");
      }).not.toThrow();
    });
  });

  describe("통합: Multiple operations", () => {
    it("should handle mixed storage operations", () => {
      setBudget("2026-08", { amount: 100000 });
      addMeal({ name: "아침", amount: 5000, date: "2026-08-01" });
      addMeal({ name: "점심", amount: 8000, date: "2026-08-02" });
      setFlags({ theme: "dark" });
      setCheckin("2026-08-01", { completed: true });

      const budget = getBudget("2026-08");
      expect(budget?.amount).toBe(100000);

      const meals = getMealsByMonth("2026-08");
      expect(meals).toHaveLength(2);

      const flags = getFlags();
      expect(flags.theme).toBe("dark");

      const checkin = getCheckin("2026-08-01");
      expect(checkin?.completed).toBe(true);
    });

    it("should maintain data isolation between keys", () => {
      addMeal({ name: "2026-08", amount: 5000, date: "2026-08-01" });
      setBudget("2026-08", { amount: 100000 });
      setFlags({ test: true });

      localStorage.clear();

      const meals = getMealsByMonth("2026-08");
      const budget = getBudget("2026-08");
      const flags = getFlags();

      expect(meals).toEqual([]);
      expect(budget).toBeNull();
      expect(flags).toEqual({});
    });
  });
});
