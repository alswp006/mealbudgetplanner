/**
 * Packet 0006: 홈 대시보드 / (허용금액+지표+빈/로딩)
 *
 * Covers:
 * - AC-1: SPEC 수치 시 히어로 9,333원, budget-card 남은 400,000원/지출 200,000원/진행률 33%
 * - AC-2: 예산 없으면 빈 상태 + 버튼 이동(/budget)
 * - AC-3: 마운트 직후 Skeleton -> 실데이터
 * - AC-4: 초과 시 히어로 0원, '식사 기록하기' -> /record
 *
 * @/lib/store's useDerived is mocked here (custom hook not covered by shared
 * helpers) so each test can control the exact derived shape it renders against.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, within, fireEvent } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockAll, mockNavigate, mockLocation } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

const { useDerivedMock } = vi.hoisted(() => ({ useDerivedMock: vi.fn() }));

vi.mock("@/lib/store", () => ({
  useDerived: useDerivedMock,
}));

mockAll();

import Home from "@/pages/Home";
import { AllowanceHero } from "@/components/AllowanceHero";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";

type MockAppData = {
  budget: { month: string; amount: number; createdAt: number; updatedAt: number } | null;
  meals: Array<{ date: string; amount: number }>;
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
    budget: { month: "2026-09", amount: 600000, createdAt: 1, updatedAt: 1 },
    meals: [],
    checkins: [],
    flags: { onboardingSeen: true, lastSimulationDate: "" },
    loading: false,
    refresh: vi.fn(),
    saveBudget: vi.fn(),
    recordMeal: vi.fn(),
    doCheckIn: vi.fn(),
    markSimulationSeen: vi.fn(),
    ...overrides,
  };
}

function makeDerived(overrides: Record<string, unknown> = {}) {
  return {
    remaining: { dailyAllowance: 13333, todayRemaining: 9333, isOver: false },
    weeklyStats: {
      totalByCategory: { delivery: 0, homemade: 0, dining_out: 0 },
      categoryPercentage: { delivery: 0, homemade: 0, dining_out: 0 },
      totalAmount: 0,
    },
    overStatus: { status: "normal" },
    todayCheckedIn: false,
    streak: 0,
    todayHasMeal: true,
    appData: makeAppData(),
    ...overrides,
  };
}

describe("Packet 0006: 홈 대시보드", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.state = null;
    useDerivedMock.mockReturnValue(makeDerived());
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-1[P0]: SPEC 수치 렌더
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-1[P0]: renders hero allowance 9,333원 and budget-card 남은/지출/진행률", () => {
    // budget=600,000 / 이번 달 지출=200,000 -> 남은=400,000, 진행률=33%
    // remaining.todayRemaining=9,333 (spec 수치)
    useDerivedMock.mockReturnValue(
      makeDerived({
        remaining: { dailyAllowance: 13333, todayRemaining: 9333, isOver: false },
        appData: makeAppData({
          budget: { month: "2026-09", amount: 600000, createdAt: 1, updatedAt: 1 },
          meals: [
            { date: "2026-09-01", amount: 4000 },
            { date: "2026-09-15", amount: 196000 },
          ],
        }),
      })
    );

    renderWithRouter(React.createElement(Home));

    const hero = screen.getByTestId("allowance-hero");
    expect(within(hero).getByText(/9,333원/)).toBeInTheDocument();
    expect(within(hero).getByText(/오늘 남은 끼니 허용 금액/)).toBeInTheDocument();

    const card = screen.getByTestId("budget-card");
    expect(within(card).getByText(/400,000원/)).toBeInTheDocument();
    expect(within(card).getByText(/200,000원/)).toBeInTheDocument();

    const progress = within(card).getByRole("progressbar");
    expect(progress).toHaveAttribute("aria-valuenow", "33");
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-2[P0]: 예산 없으면 빈 상태 + 버튼 이동
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-2[P0]: shows empty state and navigates to /budget when no budget is set", () => {
    useDerivedMock.mockReturnValue(
      makeDerived({
        remaining: { dailyAllowance: 0, todayRemaining: 0, isOver: false },
        appData: makeAppData({ budget: null, meals: [] }),
      })
    );

    renderWithRouter(React.createElement(Home));

    expect(screen.getByText(/이번 달 예산을 정해볼까요/)).toBeInTheDocument();

    const setupButton = screen.getByRole("button", { name: /예산 설정하기/ });
    fireEvent.click(setupButton);

    expect(mockNavigate).toHaveBeenCalledWith("/budget");
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it("AC-2: does not render budget-card when budget is missing", () => {
    useDerivedMock.mockReturnValue(
      makeDerived({
        appData: makeAppData({ budget: null, meals: [] }),
      })
    );

    renderWithRouter(React.createElement(Home));

    expect(screen.queryByTestId("budget-card")).not.toBeInTheDocument();
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-3: 마운트 직후 Skeleton -> 실데이터
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-3: renders Skeleton and no hero/card while loading", () => {
    useDerivedMock.mockReturnValue(
      makeDerived({
        appData: makeAppData({ loading: true }),
      })
    );

    renderWithRouter(React.createElement(Home));

    expect(document.querySelectorAll('[data-skeleton="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByTestId("allowance-hero")).not.toBeInTheDocument();
    expect(screen.queryByTestId("budget-card")).not.toBeInTheDocument();
  });

  it("AC-3: renders real data (no Skeleton) once loading is false", () => {
    useDerivedMock.mockReturnValue(
      makeDerived({
        appData: makeAppData({ loading: false }),
      })
    );

    renderWithRouter(React.createElement(Home));

    expect(document.querySelectorAll('[data-skeleton="true"]').length).toBe(0);
    expect(screen.getByTestId("allowance-hero")).toBeInTheDocument();
    expect(screen.getByTestId("budget-card")).toBeInTheDocument();
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-4[P0]: 초과 시 히어로 0원, '식사 기록하기' -> /record
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-4[P0]: shows hero 0원 when over budget and navigates to /record with success haptic", () => {
    useDerivedMock.mockReturnValue(
      makeDerived({
        remaining: { dailyAllowance: -2000, todayRemaining: 0, isOver: true },
        overStatus: { status: "exceeded", overAmount: 50000 },
        appData: makeAppData({
          budget: { month: "2026-09", amount: 300000, createdAt: 1, updatedAt: 1 },
          meals: [{ date: "2026-09-10", amount: 350000 }],
        }),
      })
    );

    renderWithRouter(React.createElement(Home));

    const hero = screen.getByTestId("allowance-hero");
    expect(within(hero).getByText(/0원/)).toBeInTheDocument();

    const recordButton = screen.getByRole("button", { name: /식사 기록하기/ });
    fireEvent.click(recordButton);

    expect(mockNavigate).toHaveBeenCalledWith("/record");
    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "success" });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Additional: location.state.recorded -> Toast '기록했어요'
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("shows '기록했어요' toast when navigated with location.state.recorded", () => {
    (mockLocation as { state: unknown }).state = { recorded: true };

    renderWithRouter(React.createElement(Home));

    expect(screen.getByText(/기록했어요/)).toBeInTheDocument();
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AllowanceHero — 분리된 컴포넌트 계약
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AllowanceHero: renders the given amount and fixed caption under its testId", () => {
    renderWithRouter(React.createElement(AllowanceHero, { amount: 9333, testId: "allowance-hero" }));

    const hero = screen.getByTestId("allowance-hero");
    expect(within(hero).getByText(/9,333원/)).toBeInTheDocument();
    expect(within(hero).getByText(/오늘 남은 끼니 허용 금액/)).toBeInTheDocument();
  });
});
