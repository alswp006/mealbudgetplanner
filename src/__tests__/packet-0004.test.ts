import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import * as calc from "@/lib/calc";
import { AppDataProvider, useAppData } from "@/lib/store";

/**
 * TDD RED PHASE — 앱 상태 스토어 & 초기화 (packet-0004)
 *
 * useAppData() / AppDataProvider don't exist yet (src/lib/store.tsx).
 * These tests define the contract the Coder must implement.
 *
 * Design note baked into these tests: `overBudget` is derived from the
 * currently-saved budget's own `month` field (not from system "today"),
 * so tests never need to fake the system clock.
 */

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(AppDataProvider, null, children);
}

describe("앱 상태 스토어 & 초기화 (packet-0004)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("AC-1: useAppData() 반환 형태", () => {
    it("should expose budget, meals, checkins, loading, overBudget, actions after load", async () => {
      const { result } = renderHook(() => useAppData(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.budget).toBeNull();
      expect(result.current.meals).toEqual([]);
      expect(result.current.checkins).toEqual([]);
      expect(result.current.overBudget).toEqual({ over: false, excess: 0 });
      expect(typeof result.current.actions.saveBudget).toBe("function");
      expect(typeof result.current.actions.recordMeal).toBe("function");
      expect(typeof result.current.actions.removeMeal).toBe("function");
      expect(typeof result.current.actions.checkin).toBe("function");
    });

    it("should start with loading true before the initial localStorage load resolves", () => {
      const { result } = renderHook(() => useAppData(), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.meals).toEqual([]);
    });
  });

  describe("AC-2: pruneOldData가 마운트 시 정확히 1회 호출된다", () => {
    it("should call pruneOldData exactly once after mount", async () => {
      const pruneSpy = vi.spyOn(calc, "pruneOldData");

      const { result } = renderHook(() => useAppData(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(pruneSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("AC-3: 액션 호출 시 상태가 즉시 갱신되어 재렌더된다", () => {
    it("recordMeal should add a meal to state synchronously", async () => {
      const { result } = renderHook(() => useAppData(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.actions.recordMeal({
          date: "2026-08-16",
          slot: "lunch",
          category: "main",
          amount: 12000,
          memo: "점심 도시락",
        });
      });

      expect(result.current.meals).toHaveLength(1);
      expect(result.current.meals[0]).toMatchObject({
        date: "2026-08-16",
        slot: "lunch",
        category: "main",
        amount: 12000,
        memo: "점심 도시락",
      });
      expect(typeof result.current.meals[0].id).toBe("string");
    });

    it("removeMeal should remove the meal from state synchronously", async () => {
      const { result } = renderHook(() => useAppData(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.actions.recordMeal({
          date: "2026-08-16",
          slot: "dinner",
          category: "side",
          amount: 6000,
          memo: "",
        });
      });
      expect(result.current.meals).toHaveLength(1);
      const id = result.current.meals[0].id;

      act(() => {
        result.current.actions.removeMeal(id);
      });

      expect(result.current.meals).toHaveLength(0);
    });

    it("saveBudget should update budget in state synchronously", async () => {
      const { result } = renderHook(() => useAppData(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.actions.saveBudget({ month: "2026-08", totalBudget: 500000 });
      });

      expect(result.current.budget).toMatchObject({
        month: "2026-08",
        totalBudget: 500000,
      });
    });
  });

  describe("AC-4: recordMeal로 예산 초과 시 overBudget이 즉시 반영된다", () => {
    it("overBudget.over should flip to true once spend exceeds the saved budget", async () => {
      const { result } = renderHook(() => useAppData(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.actions.saveBudget({ month: "2026-08", totalBudget: 10000 });
      });
      expect(result.current.overBudget).toEqual({ over: false, excess: 0 });

      act(() => {
        result.current.actions.recordMeal({
          date: "2026-08-16",
          slot: "lunch",
          category: "main",
          amount: 15000,
          memo: "",
        });
      });

      expect(result.current.overBudget).toEqual({ over: true, excess: 5000 });
    });

    it("overBudget should stay false when spend is within budget", async () => {
      const { result } = renderHook(() => useAppData(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.actions.saveBudget({ month: "2026-08", totalBudget: 50000 });
      });
      act(() => {
        result.current.actions.recordMeal({
          date: "2026-08-16",
          slot: "lunch",
          category: "side",
          amount: 8000,
          memo: "",
        });
      });

      expect(result.current.overBudget).toEqual({ over: false, excess: 0 });
    });
  });

  describe("에러: 저장 실패(quota) 시 Toast용 에러 상태를 반환한다", () => {
    it("should set error to { reason: 'quota' } when persisting a budget fails", async () => {
      const { result } = renderHook(() => useAppData(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        const err = new Error("quota exceeded");
        err.name = "QuotaExceededError";
        throw err;
      });

      act(() => {
        result.current.actions.saveBudget({ month: "2026-08", totalBudget: 500000 });
      });

      expect(result.current.error).toEqual({ reason: "quota" });

      setItemSpy.mockRestore();
    });
  });
});
