/**
 * Packet heal-1-02: 광고/리워드 래퍼 컴포넌트 + 시뮬레이션 리워드 게이팅 결선
 *
 * 재사용 대상 (이미 존재 — 재구현 금지, CLAUDE.md "중복 확인" 원칙):
 *   - src/components/AdSlot.tsx        (배너 AdSlot 래퍼, TossAds.attachBanner 감쌈)
 *   - src/components/TossRewardAd.tsx  (리워드 게이트 래퍼, loadFullScreenAd/showFullScreenAd 감쌈)
 *   - src/pages/SimulationPage.tsx     (리워드 게이팅으로 절약 결과 노출)
 *
 * 이 패킷은 (1) 위 래퍼들의 안전한 폴백(SDK 미지원/미주입 환경) 계약을 재확인하고,
 * (2) SimulationPage 결과 카드 하단에 배너 AdSlot을 추가로 결선(wire)하는 것을 검증한다.
 * 배너 결선(AC-3)은 SimulationPage에 아직 구현되어 있지 않으므로 해당 테스트는
 * 지금 RED로 실패하는 것이 의도된 동작이다(TDD red phase).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
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
// NOTE: @/components/TossRewardAd is intentionally NOT globally mocked (no mockAll()) —
// the gating behavior itself (blur before reward, unlock after) is what AC-1 verifies.

import SimulationPage from "@/pages/SimulationPage";
import { AdSlot } from "@/components/AdSlot";
import { loadFullScreenAd, showFullScreenAd, TossAds } from "@apps-in-toss/web-framework";

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

describe("Packet heal-1-02: 광고/리워드 래퍼 + 시뮬레이션 리워드 게이팅 결선", () => {
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

  it("AC-1[P0]: 게이팅 전에는 절약 결과가 노출되지 않고, 광고 시청 버튼만 보인다", async () => {
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

  it("AC-1[P0]: 리워드 게이트 통과 후 절약 결과가 노출되고 markSimulationSeen이 오늘 날짜로 호출된다", async () => {
    const appData = defaultAppData({
      meals: [makeMeal({ category: "delivery", amount: 300000 })],
    });
    useAppDataMock.mockReturnValue(appData);

    renderWithRouter(React.createElement(SimulationPage));
    await clickWatchAdWhenReady();

    const result = await screen.findByTestId("saving-result");
    expect(result.textContent).toMatch(/90,000원/);
    expect(appData.markSimulationSeen).toHaveBeenCalledTimes(1);
    expect(appData.markSimulationSeen).toHaveBeenCalledWith(today());
  });

  it("AC-2[P1]: adGroupId가 빈 값이어도 AdBannerSlot(AdSlot)이 크래시 없이 빈 컨테이너로 폴백 렌더된다", () => {
    // WebView 밖(jsdom)에서도 attachBanner.isSupported는 mock에서 true를 반환하지만,
    // 실제 attach 호출 자체가 던지는 케이스까지 가드가 흡수하는지 확인한다.
    vi.mocked(TossAds.attachBanner).mockImplementationOnce(() => {
      throw new Error("no native bridge");
    });

    expect(() =>
      renderWithRouter(React.createElement(AdSlot, { adGroupId: "" })),
    ).not.toThrow();

    const el = document.querySelector('[data-ad-group-id=""]');
    expect(el).not.toBeNull();
    expect(el?.tagName).toBe("DIV");
  });

  it("AC-2[P1]: VITE_TOSS_AD_SLOT_ID/GROUP_ID 미설정 환경(테스트 기본값)에서도 SimulationPage가 크래시 없이 렌더된다", async () => {
    const appData = defaultAppData({
      meals: [makeMeal({ category: "delivery", amount: 300000 })],
    });
    useAppDataMock.mockReturnValue(appData);

    expect(() => renderWithRouter(React.createElement(SimulationPage))).not.toThrow();
    expect(await screen.findByText("절약 시뮬레이션")).toBeInTheDocument();
  });

  it("AC-3[P1]: 배너 광고가 절약 결과 카드보다 DOM상 뒤(하단)에 위치하고, 결과 카드 내부에 중첩되지 않는다", async () => {
    const appData = defaultAppData({
      meals: [makeMeal({ category: "delivery", amount: 300000 })],
    });
    useAppDataMock.mockReturnValue(appData);

    renderWithRouter(React.createElement(SimulationPage));
    await clickWatchAdWhenReady();

    const result = await screen.findByTestId("saving-result");
    const banner = document.querySelector("[data-ad-group-id]");
    expect(banner).not.toBeNull();
    expect(result.contains(banner as Node)).toBe(false);
    expect(banner?.contains(result)).toBe(false);
    // Node.DOCUMENT_POSITION_FOLLOWING(4) means banner comes after the result card.
    const position = result.compareDocumentPosition(banner as Node);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("AC-4[P1]: 시뮬레이션 화면에 HEX 색상 하드코딩 인라인 스타일이 없다(TDS 토큰만 사용)", async () => {
    const appData = defaultAppData({
      meals: [makeMeal({ category: "delivery", amount: 300000 })],
    });
    useAppDataMock.mockReturnValue(appData);

    const { container } = renderWithRouter(React.createElement(SimulationPage));
    await clickWatchAdWhenReady();
    await screen.findByTestId("saving-result");

    const styledEls = Array.from(container.querySelectorAll<HTMLElement>("[style]"));
    const hexOffenders = styledEls.filter((el) => /#[0-9a-fA-F]{3,8}\b/.test(el.getAttribute("style") ?? ""));
    expect(hexOffenders).toHaveLength(0);
  });
});
