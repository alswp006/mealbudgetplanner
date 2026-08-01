/**
 * Packet 0005: 예산 설정 페이지 /budget
 *
 * Covers:
 * - AC-1[P0]: 600000 저장 → saveBudget 호출(amount=600000, 이번 달) + Toast '예산이 저장되었어요' + 홈 복귀
 * - AC-2: 기존 500000 존재 시 500,000 프리필
 * - AC-3[P0]: 빈/0 → '예산 금액을 입력해주세요' 에러
 * - AC-4[P0]: 10000000 → '최대 9,999,999원까지 입력할 수 있어요' 에러
 * - Additional: 뒤로가기 시 저장 없이 복귀
 *
 * @/lib/store's useAppData is mocked here so each test can control the exact
 * appData shape (budget/saveBudget) it renders against, matching the pattern
 * used by packet-0006's useDerived mock.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { mockAll, mockNavigate, mockLocation } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

const { useAppDataMock } = vi.hoisted(() => ({ useAppDataMock: vi.fn() }));

vi.mock("@/lib/store", () => ({
  useAppData: useAppDataMock,
}));

mockAll();

import BudgetPage from "@/pages/BudgetPage";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";

type MockAppData = {
  budget: { month: string; amount: number; createdAt: number; updatedAt: number } | null;
  meals: unknown[];
  checkins: unknown[];
  flags: { onboardingSeen: boolean; lastSimulationDate: string };
  loading: boolean;
  refresh: ReturnType<typeof vi.fn>;
  saveBudget: ReturnType<typeof vi.fn>;
  recordMeal: ReturnType<typeof vi.fn>;
  doCheckIn: ReturnType<typeof vi.fn>;
  markSimulationSeen: ReturnType<typeof vi.fn>;
};

function makeAppData(overrides: Partial<MockAppData> = {}): MockAppData {
  return {
    budget: null,
    meals: [],
    checkins: [],
    flags: { onboardingSeen: true, lastSimulationDate: "" },
    loading: false,
    refresh: vi.fn(),
    saveBudget: vi.fn(() => ({ ok: true })),
    recordMeal: vi.fn(),
    doCheckIn: vi.fn(),
    markSimulationSeen: vi.fn(),
    ...overrides,
  };
}

describe("Packet 0005: 예산 설정 페이지 /budget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.state = null;
    useAppDataMock.mockReturnValue(makeAppData());
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-1[P0]: 저장 성공 -> saveBudget + Toast + 홈 복귀
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-1[P0]: saves 600000 -> saveBudget called with amount 600000, success haptic, Toast, navigate('/')", () => {
    const saveBudget = vi.fn((_budget: { month: string; amount: number }) => ({ ok: true }));
    useAppDataMock.mockReturnValue(makeAppData({ budget: null, saveBudget }));

    renderWithRouter(React.createElement(BudgetPage));

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "600000" } });

    const saveButton = screen.getByRole("button", { name: /저장하기/ });
    fireEvent.click(saveButton);

    expect(saveBudget).toHaveBeenCalledTimes(1);
    const savedBudget = saveBudget.mock.calls[0]?.[0];
    expect(savedBudget?.amount).toBe(600000);
    expect(savedBudget?.month).toMatch(/^\d{4}-\d{2}$/);

    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "success" });
    expect(screen.getByText(/예산이 저장되었어요/)).toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-2: 기존 예산 프리필
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-2: prefills existing budget 500000 as '500,000'", () => {
    useAppDataMock.mockReturnValue(
      makeAppData({
        budget: { month: "2026-08", amount: 500000, createdAt: 1, updatedAt: 1 },
      })
    );

    renderWithRouter(React.createElement(BudgetPage));

    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("500,000");
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-3[P0]: 빈/0 검증 에러
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-3[P0]: empty amount -> shows '예산 금액을 입력해주세요' and does not save", () => {
    const saveBudget = vi.fn(() => ({ ok: true }));
    useAppDataMock.mockReturnValue(makeAppData({ budget: null, saveBudget }));

    renderWithRouter(React.createElement(BudgetPage));

    const saveButton = screen.getByRole("button", { name: /저장하기/ });
    fireEvent.click(saveButton);

    expect(screen.getByText("예산 금액을 입력해주세요")).toBeInTheDocument();
    expect(saveBudget).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-3[P0]: amount 0 -> shows '예산 금액을 입력해주세요' and does not save", () => {
    const saveBudget = vi.fn(() => ({ ok: true }));
    useAppDataMock.mockReturnValue(makeAppData({ budget: null, saveBudget }));

    renderWithRouter(React.createElement(BudgetPage));

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "0" } });

    const saveButton = screen.getByRole("button", { name: /저장하기/ });
    fireEvent.click(saveButton);

    expect(screen.getByText("예산 금액을 입력해주세요")).toBeInTheDocument();
    expect(saveBudget).not.toHaveBeenCalled();
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-4[P0]: 상한 초과 검증 에러
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-4[P0]: amount 10000000 -> shows '최대 9,999,999원까지 입력할 수 있어요' and does not save", () => {
    const saveBudget = vi.fn(() => ({ ok: true }));
    useAppDataMock.mockReturnValue(makeAppData({ budget: null, saveBudget }));

    renderWithRouter(React.createElement(BudgetPage));

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "10000000" } });

    const saveButton = screen.getByRole("button", { name: /저장하기/ });
    fireEvent.click(saveButton);

    expect(screen.getByText("최대 9,999,999원까지 입력할 수 있어요")).toBeInTheDocument();
    expect(saveBudget).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Additional: 뒤로가기 -> 저장 없이 복귀
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("back button navigates away without calling saveBudget", () => {
    const saveBudget = vi.fn(() => ({ ok: true }));
    useAppDataMock.mockReturnValue(
      makeAppData({
        budget: { month: "2026-08", amount: 500000, createdAt: 1, updatedAt: 1 },
        saveBudget,
      })
    );

    renderWithRouter(React.createElement(BudgetPage));

    const backButton = screen.getByRole("button", { name: /뒤로/ });
    fireEvent.click(backButton);

    expect(saveBudget).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 입력 포맷: 자동 천단위 콤마
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("formats typed digits with thousands separators as the user types", () => {
    useAppDataMock.mockReturnValue(makeAppData({ budget: null }));

    renderWithRouter(React.createElement(BudgetPage));

    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1234567" } });

    expect(input.value).toBe("1,234,567");
  });
});
