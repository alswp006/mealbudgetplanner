import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type {
  Budget,
  MealRecord,
  CheckinLog,
  AppFlags,
  MealSlot,
  MealCategory,
} from "@/lib/types";

/**
 * TDD RED PHASE: 데이터 레이어 공개 API 계약
 *
 * Packet: 데이터 레이어 공개 API 계약을 SPEC AC 기준으로 고정하고 단일 배럴로 재노출
 *
 * Expected barrel exports from src/data/index.ts:
 * - setBudget(month: string, totalBudget: number): Budget
 * - getBudget(month: string): Budget | null
 * - addMeal(input: Omit<MealRecord,'id'|'createdAt'>): MealRecord
 * - getMealsByMonth(month: string): MealRecord[]
 * - getMonthSpent(month: string): number
 * - getCategorySpent(month: string, category: MealCategory): number
 * - getRemainingBudget(month: string): number | null
 * - getCheckin(date: string): CheckinLog | null
 * - setCheckin(date: string, paceBadge: CheckinLog["paceBadge"]): CheckinLog
 * - getFlags(): AppFlags
 * - setFlags(data: Partial<AppFlags>): void
 * - Budget, MealRecord, CheckinLog, AppFlags, MealSlot, MealCategory types
 */

// Dynamically import the barrel to allow tests to run even if not yet implemented
let dataLayer: any;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  // This will fail initially (RED phase) until src/data/index.ts exists
  try {
    dataLayer = require("@/data/index");
  } catch (e) {
    // Intentional: tests expect this to fail until implementation
    dataLayer = {};
  }
});

afterEach(() => {
  localStorage.clear();
});

