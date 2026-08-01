/**
 * Tests for localStorage storage helper (packet-0002)
 *
 * TDD: Tests are written first; implementation will follow.
 * Covers CRUD operations, error handling, and input validation.
 *
 * ACs tested:
 * - AC-1: Missing key returns empty array
 * - AC-2: Valid meal record saves with generated id/createdAt
 * - AC-2 (error): Corrupted JSON returns null + no console.error
 * - AC-3: QuotaExceededError returns {ok:false, reason:'QUOTA'}
 * - AC-4: Invalid amount (0/-500/1000000) returns {ok:false, reason:'INVALID_AMOUNT'}
 * - Additional: Memo clamped to 40 chars
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  MealRecord,
  MonthlyBudget,
  DailyCheckIn,
  AppFlags,
  WriteResult,
} from "@/lib/types";

describe("localStorage 저장소 헬퍼 (CRUD + 방어)", () => {
  // ────────────────────────────────────────────────────────────
  // AC-1: Missing key returns empty array
  // ────────────────────────────────────────────────────────────

  it("AC-1: 키 부재 시 getMeals() 빈 배열 반환", () => {
    // Arrange: localStorage에 mbp_meals_v1 키 없음 (beforeEach에서 clear)

    // Act
    const { getMeals } = require("@/lib/storage");
    const result = getMeals();

    // Assert
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  // ────────────────────────────────────────────────────────────
  // AC-2 (happy path): Valid meal record saves with generated id/createdAt
  // ────────────────────────────────────────────────────────────

  it("AC-2 (happy path): 유효한 MealRecord 저장 성공 및 배열 맨 앞에 추가", () => {
    // Arrange
    const { getMeals, addMeal } = require("@/lib/storage");
    const mealInput: Omit<MealRecord, "id" | "createdAt"> = {
      date: "2026-08-02",
      mealType: "lunch",
      category: "delivery",
      amount: 12000,
      memo: "김밥",
    };

    // Act
    const result = addMeal(mealInput);
    const meals = getMeals();

    // Assert
    expect(result).toEqual({ ok: true });
    expect(meals.length).toBe(1);
    expect(meals[0].amount).toBe(12000);
    expect(meals[0].date).toBe("2026-08-02");
    expect(meals[0].mealType).toBe("lunch");
    expect(meals[0].category).toBe("delivery");
    expect(meals[0].memo).toBe("김밥");
    expect(meals[0].id).toBeDefined();
    expect(typeof meals[0].id).toBe("string");
    expect(meals[0].createdAt).toBeDefined();
    expect(typeof meals[0].createdAt).toBe("number");
  });

  it("AC-2 (happy path): 여러 기록 추가 시 최신순으로 배열 맨 앞에 추가", () => {
    // Arrange
    const { getMeals, addMeal } = require("@/lib/storage");
    const meal1: Omit<MealRecord, "id" | "createdAt"> = {
      date: "2026-08-01",
      mealType: "breakfast",
      category: "homemade",
      amount: 5000,
      memo: "계란",
    };
    const meal2: Omit<MealRecord, "id" | "createdAt"> = {
      date: "2026-08-02",
      mealType: "lunch",
      category: "delivery",
      amount: 12000,
      memo: "김밥",
    };

    // Act
    addMeal(meal1);
    addMeal(meal2);
    const meals = getMeals();

    // Assert
    expect(meals.length).toBe(2);
    expect(meals[0].amount).toBe(12000); // 최신이 맨 앞
    expect(meals[1].amount).toBe(5000);
  });

  // ────────────────────────────────────────────────────────────
  // AC-2 (error path): Corrupted JSON returns null + no console.error
  // ────────────────────────────────────────────────────────────

  it("AC-2 (error): 손상된 JSON 값 시 getBudget null 반환 + console.error 출력 없음", () => {
    // Arrange
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem("mbp_budget_v1", '{"2026-08": "{broken');

    // Act
    const { getBudget } = require("@/lib/storage");
    const result = getBudget("2026-08");

    // Assert
    expect(result).toBeNull();
    expect(consoleSpy).not.toHaveBeenCalled();

    // Cleanup
    consoleSpy.mockRestore();
  });

  it("AC-2 (error): 손상된 JSON 복구 후 키 리셋 (다음 조회 시 기본값 반환)", () => {
    // Arrange
    localStorage.setItem("mbp_budget_v1", "{broken");
    const { getBudget } = require("@/lib/storage");

    // Act
    const result1 = getBudget("2026-08");
    const result2 = getBudget("2026-08");

    // Assert
    expect(result1).toBeNull();
    expect(result2).toBeNull(); // 키 리셋 후 계속 null
  });

  // ────────────────────────────────────────────────────────────
  // AC-3: QuotaExceededError returns {ok:false, reason:'QUOTA'}
  // ────────────────────────────────────────────────────────────

  it("AC-3: QuotaExceededError 시 addMeal {ok:false, reason:'QUOTA'} 반환", () => {
    // Arrange
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      const err = new Error("QuotaExceededError");
      err.name = "QuotaExceededError";
      throw err;
    });

    const { addMeal } = require("@/lib/storage");
    const mealInput: Omit<MealRecord, "id" | "createdAt"> = {
      date: "2026-08-02",
      mealType: "lunch",
      category: "delivery",
      amount: 12000,
      memo: "김밥",
    };

    // Act
    const result = addMeal(mealInput);

    // Assert
    expect(result).toEqual({ ok: false, reason: "QUOTA" });

    // Cleanup
    Storage.prototype.setItem = original;
  });

  // ────────────────────────────────────────────────────────────
  // AC-4: Invalid amount (0/-500/1000000) returns {ok:false, reason:'INVALID_AMOUNT'}
  // ────────────────────────────────────────────────────────────

  it("AC-4: amount 0 시 addMeal {ok:false, reason:'INVALID_AMOUNT'} 반환", () => {
    // Arrange
    const { addMeal } = require("@/lib/storage");
    const mealInput: Omit<MealRecord, "id" | "createdAt"> = {
      date: "2026-08-02",
      mealType: "lunch",
      category: "delivery",
      amount: 0,
      memo: "test",
    };

    // Act
    const result = addMeal(mealInput);

    // Assert
    expect(result).toEqual({ ok: false, reason: "INVALID_AMOUNT" });
  });

  it("AC-4: amount -500 (음수) 시 addMeal {ok:false, reason:'INVALID_AMOUNT'} 반환", () => {
    // Arrange
    const { addMeal } = require("@/lib/storage");
    const mealInput: Omit<MealRecord, "id" | "createdAt"> = {
      date: "2026-08-02",
      mealType: "lunch",
      category: "delivery",
      amount: -500,
      memo: "test",
    };

    // Act
    const result = addMeal(mealInput);

    // Assert
    expect(result).toEqual({ ok: false, reason: "INVALID_AMOUNT" });
  });

  it("AC-4: amount 1000000 (상한 초과) 시 addMeal {ok:false, reason:'INVALID_AMOUNT'} 반환", () => {
    // Arrange
    const { addMeal } = require("@/lib/storage");
    const mealInput: Omit<MealRecord, "id" | "createdAt"> = {
      date: "2026-08-02",
      mealType: "lunch",
      category: "delivery",
      amount: 1000000, // > 999,999
      memo: "test",
    };

    // Act
    const result = addMeal(mealInput);

    // Assert
    expect(result).toEqual({ ok: false, reason: "INVALID_AMOUNT" });
  });

  it("AC-4: 유효한 범위 경계 amount 1 ~ 999,999 저장 성공", () => {
    // Arrange
    const { addMeal, getMeals } = require("@/lib/storage");

    // Act: 최소값
    const resultMin = addMeal({
      date: "2026-08-02",
      mealType: "lunch",
      category: "delivery",
      amount: 1,
      memo: "min",
    });

    // Act: 최대값
    const resultMax = addMeal({
      date: "2026-08-02",
      mealType: "lunch",
      category: "delivery",
      amount: 999999,
      memo: "max",
    });

    // Assert
    expect(resultMin.ok).toBe(true);
    expect(resultMax.ok).toBe(true);
    const meals = getMeals();
    expect(meals.length).toBe(2);
    expect(meals[0].amount).toBe(999999);
    expect(meals[1].amount).toBe(1);
  });

  // ────────────────────────────────────────────────────────────
  // Additional: Memo clamped to 40 chars
  // ────────────────────────────────────────────────────────────

  it("추가: 메모가 40자를 초과하면 40자로 클램프되어 저장", () => {
    // Arrange
    const { addMeal, getMeals } = require("@/lib/storage");
    const longMemo = "a".repeat(50);

    // Act
    addMeal({
      date: "2026-08-02",
      mealType: "lunch",
      category: "delivery",
      amount: 12000,
      memo: longMemo,
    });

    // Assert
    const meals = getMeals();
    expect(meals[0].memo.length).toBeLessThanOrEqual(40);
    expect(meals[0].memo).toBe("a".repeat(40));
  });

  // ────────────────────────────────────────────────────────────
  // getBudget / setBudget CRUD
  // ────────────────────────────────────────────────────────────

  it("getBudget: 키 부재 시 null 반환", () => {
    // Arrange

    // Act
    const { getBudget } = require("@/lib/storage");
    const result = getBudget("2026-08");

    // Assert
    expect(result).toBeNull();
  });

  it("setBudget: 유효한 예산 저장 성공", () => {
    // Arrange
    const { setBudget, getBudget } = require("@/lib/storage");
    const budget: MonthlyBudget = {
      month: "2026-08",
      amount: 600000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Act
    const result = setBudget("2026-08", budget);
    const retrieved = getBudget("2026-08");

    // Assert
    expect(result).toEqual({ ok: true });
    expect(retrieved).not.toBeNull();
    expect(retrieved?.amount).toBe(600000);
    expect(retrieved?.month).toBe("2026-08");
  });

  // ────────────────────────────────────────────────────────────
  // getCheckIns / addCheckIn CRUD
  // ────────────────────────────────────────────────────────────

  it("getCheckIns: 키 부재 시 빈 배열 반환", () => {
    // Arrange

    // Act
    const { getCheckIns } = require("@/lib/storage");
    const result = getCheckIns();

    // Assert
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it("addCheckIn: 유효한 체크인 저장 성공 및 createdAt 자동 생성", () => {
    // Arrange
    const { addCheckIn, getCheckIns } = require("@/lib/storage");
    const checkInInput: Omit<DailyCheckIn, "createdAt"> = {
      date: "2026-08-02",
      badge: "ontrack",
      spentSoFar: 200000,
    };

    // Act
    const result = addCheckIn(checkInInput);
    const checkIns = getCheckIns();

    // Assert
    expect(result).toEqual({ ok: true });
    expect(checkIns.length).toBe(1);
    expect(checkIns[0].date).toBe("2026-08-02");
    expect(checkIns[0].badge).toBe("ontrack");
    expect(checkIns[0].spentSoFar).toBe(200000);
    expect(checkIns[0].createdAt).toBeDefined();
    expect(typeof checkIns[0].createdAt).toBe("number");
  });

  // ────────────────────────────────────────────────────────────
  // getFlags / setFlags CRUD
  // ────────────────────────────────────────────────────────────

  it("getFlags: 키 부재 시 기본값 반환 (onboardingSeen: false, lastSimulationDate: '')", () => {
    // Arrange

    // Act
    const { getFlags } = require("@/lib/storage");
    const result = getFlags();

    // Assert
    expect(result).toBeDefined();
    expect(result.onboardingSeen).toBe(false);
    expect(result.lastSimulationDate).toBe("");
  });

  it("setFlags: 유효한 플래그 저장 성공", () => {
    // Arrange
    const { setFlags, getFlags } = require("@/lib/storage");
    const flags: AppFlags = {
      onboardingSeen: true,
      lastSimulationDate: "2026-08-02",
    };

    // Act
    const result = setFlags(flags);
    const retrieved = getFlags();

    // Assert
    expect(result).toEqual({ ok: true });
    expect(retrieved.onboardingSeen).toBe(true);
    expect(retrieved.lastSimulationDate).toBe("2026-08-02");
  });

  // ────────────────────────────────────────────────────────────
  // safeParse utility (internal helper)
  // ────────────────────────────────────────────────────────────

  it("safeParse: 유효한 JSON 파싱 성공", () => {
    // Arrange
    const { safeParse } = require("@/lib/storage");
    const testData = { a: 1, b: "test" };
    localStorage.setItem("test-key", JSON.stringify(testData));

    // Act
    const result = safeParse("test-key", { a: 0, b: "" });

    // Assert
    expect(result).toEqual(testData);
  });

  it("safeParse: 파싱 실패 시 fallback 반환 + 키 리셋", () => {
    // Arrange
    const { safeParse } = require("@/lib/storage");
    const fallback = { a: 0, b: "" };
    localStorage.setItem("test-key", "{broken");

    // Act
    const result = safeParse("test-key", fallback);

    // Assert
    expect(result).toEqual(fallback);
    expect(localStorage.getItem("test-key")).toBeNull();
  });

  // ────────────────────────────────────────────────────────────
  // crypto.randomUUID fallback (Android 7+ / iOS 16+ compat)
  // ────────────────────────────────────────────────────────────

  it("addMeal: id는 유효한 UUID 형식 (또는 polyfill)", () => {
    // Arrange
    const { addMeal, getMeals } = require("@/lib/storage");

    // Act
    addMeal({
      date: "2026-08-02",
      mealType: "lunch",
      category: "delivery",
      amount: 12000,
      memo: "test",
    });

    // Assert
    const meals = getMeals();
    const id = meals[0].id;
    expect(id).toBeDefined();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // Or fallback: any non-empty string
    expect(/^[a-f0-9\-]+$/i.test(id) || id.length > 20).toBe(true);
  });
});
