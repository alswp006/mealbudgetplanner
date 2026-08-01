/**
 * Tests for 계산 엔진 + 금액 포맷 순수함수 (packet-0003)
 *
 * TDD: Tests are written first; implementation will follow.
 * Tests cover:
 * - RemainingPerMeal 계산 (dailyAllowance, todayRemaining, isOver)
 * - PaceBadge 판정 규칙
 * - 절약액 계산 (getSaving)
 * - 주간 통계 (getWeeklyStats)
 * - 초과 예산 상태 (getOverBudgetStatus)
 * - KRW 포맷팅 (formatKRW)
 *
 * ACs tested:
 * - AC-1: 예산 600k/누적 200k/남은 30일/오늘 4k → dailyAllowance=13333, todayRemaining=9333
 * - AC-2: 초과 시 todayRemaining=0 + isOver:true
 * - AC-3: 예산 0 입력 시 Infinity/NaN 없음
 * - AC-4: tsc --noEmit 통과
 */

import { describe, it, expect } from "vitest";
import type {
  RemainingResult,
  MealRecord,
  MonthlyBudget,
  PaceBadge,
  WeeklyStats,
} from "@/lib/types";

describe("계산 엔진 + 금액 포맷 순수함수 (packet-0003)", () => {
  // ────────────────────────────────────────────────────────────
  // AC-1: 예산 600k/누적 200k/남은 30일/오늘 4k
  // → dailyAllowance=13333, todayRemaining=9333
  // ────────────────────────────────────────────────────────────

  it("AC-1: getRemainingPerMeal 기본 계산 (여유 상태)", () => {
    // Arrange: 예산 600k, 누적 200k, 남은 30일, 오늘 4k 지출
    const { getRemainingPerMeal } = require("@/lib/calc");
    const meals: MealRecord[] = [
      {
        id: "1",
        date: "2026-08-02",
        mealType: "breakfast",
        category: "homemade",
        amount: 2000,
        memo: "",
        createdAt: Date.now(),
      },
      {
        id: "2",
        date: "2026-08-02",
        mealType: "lunch",
        category: "delivery",
        amount: 2000,
        memo: "",
        createdAt: Date.now(),
      },
    ];
    const budget: MonthlyBudget = {
      month: "2026-08",
      amount: 600000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Act
    const result = getRemainingPerMeal({
      budget,
      meals,
      month: "2026-08",
      today: "2026-08-02",
    });

    // Assert
    expect(result).toBeDefined();
    expect(typeof result.dailyAllowance).toBe("number");
    expect(typeof result.todayRemaining).toBe("number");
    expect(typeof result.isOver).toBe("boolean");
    expect(result.dailyAllowance).toBe(13333);
    expect(result.todayRemaining).toBe(9333);
    expect(result.isOver).toBe(false);
  });

  // ────────────────────────────────────────────────────────────
  // AC-2: 초과 시 todayRemaining=0 + isOver:true
  // ────────────────────────────────────────────────────────────

  it("AC-2: 초과 상태 시 todayRemaining=0 + isOver:true (고정)", () => {
    // Arrange: 누적 지출이 예산을 초과한 상태
    const { getRemainingPerMeal } = require("@/lib/calc");
    const mealsBig: MealRecord[] = [
      // 이번 달 누적 600k 이상 (예산 초과)
      ...Array.from({ length: 65 }, (_, i) => ({
        id: `meal-${i}`,
        date: "2026-08-01",
        mealType: "lunch" as const,
        category: "delivery" as const,
        amount: 10000,
        memo: "",
        createdAt: Date.now(),
      })),
    ];
    const budget: MonthlyBudget = {
      month: "2026-08",
      amount: 600000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Act
    const result = getRemainingPerMeal({
      budget,
      meals: mealsBig,
      month: "2026-08",
      today: "2026-08-02",
    });

    // Assert
    expect(result.todayRemaining).toBe(0); // 음수 클램프
    expect(result.isOver).toBe(true);
  });

  // ────────────────────────────────────────────────────────────
  // AC-3: 예산 0 입력 시 Infinity/NaN 없음
  // ────────────────────────────────────────────────────────────

  it("AC-3: 예산 0 방어 (Infinity/NaN 방지)", () => {
    // Arrange: 예산이 미설정(0)인 경우
    const { getRemainingPerMeal } = require("@/lib/calc");
    const meals: MealRecord[] = [
      {
        id: "1",
        date: "2026-08-02",
        mealType: "lunch",
        category: "delivery",
        amount: 5000,
        memo: "",
        createdAt: Date.now(),
      },
    ];
    const budget: MonthlyBudget = {
      month: "2026-08",
      amount: 0, // 예산 미설정
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Act
    const result = getRemainingPerMeal({
      budget,
      meals,
      month: "2026-08",
      today: "2026-08-02",
    });

    // Assert
    expect(Number.isFinite(result.dailyAllowance)).toBe(true);
    expect(Number.isNaN(result.dailyAllowance)).toBe(false);
    expect(Number.isFinite(result.todayRemaining)).toBe(true);
    expect(Number.isNaN(result.todayRemaining)).toBe(false);
    expect(result.dailyAllowance).toBe(0);
    expect(result.todayRemaining).toBe(0);
  });

  // ────────────────────────────────────────────────────────────
  // getPaceBadge: 페이스 판정 규칙
  // ideal = monthBudget * (경과일/총일수)
  // ≤ ideal*0.9 → ahead
  // ≤ ideal*1.1 → ontrack
  // > ideal*1.1 → over
  // ────────────────────────────────────────────────────────────

  it("getPaceBadge: ahead 판정 (누적 ≤ ideal×0.9)", () => {
    // Arrange: 8월 31일 기준, 경과 2일
    // ideal = 600k * (2/31) ≈ 38709, ahead = ≤ 34838
    const { getPaceBadge } = require("@/lib/calc");

    // Act
    const result = getPaceBadge({
      budget: 600000,
      spent: 30000, // ≤ ideal*0.9
      month: "2026-08",
      today: "2026-08-02",
    });

    // Assert
    expect(result).toBe("ahead");
  });

  it("getPaceBadge: ontrack 판정 (ideal×0.9 < 누적 ≤ ideal×1.1)", () => {
    // Arrange
    const { getPaceBadge } = require("@/lib/calc");

    // Act: 경과 2일, ideal ≈ 38709
    // ontrack 범위: 34838 < 누적 ≤ 42580
    const result = getPaceBadge({
      budget: 600000,
      spent: 40000,
      month: "2026-08",
      today: "2026-08-02",
    });

    // Assert
    expect(result).toBe("ontrack");
  });

  it("getPaceBadge: over 판정 (누적 > ideal×1.1)", () => {
    // Arrange: 경과 2일, ideal ≈ 38709, over = > 42580
    const { getPaceBadge } = require("@/lib/calc");

    // Act
    const result = getPaceBadge({
      budget: 600000,
      spent: 50000, // > ideal*1.1
      month: "2026-08",
      today: "2026-08-02",
    });

    // Assert
    expect(result).toBe("over");
  });

  // ────────────────────────────────────────────────────────────
  // getSaving: 최근 30일 배달 지출 × 0.3 (반올림)
  // ────────────────────────────────────────────────────────────

  it("getSaving: 최근 30일 배달 지출 30% 절약액 계산", () => {
    // Arrange: 최근 30일 배달 300k
    const { getSaving } = require("@/lib/calc");
    const meals: MealRecord[] = [
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `meal-${i}`,
        date: "2026-08-02",
        mealType: "lunch" as const,
        category: "delivery" as const,
        amount: 30000,
        memo: "",
        createdAt: Date.now(),
      })),
    ];

    // Act
    const result = getSaving({ meals, today: "2026-08-02" });

    // Assert
    expect(result).toBeDefined();
    expect(typeof result.savingAmount).toBe("number");
    expect(result.savingAmount).toBe(90000); // 300k * 0.3
  });

  it("getSaving: 배달 기록 없음 시 0원 반환", () => {
    // Arrange
    const { getSaving } = require("@/lib/calc");
    const mealsNoDelivery: MealRecord[] = [
      {
        id: "1",
        date: "2026-08-02",
        mealType: "lunch",
        category: "homemade",
        amount: 5000,
        memo: "",
        createdAt: Date.now(),
      },
    ];

    // Act
    const result = getSaving({ meals: mealsNoDelivery, today: "2026-08-02" });

    // Assert
    expect(result.savingAmount).toBe(0);
  });

  // ────────────────────────────────────────────────────────────
  // getWeeklyStats: 최근 7일 카테고리별 합계·비율·총액
  // ────────────────────────────────────────────────────────────

  it("getWeeklyStats: 카테고리별 합계 및 비율 계산", () => {
    // Arrange: 최근 7일 배달 50k, 외식 30k, 직접조리 20k
    const { getWeeklyStats } = require("@/lib/calc");
    const meals: MealRecord[] = [
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `meal-${i}`,
        date: "2026-08-02",
        mealType: "lunch" as const,
        category: "delivery" as const,
        amount: 10000,
        memo: "",
        createdAt: Date.now(),
      })),
      ...Array.from({ length: 3 }, (_, i) => ({
        id: `meal-5-${i}`,
        date: "2026-08-02",
        mealType: "lunch" as const,
        category: "dining_out" as const,
        amount: 10000,
        memo: "",
        createdAt: Date.now(),
      })),
      ...Array.from({ length: 2 }, (_, i) => ({
        id: `meal-8-${i}`,
        date: "2026-08-02",
        mealType: "lunch" as const,
        category: "homemade" as const,
        amount: 10000,
        memo: "",
        createdAt: Date.now(),
      })),
    ];

    // Act
    const result = getWeeklyStats({ meals, today: "2026-08-02" });

    // Assert
    expect(result).toBeDefined();
    expect(result.totalByCategory).toBeDefined();
    expect(result.categoryPercentage).toBeDefined();
    expect(result.totalAmount).toBe(100000);
    expect(result.totalByCategory.delivery).toBe(50000);
    expect(result.totalByCategory.dining_out).toBe(30000);
    expect(result.totalByCategory.homemade).toBe(20000);
    expect(result.categoryPercentage.delivery).toBe(50);
    expect(result.categoryPercentage.dining_out).toBe(30);
    expect(result.categoryPercentage.homemade).toBe(20);
  });

  it("getWeeklyStats: 최근 7일만 집계 (8일 전 기록 제외)", () => {
    // Arrange: 오늘 기준 7일 범위만 포함
    const { getWeeklyStats } = require("@/lib/calc");
    const meals: MealRecord[] = [
      {
        id: "1",
        date: "2026-08-02", // 오늘 (포함)
        mealType: "lunch" as const,
        category: "delivery" as const,
        amount: 10000,
        memo: "",
        createdAt: Date.now(),
      },
      {
        id: "2",
        date: "2026-07-26", // 7일 전 (포함)
        mealType: "lunch" as const,
        category: "delivery" as const,
        amount: 10000,
        memo: "",
        createdAt: Date.now(),
      },
      {
        id: "3",
        date: "2026-07-25", // 8일 전 (제외)
        mealType: "lunch" as const,
        category: "delivery" as const,
        amount: 10000,
        memo: "",
        createdAt: Date.now(),
      },
    ];

    // Act
    const result = getWeeklyStats({ meals, today: "2026-08-02" });

    // Assert
    expect(result.totalAmount).toBe(20000); // 8일전 기록 제외
    expect(result.totalByCategory.delivery).toBe(20000);
  });

  it("getWeeklyStats: 데이터 없음 시 0 반환", () => {
    // Arrange
    const { getWeeklyStats } = require("@/lib/calc");

    // Act
    const result = getWeeklyStats({ meals: [], today: "2026-08-02" });

    // Assert
    expect(result.totalAmount).toBe(0);
    expect(result.totalByCategory.delivery).toBe(0);
    expect(result.totalByCategory.dining_out).toBe(0);
    expect(result.totalByCategory.homemade).toBe(0);
  });

  // ────────────────────────────────────────────────────────────
  // getOverBudgetStatus: 90%/100% 구간 판정
  // ────────────────────────────────────────────────────────────

  it("getOverBudgetStatus: 정상 (90% 미만)", () => {
    // Arrange: 예산 600k, 지출 500k (83%)
    const { getOverBudgetStatus } = require("@/lib/calc");

    // Act
    const result = getOverBudgetStatus({
      budget: 600000,
      spent: 500000,
    });

    // Assert
    expect(result).toEqual({ status: "normal" });
  });

  it("getOverBudgetStatus: 임박 (90% ~ 100%)", () => {
    // Arrange: 예산 600k, 지출 550k (92%)
    const { getOverBudgetStatus } = require("@/lib/calc");

    // Act
    const result = getOverBudgetStatus({
      budget: 600000,
      spent: 550000,
    });

    // Assert
    expect(result).toEqual({
      status: "approaching",
      remainingBudget: 50000,
    });
  });

  it("getOverBudgetStatus: 초과 (100% 이상)", () => {
    // Arrange: 예산 600k, 지출 650k
    const { getOverBudgetStatus } = require("@/lib/calc");

    // Act
    const result = getOverBudgetStatus({
      budget: 600000,
      spent: 650000,
    });

    // Assert
    expect(result).toEqual({
      status: "exceeded",
      overAmount: 50000,
    });
  });

  it("getOverBudgetStatus: 예산 0 방어 (표시 안 함)", () => {
    // Arrange: 예산 미설정(0)
    const { getOverBudgetStatus } = require("@/lib/calc");

    // Act
    const result = getOverBudgetStatus({
      budget: 0,
      spent: 100,
    });

    // Assert
    expect(result).toEqual({ status: "normal" }); // 비표시
  });

  // ────────────────────────────────────────────────────────────
  // formatKRW: 금액 포맷 (천단위 콤마 + "원", 음수 0원)
  // ────────────────────────────────────────────────────────────

  it("formatKRW: 기본 포맷 (천단위 콤마 + 원)", () => {
    // Arrange
    const { formatKRW } = require("@/lib/format");

    // Act
    const result = formatKRW(123456);

    // Assert
    expect(result).toBe("123,456원");
  });

  it("formatKRW: 만 단위 포맷", () => {
    // Arrange
    const { formatKRW } = require("@/lib/format");

    // Act
    const result = formatKRW(1200000);

    // Assert
    expect(result).toBe("1,200,000원");
  });

  it("formatKRW: 0원", () => {
    // Arrange
    const { formatKRW } = require("@/lib/format");

    // Act
    const result = formatKRW(0);

    // Assert
    expect(result).toBe("0원");
  });

  it("formatKRW: 음수 → 0원 클램프", () => {
    // Arrange
    const { formatKRW } = require("@/lib/format");

    // Act
    const result = formatKRW(-5000);

    // Assert
    expect(result).toBe("0원");
  });

  it("formatKRW: 소수점 → 내림 처리", () => {
    // Arrange
    const { formatKRW } = require("@/lib/format");

    // Act
    const result = formatKRW(1234.56);

    // Assert
    expect(result).toBe("1,234원"); // 소수점 제거
  });

  // ────────────────────────────────────────────────────────────
  // Type checking (AC-4: tsc --noEmit 통과)
  // ────────────────────────────────────────────────────────────

  it("AC-4: 반환 타입 검증 (RemainingResult)", () => {
    // Arrange
    const { getRemainingPerMeal } = require("@/lib/calc");
    const meals: MealRecord[] = [];
    const budget: MonthlyBudget = {
      month: "2026-08",
      amount: 600000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Act
    const result: RemainingResult = getRemainingPerMeal({
      budget,
      meals,
      month: "2026-08",
      today: "2026-08-02",
    });

    // Assert
    expect(result).toBeDefined();
    expect("dailyAllowance" in result).toBe(true);
    expect("todayRemaining" in result).toBe(true);
    expect("isOver" in result).toBe(true);
  });

  it("AC-4: 반환 타입 검증 (PaceBadge)", () => {
    // Arrange
    const { getPaceBadge } = require("@/lib/calc");

    // Act
    const result: PaceBadge = getPaceBadge({
      budget: 600000,
      spent: 100000,
      month: "2026-08",
      today: "2026-08-02",
    });

    // Assert
    const validBadges: PaceBadge[] = ["ahead", "ontrack", "over"];
    expect(validBadges.includes(result)).toBe(true);
  });

  it("AC-4: 반환 타입 검증 (WeeklyStats)", () => {
    // Arrange
    const { getWeeklyStats } = require("@/lib/calc");

    // Act
    const result: WeeklyStats = getWeeklyStats({
      meals: [],
      today: "2026-08-02",
    });

    // Assert
    expect(result).toBeDefined();
    expect("totalByCategory" in result).toBe(true);
    expect("categoryPercentage" in result).toBe(true);
    expect("totalAmount" in result).toBe(true);
  });

  it("AC-4: formatKRW 반환 타입 (string)", () => {
    // Arrange
    const { formatKRW } = require("@/lib/format");

    // Act
    const result = formatKRW(50000);

    // Assert
    expect(typeof result).toBe("string");
    expect(result.endsWith("원")).toBe(true);
  });
});
