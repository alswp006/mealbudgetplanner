/**
 * Packet 0009: 주간 분석 페이지 /stats
 *
 * Covers:
 * - AC-1[P0]: 배달50,000/외식30,000/직접조리20,000 -> 도넛 50/30/20% + 범례에 카테고리별 금액 표시
 * - AC-2[P0]: data-testid="stats-card"에 "주간 총 식비 100,000원"(t2) + MiniBar 3개
 * - AC-3[P1]: 최근 7일 기록 0건 -> 빈 상태(Asset.ContentIcon + 안내 + "기록하러 가기") 표시, 도넛 미표시
 * - AC-4[P1]: 배달 최다 -> "이번 주는 배달에 가장 많이 썼어요" 피드백 + 3일↑ 기록 시 Sparkline + HEX 하드코딩 0
 * - 로딩: appData.loading=true -> Skeleton 표시, stats-card 미표시
 *
 * StatsPage / DonutChart are NOT YET IMPLEMENTED — this is the TDD red phase.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, within, fireEvent } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import type { MealRecord, WeeklyStats } from "@/lib/types";

const { useDerivedMock } = vi.hoisted(() => ({ useDerivedMock: vi.fn() }));

vi.mock("@/lib/store", () => ({
  useDerived: useDerivedMock,
}));

mockAll();

import StatsPage from "@/pages/StatsPage";
import { DonutChart } from "@/components/DonutChart";

// ── Test helpers ─────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function makeMeal(overrides: Partial<MealRecord> = {}): MealRecord {
  return {
    id: `meal-${Math.random().toString(36).slice(2)}`,
    date: daysAgo(0),
    mealType: "lunch",
    category: "delivery",
    amount: 10000,
    memo: "",
    createdAt: Date.now(),
    ...overrides,
  };
}

const EMPTY_WEEKLY_STATS: WeeklyStats = {
  totalByCategory: { delivery: 0, homemade: 0, dining_out: 0 },
  categoryPercentage: { delivery: 0, homemade: 0, dining_out: 0 },
  totalAmount: 0,
};

function defaultAppData(overrides: Record<string, unknown> = {}) {
  return {
    budget: null,
    meals: [] as MealRecord[],
    checkins: [],
    flags: { onboardingSeen: true, lastSimulationDate: "" },
    loading: false,
    refresh: vi.fn(),
    ...overrides,
  };
}

function makeDerived(overrides: Record<string, unknown> = {}) {
  return {
    weeklyStats: EMPTY_WEEKLY_STATS,
    appData: defaultAppData(),
    remaining: { dailyAllowance: 0, todayRemaining: 0, isOver: false },
    overStatus: { status: "normal" },
    todayCheckedIn: false,
    streak: 0,
    todayHasMeal: false,
    ...overrides,
  };
}

describe("Packet 0009: DonutChart 컴포넌트", () => {
  it("AC-1[P0]: segments(배달50,000/50%, 외식30,000/30%, 직접조리20,000/20%) -> 범례에 카테고리별 비율+금액 표시, HEX 미사용", () => {
    const { container } = renderWithRouter(
      React.createElement(DonutChart, {
        testId: "donut-chart",
        segments: [
          { key: "delivery", label: "배달", amount: 50000, percentage: 50 },
          { key: "dining_out", label: "외식", amount: 30000, percentage: 30 },
          { key: "homemade", label: "직접조리", amount: 20000, percentage: 20 },
        ],
      }),
    );

    const chart = screen.getByTestId("donut-chart");
    expect(within(chart).getByRole("img")).toBeInTheDocument();

    const delivery = screen.getByTestId("donut-legend-delivery");
    expect(delivery).toHaveTextContent("배달");
    expect(delivery).toHaveTextContent("50%");
    expect(delivery).toHaveTextContent("50,000원");

    const diningOut = screen.getByTestId("donut-legend-dining_out");
    expect(diningOut).toHaveTextContent("외식");
    expect(diningOut).toHaveTextContent("30%");
    expect(diningOut).toHaveTextContent("30,000원");

    const homemade = screen.getByTestId("donut-legend-homemade");
    expect(homemade).toHaveTextContent("직접조리");
    expect(homemade).toHaveTextContent("20%");
    expect(homemade).toHaveTextContent("20,000원");

    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}/);
  });
});

describe("Packet 0009: 주간 분석 페이지 /stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDerivedMock.mockReturnValue(makeDerived());
  });

  it("AC-1[P0]: 배달50,000/외식30,000/직접조리20,000 -> 도넛 50/30/20% + 범례에 금액 표시", () => {
    useDerivedMock.mockReturnValue(
      makeDerived({
        weeklyStats: {
          totalByCategory: { delivery: 50000, homemade: 20000, dining_out: 30000 },
          categoryPercentage: { delivery: 50, homemade: 20, dining_out: 30 },
          totalAmount: 100000,
        },
        appData: defaultAppData({ meals: [makeMeal()] }),
      }),
    );

    renderWithRouter(React.createElement(StatsPage));

    expect(screen.getByTestId("donut-chart")).toBeInTheDocument();

    const delivery = screen.getByTestId("donut-legend-delivery");
    expect(delivery).toHaveTextContent("50%");
    expect(delivery).toHaveTextContent("50,000원");

    const diningOut = screen.getByTestId("donut-legend-dining_out");
    expect(diningOut).toHaveTextContent("30%");
    expect(diningOut).toHaveTextContent("30,000원");

    const homemade = screen.getByTestId("donut-legend-homemade");
    expect(homemade).toHaveTextContent("20%");
    expect(homemade).toHaveTextContent("20,000원");
  });

  it("AC-2[P0]: stats-card에 '주간 총 식비 100,000원'(t2)과 MiniBar 3개가 위계 있게 표시된다", () => {
    useDerivedMock.mockReturnValue(
      makeDerived({
        weeklyStats: {
          totalByCategory: { delivery: 50000, homemade: 20000, dining_out: 30000 },
          categoryPercentage: { delivery: 50, homemade: 20, dining_out: 30 },
          totalAmount: 100000,
        },
        appData: defaultAppData({ meals: [makeMeal()] }),
      }),
    );

    renderWithRouter(React.createElement(StatsPage));

    const card = screen.getByTestId("stats-card");
    const totalText = within(card).getByText(/100,000원/);
    expect(totalText).toHaveAttribute("data-typography", "t2");

    const bars = within(card).getAllByRole("progressbar");
    expect(bars).toHaveLength(3);
    const values = bars
      .map((bar) => Number(bar.getAttribute("aria-valuenow")))
      .sort((a, b) => a - b);
    expect(values).toEqual([20, 30, 50]);
  });

  it("AC-3[P1]: 최근 7일 기록 0건 -> 빈 상태 표시, 도넛 미표시, '기록하러 가기' 클릭 시 /record로 이동", () => {
    useDerivedMock.mockReturnValue(makeDerived());

    renderWithRouter(React.createElement(StatsPage));

    expect(screen.queryByTestId("donut-chart")).not.toBeInTheDocument();
    expect(screen.getByText("이번 주 기록이 아직 없어요")).toBeInTheDocument();

    const cta = screen.getByRole("button", { name: /기록하러 가기/ });
    fireEvent.click(cta);
    expect(mockNavigate).toHaveBeenCalledWith("/record");
  });

  it("AC-4[P1]: 배달 최다 -> '이번 주는 배달에 가장 많이 썼어요' 피드백 + 3일 이상 기록 시 Sparkline 표시 + HEX 하드코딩 0", () => {
    useDerivedMock.mockReturnValue(
      makeDerived({
        weeklyStats: {
          totalByCategory: { delivery: 50000, homemade: 20000, dining_out: 30000 },
          categoryPercentage: { delivery: 50, homemade: 20, dining_out: 30 },
          totalAmount: 100000,
        },
        appData: defaultAppData({
          meals: [
            makeMeal({ date: daysAgo(0), category: "delivery", amount: 20000 }),
            makeMeal({ date: daysAgo(1), category: "delivery", amount: 15000 }),
            makeMeal({ date: daysAgo(2), category: "delivery", amount: 15000 }),
          ],
        }),
      }),
    );

    const { container } = renderWithRouter(React.createElement(StatsPage));

    expect(screen.getByText("이번 주는 배달에 가장 많이 썼어요")).toBeInTheDocument();
    expect(screen.getByTestId("stats-sparkline")).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}/);
  });

  it("로딩: appData.loading=true -> Skeleton 표시, stats-card는 아직 표시되지 않는다", () => {
    useDerivedMock.mockReturnValue(makeDerived({ appData: defaultAppData({ loading: true }) }));

    const { container } = renderWithRouter(React.createElement(StatsPage));

    expect(container.querySelectorAll('[data-skeleton="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByTestId("stats-card")).not.toBeInTheDocument();
  });
});
