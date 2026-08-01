/**
 * Packet 0010: 절약 시뮬레이션 페이지 /simulation (리워드 게이팅)
 *
 * Covers:
 * - AC-1[P0]: 최근 30일 배달지출 300,000원 -> 광고 시청 후 절약 90,000원 CountUp + markSimulationSeen(오늘) 저장
 * - AC-2[P1]: 광고 미시청 상태 -> 절약 금액 숫자 비노출(블러 게이트), 확인 버튼만 노출
 * - AC-3[P1]: 배달 기록 0건 -> 빈 상태 표시 + CTA 비활성
 * - AC-4[P1]: 광고 실패 -> Toast 노출, 결과 계속 비공개(블러 유지), markSimulationSeen 미호출, 크래시 없음
 * - AC-6[P2]: 당일 재진입(flags.lastSimulationDate===오늘) -> 광고 스킵, 바로 결과 노출
 *
 * SimulationPage is NOT YET IMPLEMENTED — this is the TDD red phase.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, within, fireEvent, waitFor } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockRouter } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import type { MealRecord, AppFlags, WriteResult } from "@/lib/types";

const { useAppDataMock } = vi.hoisted(() => ({ useAppDataMock: vi.fn() }));

vi.mock("@/lib/store", () => ({
  useAppData: useAppDataMock,
}));

mockTds();
mockAppsInToss();
mockRouter();
// NOTE: @/components/TossRewardAd is intentionally NOT mocked here — the ad-gating
// behavior itself (blur, watch, failure) is exactly what this packet's ACs verify.
// Only the underlying SDK (@apps-in-toss/web-framework) calls are controlled below.

import SimulationPage from "@/pages/SimulationPage";
import { loadFullScreenAd, showFullScreenAd } from "@apps-in-toss/web-framework";

// ── Test helpers ─────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function makeMeal(overrides: Partial<MealRecord> = {}): MealRecord {
  return {
    id: `meal-${Math.random().toString(36).slice(2)}`,
    date: today(),
    mealType: "lunch",
    category: "delivery",
    amount: 10000,
    memo: "",
    createdAt: Date.now(),
    ...overrides,
  };
}

function defaultFlags(overrides: Partial<AppFlags> = {}): AppFlags {
  return { onboardingSeen: true, lastSimulationDate: "", ...overrides };
}

function defaultAppData(overrides: Record<string, unknown> = {}) {
  return {
    budget: null,
    meals: [] as MealRecord[],
    checkins: [],
    flags: defaultFlags(),
    loading: false,
    refresh: vi.fn(),
    saveBudget: vi.fn((): WriteResult => ({ ok: true })),
    recordMeal: vi.fn((): WriteResult => ({ ok: true })),
    doCheckIn: vi.fn((): WriteResult => ({ ok: true })),
    markSimulationSeen: vi.fn((): WriteResult => ({ ok: true })),
    ...overrides,
  };
}

const WATCH_AD_NAME = /광고.*확인/;

async function clickWatchAdWhenReady() {
  const button = await screen.findByRole("button", { name: WATCH_AD_NAME });
  await waitFor(() => expect(button).not.toBeDisabled());
  fireEvent.click(button);
  return button;
}

describe("Packet 0010: 절약 시뮬레이션 페이지 /simulation (리워드 게이팅)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppDataMock.mockReturnValue(defaultAppData());
    vi.mocked(loadFullScreenAd).mockImplementation((opts: any) => {
      setTimeout(() => opts.onEvent?.({ type: "loaded" }), 0);
      return () => {};
    });
    vi.mocked(showFullScreenAd).mockImplementation((opts: any) => {
      setTimeout(() => opts.onEvent?.({ type: "rewarded" }), 0);
      return () => {};
    });
  });

  it("AC-1[P0]-a: 배달 300,000원 -> 광고 시청 후 절약 90,000원 CountUp 노출 + flags에 오늘 날짜 저장", async () => {
    const appData = defaultAppData({
      meals: [makeMeal({ category: "delivery", amount: 300000 })],
    });
    useAppDataMock.mockReturnValue(appData);

    renderWithRouter(React.createElement(SimulationPage));
    await clickWatchAdWhenReady();

    const result = await screen.findByTestId("saving-result");
    expect(within(result).getByText(/90,000원/)).toBeInTheDocument();
    expect(appData.markSimulationSeen).toHaveBeenCalledTimes(1);
    expect(appData.markSimulationSeen).toHaveBeenCalledWith(today());
  });

  it("AC-1[P0]-b: 배달 33,333원(반올림 경계) -> Math.round(33333*0.3)=10,000원으로 정확히 반올림 표시", async () => {
    const appData = defaultAppData({
      meals: [makeMeal({ category: "delivery", amount: 33333 })],
    });
    useAppDataMock.mockReturnValue(appData);

    renderWithRouter(React.createElement(SimulationPage));
    await clickWatchAdWhenReady();

    const result = await screen.findByTestId("saving-result");
    expect(within(result).getByText(/10,000원/)).toBeInTheDocument();
    expect(within(result).queryByText(/9,999/)).not.toBeInTheDocument();
  });

  it("AC-2[P1]: 광고 미시청 상태 -> 절약 금액 숫자 비노출(블러), 결과 카드 미표시", async () => {
    const appData = defaultAppData({
      meals: [makeMeal({ category: "delivery", amount: 300000 })],
    });
    useAppDataMock.mockReturnValue(appData);

    renderWithRouter(React.createElement(SimulationPage));

    await screen.findByRole("button", { name: WATCH_AD_NAME });
    expect(screen.queryByTestId("saving-result")).not.toBeInTheDocument();
    expect(screen.queryByText(/90,000원/)).not.toBeInTheDocument();
    expect(appData.markSimulationSeen).not.toHaveBeenCalled();
  });

  it("AC-3[P1]: 배달 기록 0건 -> 빈 상태 표시 + CTA 비활성, 결과 카드 없음", () => {
    const appData = defaultAppData({
      meals: [makeMeal({ category: "homemade", amount: 20000 })],
    });
    useAppDataMock.mockReturnValue(appData);

    renderWithRouter(React.createElement(SimulationPage));

    expect(screen.getByText(/배달 기록이 (아직 없어요|있어야)/)).toBeInTheDocument();
    const buttons = screen.getAllByRole("button") as HTMLButtonElement[];
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.every((btn) => btn.disabled)).toBe(true);
    expect(screen.queryByTestId("saving-result")).not.toBeInTheDocument();
  });

  it("AC-4[P1]: 광고 실패 -> Toast 노출, 결과는 계속 블러 유지, markSimulationSeen 미호출, 크래시 없음", async () => {
    const appData = defaultAppData({
      meals: [makeMeal({ category: "delivery", amount: 300000 })],
    });
    useAppDataMock.mockReturnValue(appData);
    vi.mocked(showFullScreenAd).mockImplementation((opts: any) => {
      setTimeout(() => opts.onError?.(new Error("ad failed")), 0);
      return () => {};
    });

    renderWithRouter(React.createElement(SimulationPage));
    await clickWatchAdWhenReady();

    const toast = await screen.findByRole("status");
    expect(toast.textContent).toMatch(/광고/);
    expect(screen.queryByTestId("saving-result")).not.toBeInTheDocument();
    expect(screen.queryByText(/90,000원/)).not.toBeInTheDocument();
    expect(appData.markSimulationSeen).not.toHaveBeenCalled();
  });

  it("AC-6[P2]: 당일 재진입(lastSimulationDate===오늘) -> 광고 없이 바로 saving-result 노출", async () => {
    const appData = defaultAppData({
      meals: [makeMeal({ category: "delivery", amount: 300000 })],
      flags: defaultFlags({ lastSimulationDate: today() }),
    });
    useAppDataMock.mockReturnValue(appData);

    renderWithRouter(React.createElement(SimulationPage));

    const result = await screen.findByTestId("saving-result");
    expect(within(result).getByText(/90,000원/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: WATCH_AD_NAME })).not.toBeInTheDocument();
    expect(loadFullScreenAd).not.toHaveBeenCalled();
  });
});