describe("데이터 레이어 공개 API 계약 (AC-1 ~ AC-4)", () => {
  describe("AC-1: 식사 저장 후 재조회", () => {
    it("AC-1[P0]: addMeal이 id·createdAt을 부여하고 저장, getMealsByMonth가 반환", () => {
      // Arrange
      const input = {
        date: "2026-08-01",
        slot: "lunch" as MealSlot,
        category: "delivery" as MealCategory,
        amount: 12000,
        memo: "점심",
      };

      // Act
      const saved = dataLayer.addMeal(input);

      // Assert
      expect(saved).toBeDefined();
      expect(saved.id).toBeDefined();
      expect(typeof saved.id).toBe("string");
      expect(saved.id.length).toBeGreaterThan(0);

      expect(saved.createdAt).toBeDefined();
      expect(typeof saved.createdAt).toBe("string");
      expect(saved.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO8601

      expect(saved.date).toBe("2026-08-01");
      expect(saved.slot).toBe("lunch");
      expect(saved.category).toBe("delivery");
      expect(saved.amount).toBe(12000);
      expect(saved.memo).toBe("점심");

      // Re-query the same month
      const records = dataLayer.getMealsByMonth("2026-08");
      expect(records).toBeDefined();
      expect(Array.isArray(records)).toBe(true);
      expect(records).toHaveLength(1);
      expect(records[0].id).toBe(saved.id);
      expect(records[0].date).toBe("2026-08-01");
      expect(records[0].amount).toBe(12000);
    });

    it("AC-1[P0]: 여러 달에 걸친 식사는 각각 필터링되어 반환", () => {
      // Arrange
      const meal1 = dataLayer.addMeal({
        date: "2026-08-01",
        slot: "lunch" as MealSlot,
        category: "delivery" as MealCategory,
        amount: 12000,
        memo: "점심",
      });

      const meal2 = dataLayer.addMeal({
        date: "2026-08-15",
        slot: "dinner" as MealSlot,
        category: "dining_out" as MealCategory,
        amount: 35000,
        memo: "저녁",
      });

      const meal3 = dataLayer.addMeal({
        date: "2026-09-01",
        slot: "breakfast" as MealSlot,
        category: "home_cooked" as MealCategory,
        amount: 5000,
        memo: "아침",
      });

      // Act & Assert
      const aug = dataLayer.getMealsByMonth("2026-08");
      expect(aug).toHaveLength(2);
      expect(aug.map((m: MealRecord) => m.id)).toContain(meal1.id);
      expect(aug.map((m: MealRecord) => m.id)).toContain(meal2.id);

      const sep = dataLayer.getMealsByMonth("2026-09");
      expect(sep).toHaveLength(1);
      expect(sep[0].id).toBe(meal3.id);

      const oct = dataLayer.getMealsByMonth("2026-10");
      expect(oct).toHaveLength(0);
    });
  });

  describe("AC-2: 월 소비 합계 계산", () => {
    it("AC-2[P0]: getMonthSpent이 해당 월 amount 합계를 정수로 반환", () => {
      // Arrange
      dataLayer.addMeal({
        date: "2026-08-01",
        slot: "lunch" as MealSlot,
        category: "delivery" as MealCategory,
        amount: 12000,
        memo: "",
      });

      dataLayer.addMeal({
        date: "2026-08-05",
        slot: "dinner" as MealSlot,
        category: "dining_out" as MealCategory,
        amount: 8000,
        memo: "",
      });

      dataLayer.addMeal({
        date: "2026-08-10",
        slot: "breakfast" as MealSlot,
        category: "home_cooked" as MealCategory,
        amount: 5000,
        memo: "",
      });

      // Act
      const spent = dataLayer.getMonthSpent("2026-08");

      // Assert
      expect(spent).toBe(25000);
      expect(typeof spent).toBe("number");
      expect(Number.isInteger(spent)).toBe(true);
    });

    it("AC-2[P0]: 다른 달의 지출은 포함되지 않음", () => {
      // Arrange
      dataLayer.addMeal({
        date: "2026-08-01",
        slot: "lunch" as MealSlot,
        category: "delivery" as MealCategory,
        amount: 15000,
        memo: "",
      });

      dataLayer.addMeal({
        date: "2026-09-01",
        slot: "lunch" as MealSlot,
        category: "delivery" as MealCategory,
        amount: 20000,
        memo: "",
      });

      // Act
      const aug = dataLayer.getMonthSpent("2026-08");
      const sep = dataLayer.getMonthSpent("2026-09");

      // Assert
      expect(aug).toBe(15000);
      expect(sep).toBe(20000);
    });

    it("AC-2[P0]: 기록이 없으면 0을 반환", () => {
      // Act
      const spent = dataLayer.getMonthSpent("2026-08");

      // Assert
      expect(spent).toBe(0);
    });
  });

  describe("AC-3: 예산 저장·수정 및 타임스탐프", () => {
    it("AC-3[P0]: setBudget 호출 후 getBudget이 저장된 값을 반환하고 createdAt·updatedAt 설정", () => {
      // Arrange
      const month = "2026-08";
      const budget = 500000;

      // Act
      const saved = dataLayer.setBudget(month, budget);

      // Assert
      expect(saved).toBeDefined();
      expect(saved.month).toBe("2026-08");
      expect(saved.totalBudget).toBe(500000);
      expect(saved.createdAt).toBeDefined();
      expect(saved.updatedAt).toBeDefined();
      expect(typeof saved.createdAt).toBe("string");
      expect(typeof saved.updatedAt).toBe("string");

      // Re-query
      const fetched = dataLayer.getBudget(month);
      expect(fetched).toBeDefined();
      expect(fetched.totalBudget).toBe(500000);
      expect(fetched.createdAt).toBe(saved.createdAt);
      expect(fetched.updatedAt).toBe(saved.updatedAt);
    });

    it("AC-3[P0]: setBudget 두 번 호출 후 updatedAt > createdAt 이고 totalBudget이 최신값", async () => {
      // Arrange
      const month = "2026-08";
      const budget1 = 500000;
      const budget2 = 600000;

      // Act 1: First save
      const first = dataLayer.setBudget(month, budget1);
      const createdAt = first.createdAt;

      // Small delay to ensure updatedAt differs
      const now1 = new Date(first.updatedAt).getTime();

      // Act 2: Update after small delay
      await new Promise((resolve) => setTimeout(resolve, 10));
      const second = dataLayer.setBudget(month, budget2);

      // Assert
      expect(second.totalBudget).toBe(600000);
      expect(second.createdAt).toBe(createdAt); // createdAt preserved
      expect(second.updatedAt).not.toBe(first.updatedAt); // updatedAt changed
      expect(new Date(second.updatedAt).getTime()).toBeGreaterThan(now1);

      // Verify getter
      const fetched = dataLayer.getBudget(month);
      expect(fetched.totalBudget).toBe(600000);
      expect(fetched.updatedAt).toBe(second.updatedAt);
    });

    it("AC-3[P0]: getBudget은 존재하지 않는 달에 null 반환", () => {
      // Act
      const result = dataLayer.getBudget("2026-08");

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("AC-4: 손상된 JSON 방어 및 에러 핸들링", () => {
    it("AC-4[W][P1]: localStorage에 손상된 JSON이 저장되어 있어도 getMealsByMonth가 []을 반환하고 console.error 미출력", () => {
      // Arrange
      localStorage.setItem("mbp.meals", "{invalid json");
      const consoleSpy = vi.spyOn(console, "error");

      // Act
      const records = dataLayer.getMealsByMonth("2026-08");

      // Assert
      expect(records).toBeDefined();
      expect(Array.isArray(records)).toBe(true);
      expect(records).toHaveLength(0);
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("AC-4[W][P1]: 손상된 예산 JSON도 getBudget이 null 반환, console.error 미출력", () => {
      // Arrange
      localStorage.setItem("mbp.budgets", '{"2026-08": {invalid}');
      const consoleSpy = vi.spyOn(console, "error");

      // Act
      const budget = dataLayer.getBudget("2026-08");

      // Assert
      expect(budget).toBeNull();
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("AC-4[W][P1]: 손상된 체크인 JSON도 getCheckin이 null 반환", () => {
      // Arrange
      localStorage.setItem("mbp.checkins", "{invalid");
      const consoleSpy = vi.spyOn(console, "error");

      // Act
      const checkin = dataLayer.getCheckin("2026-08-01");

      // Assert
      expect(checkin).toBeNull();
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("AC-5: 저장 용량 초과 방어 (QuotaExceededError)", () => {
    it("AC-5[W][P1]: addMeal 저장 중 QuotaExceededError 발생 시 에러 반환", () => {
      // Arrange
      const input = {
        date: "2026-08-01",
        slot: "lunch" as MealSlot,
        category: "delivery" as MealCategory,
        amount: 12000,
        memo: "점심",
      };

      // Mock localStorage.setItem to throw QuotaExceededError
      const originalSetItem = localStorage.setItem;
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        const error = new Error("QuotaExceededError");
        error.name = "QuotaExceededError";
        throw error;
      });

      // Act
      const result = dataLayer.addMeal(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("quota");

      // Cleanup
      localStorage.setItem = originalSetItem;
    });
  });

  describe("Additional derived functions", () => {
    describe("getCategorySpent", () => {
      it("getCategorySpent: 특정 카테고리의 월 소비 합계를 반환", () => {
        // Arrange
        dataLayer.addMeal({
          date: "2026-08-01",
          slot: "lunch" as MealSlot,
          category: "delivery" as MealCategory,
          amount: 12000,
          memo: "",
        });

        dataLayer.addMeal({
          date: "2026-08-05",
          slot: "lunch" as MealSlot,
          category: "delivery" as MealCategory,
          amount: 8000,
          memo: "",
        });

        dataLayer.addMeal({
          date: "2026-08-10",
          slot: "dinner" as MealSlot,
          category: "dining_out" as MealCategory,
          amount: 35000,
          memo: "",
        });

        dataLayer.addMeal({
          date: "2026-08-15",
          slot: "breakfast" as MealSlot,
          category: "home_cooked" as MealCategory,
          amount: 5000,
          memo: "",
        });

        // Act
        const deliverySpent = dataLayer.getCategorySpent("2026-08", "delivery");
        const diningSpent = dataLayer.getCategorySpent("2026-08", "dining_out");
        const homeSpent = dataLayer.getCategorySpent("2026-08", "home_cooked");

        // Assert
        expect(deliverySpent).toBe(20000);
        expect(diningSpent).toBe(35000);
        expect(homeSpent).toBe(5000);
        expect(deliverySpent + diningSpent + homeSpent).toBe(60000);
      });

      it("getCategorySpent: 기록이 없으면 0 반환", () => {
        // Act
        const spent = dataLayer.getCategorySpent("2026-08", "delivery");

        // Assert
        expect(spent).toBe(0);
      });
    });

    describe("getRemainingBudget", () => {
      it("getRemainingBudget: 예산 - 지출을 반환", () => {
        // Arrange
        dataLayer.setBudget("2026-08", 500000);
        dataLayer.addMeal({
          date: "2026-08-01",
          slot: "lunch" as MealSlot,
          category: "delivery" as MealCategory,
          amount: 150000,
          memo: "",
        });

        dataLayer.addMeal({
          date: "2026-08-05",
          slot: "dinner" as MealSlot,
          category: "dining_out" as MealCategory,
          amount: 200000,
          memo: "",
        });

        // Act
        const remaining = dataLayer.getRemainingBudget("2026-08");

        // Assert
        expect(remaining).toBe(150000); // 500000 - 350000
        expect(typeof remaining).toBe("number");
      });

      it("getRemainingBudget: 예산이 없으면 null 반환", () => {
        // Act
        const remaining = dataLayer.getRemainingBudget("2026-08");

        // Assert
        expect(remaining).toBeNull();
      });

      it("getRemainingBudget: 예산을 초과해도 음수 반환", () => {
        // Arrange
        dataLayer.setBudget("2026-08", 100000);
        dataLayer.addMeal({
          date: "2026-08-01",
          slot: "lunch" as MealSlot,
          category: "delivery" as MealCategory,
          amount: 150000,
          memo: "",
        });

        // Act
        const remaining = dataLayer.getRemainingBudget("2026-08");

        // Assert
        expect(remaining).toBe(-50000);
      });
    });
  });

  describe("CheckinLog operations", () => {
    it("getCheckin: 존재하지 않는 날짜에 null 반환", () => {
      // Act
      const result = dataLayer.getCheckin("2026-08-01");

      // Assert
      expect(result).toBeNull();
    });

    it("setCheckin: 체크인 기록을 저장하고 getCheckin이 반환", () => {
      // Arrange
      const date = "2026-08-01";
      const paceBadge = "ahead";

      // Act
      const saved = dataLayer.setCheckin(date, paceBadge);

      // Assert
      expect(saved).toBeDefined();
      expect(saved.date).toBe("2026-08-01");
      expect(saved.paceBadge).toBe("ahead");
      expect(saved.grantedAt).toBeDefined();
      expect(typeof saved.grantedAt).toBe("string");

      // Re-query
      const fetched = dataLayer.getCheckin(date);
      expect(fetched).toBeDefined();
      expect(fetched.date).toBe("2026-08-01");
      expect(fetched.paceBadge).toBe("ahead");
    });

    it("setCheckin: 같은 날 여러 번 호출 시 최신값으로 덮어씀", () => {
      // Arrange
      const date = "2026-08-01";

      // Act
      const first = dataLayer.setCheckin(date, "ahead");
      const second = dataLayer.setCheckin(date, "ontrack");

      // Assert
      expect(second.paceBadge).toBe("ontrack");
      const fetched = dataLayer.getCheckin(date);
      expect(fetched.paceBadge).toBe("ontrack");
    });
  });

  describe("AppFlags operations", () => {
    it("getFlags: 최초 호출 시 기본값 반환", () => {
      // Act
      const flags = dataLayer.getFlags();

      // Assert
      expect(flags).toBeDefined();
      expect(typeof flags).toBe("object");
      expect(flags.aiNoticeAcknowledged).toBe(false);
    });

    it("setFlags: 부분 업데이트 후 getFlags가 반영된 값 반환", () => {
      // Arrange
      dataLayer.setFlags({ aiNoticeAcknowledged: true });

      // Act
      const flags = dataLayer.getFlags();

      // Assert
      expect(flags.aiNoticeAcknowledged).toBe(true);
    });

    it("setFlags: 여러 필드 부분 업데이트", () => {
      // Arrange
      dataLayer.setFlags({ aiNoticeAcknowledged: true, overBudgetAlertedMonth: "2026-08" });

      // Act
      const flags = dataLayer.getFlags();

      // Assert
      expect(flags.aiNoticeAcknowledged).toBe(true);
      expect(flags.overBudgetAlertedMonth).toBe("2026-08");
    });
  });

  describe("Type exports from barrel", () => {
    it("dataLayer에서 필요한 모든 타입이 export되어 있음", () => {
      // Assert - check that types are exported (these won't exist until implementation)
      // Note: Can't test type exports at runtime directly in vitest, so this is a placeholder
      // The actual verification happens at tsc --noEmit time
      expect(dataLayer).toBeDefined();
    });
  });

  describe("Integration: 완전한 데이터 흐름", () => {
    it("Integration: 예산 설정 → 여러 식사 기록 → 월 소비 계산 → 남은 예산 조회", () => {
      // Arrange & Act
      const budget = dataLayer.setBudget("2026-08", 500000);
      expect(budget.totalBudget).toBe(500000);

      dataLayer.addMeal({
        date: "2026-08-01",
        slot: "breakfast" as MealSlot,
        category: "home_cooked" as MealCategory,
        amount: 5000,
        memo: "계란",
      });

      dataLayer.addMeal({
        date: "2026-08-01",
        slot: "lunch" as MealSlot,
        category: "delivery" as MealCategory,
        amount: 12000,
        memo: "점심",
      });

      dataLayer.addMeal({
        date: "2026-08-01",
        slot: "dinner" as MealSlot,
        category: "dining_out" as MealCategory,
        amount: 35000,
        memo: "저녁",
      });

      dataLayer.addMeal({
        date: "2026-08-02",
        slot: "lunch" as MealSlot,
        category: "delivery" as MealCategory,
        amount: 15000,
        memo: "점심",
      });

      // Assert
      const records = dataLayer.getMealsByMonth("2026-08");
      expect(records).toHaveLength(4);

      const spent = dataLayer.getMonthSpent("2026-08");
      expect(spent).toBe(67000);

      const deliverySpent = dataLayer.getCategorySpent("2026-08", "delivery");
      expect(deliverySpent).toBe(27000);

      const remaining = dataLayer.getRemainingBudget("2026-08");
      expect(remaining).toBe(433000);

      const checkin = dataLayer.setCheckin("2026-08-01", "ontrack");
      expect(checkin.paceBadge).toBe("ontrack");

      const flags = dataLayer.getFlags();
      expect(flags.aiNoticeAcknowledged).toBe(false);

      dataLayer.setFlags({ aiNoticeAcknowledged: true });
      expect(dataLayer.getFlags().aiNoticeAcknowledged).toBe(true);
    });
  });
});
