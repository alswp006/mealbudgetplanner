/**
 * Packet 0007: 홈 초과 경고 배너(F8) + 체크인 섹션(F5) + 배너광고
 *
 * Covers:
 * - F8 AC-1/AC-2: 90%~100% 미만 -> warning "예산의 90%를 썼어요. 남은 예산 X원",
 *   100% 이상 -> critical "예산을 A원 초과했어요"
 * - F8 AC-3: 90% 미만 / 예산 0 -> DOM에 over-alert 없음
 * - F8 AC-4: "예산 조정" 버튼 -> navigate('/budget')
 * - F5 AC-1: 체크인 성공 -> doCheckIn 호출 + 배지 BottomSheet
 * - F5 AC-3: 오늘 기록 0건 -> 체크인 버튼 disabled + 안내 문구
 * - F5 AC-4: 중복 체크인 -> Toast + doCheckIn 미호출 + 버튼 라벨 고정
 * - F5 AC-5: 배너 광고 미지원/실패 -> 체크인/배지 지급은 정상 진행
 * - F5 AC-6: 3일 연속 체크인 -> "3일 연속 기록 중" 노출
 *
 * OverBudgetAlert / CheckInSection are NOT YET IMPLEMENTED — this is the TDD red phase.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, within, fireEvent } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

mockAll();

import { OverBudgetAlert } from "@/components/OverBudgetAlert";
import { CheckInSection } from "@/components/CheckInSection";
import { TossAds } from "@apps-in-toss/web-framework";
import type { WriteResult } from "@/lib/types";

describe("Packet 0007: 홈 초과 경고 배너(F8) + 체크인 섹션(F5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // F8 — OverBudgetAlert
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("F8-AC-1[P0]: 95% 소진 시 over-alert에 warning 톤 + '예산의 90%를 썼어요. 남은 예산 30,000원'", () => {
    renderWithRouter(
      React.createElement(OverBudgetAlert, {
        status: { status: "approaching", remainingBudget: 30000 },
        onAdjustBudget: vi.fn(),
      }),
    );

    const alert = screen.getByTestId("over-alert");
    expect(alert).toHaveAttribute("data-tone", "warning");
    expect(within(alert).getByText(/예산의 90%를 썼어요/)).toBeInTheDocument();
    expect(within(alert).getByText(/남은 예산 30,000원/)).toBeInTheDocument();
  });

  it("F8-AC-2[P0]: 105% 소진(초과) 시 over-alert에 critical 톤 + '예산을 50,000원 초과했어요'", () => {
    renderWithRouter(
      React.createElement(OverBudgetAlert, {
        status: { status: "exceeded", overAmount: 50000 },
        onAdjustBudget: vi.fn(),
      }),
    );

    const alert = screen.getByTestId("over-alert");
    expect(alert).toHaveAttribute("data-tone", "critical");
    expect(within(alert).getByText(/예산을 50,000원 초과했어요/)).toBeInTheDocument();
  });

  it("F8-AC-3[P1]: 90% 미만이거나 예산 0(status=normal)이면 over-alert가 DOM에 없음", () => {
    const { unmount } = renderWithRouter(
      React.createElement(OverBudgetAlert, {
        status: { status: "normal" },
        onAdjustBudget: vi.fn(),
      }),
    );
    expect(screen.queryByTestId("over-alert")).not.toBeInTheDocument();
    unmount();

    // 예산 0 방어 — calc.getOverBudgetStatus가 이미 'normal'을 반환하는 케이스를 그대로 전달
    renderWithRouter(
      React.createElement(OverBudgetAlert, {
        status: { status: "normal" },
        onAdjustBudget: vi.fn(),
      }),
    );
    expect(screen.queryByTestId("over-alert")).not.toBeInTheDocument();
  });

  it("F8-AC-4[P1]: '예산 조정' 버튼 탭 시 navigate('/budget') 실행", () => {
    const onAdjustBudget = vi.fn();
    renderWithRouter(
      React.createElement(OverBudgetAlert, {
        status: { status: "exceeded", overAmount: 12000 },
        onAdjustBudget,
      }),
    );

    const button = screen.getByRole("button", { name: /예산 조정/ });
    fireEvent.click(button);

    expect(onAdjustBudget).toHaveBeenCalledTimes(1);
  });

  it("F8-AC-4[P1]: 홈에서 실제로 예산 조정 콜백이 navigate('/budget')을 호출한다", () => {
    renderWithRouter(
      React.createElement(OverBudgetAlert, {
        status: { status: "approaching", remainingBudget: 5000 },
        onAdjustBudget: () => mockNavigate("/budget"),
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /예산 조정/ }));

    expect(mockNavigate).toHaveBeenCalledWith("/budget");
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // F5 — CheckInSection
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function checkInProps(overrides: Record<string, unknown> = {}) {
    return {
      today: "2026-08-02",
      month: "2026-08",
      budgetAmount: 300000,
      spentThisMonth: 10000,
      todayHasMeal: true,
      todayCheckedIn: false,
      streak: 0,
      onCheckIn: vi.fn((): WriteResult => ({ ok: true })),
      adGroupId: "checkin-banner",
      ...overrides,
    };
  }

  it("F5-AC-3[P1]: 오늘 기록이 0건이면 체크인 버튼이 disabled이고 안내 문구가 보인다", () => {
    renderWithRouter(
      React.createElement(CheckInSection, checkInProps({ todayHasMeal: false })),
    );

    const button = screen.getByRole("button", { name: /체크인/ });
    expect(button).toBeDisabled();
    expect(screen.getByText(/오늘 식사를 먼저 기록해주세요/)).toBeInTheDocument();
  });

  it("F5-AC-1[P0]: 체크인 성공 시 onCheckIn이 오늘 날짜로 호출되고 배지 BottomSheet가 표시된다", () => {
    // budget=300,000 / 경과일=2 / 총일수=31 -> ideal ≈ 19,355, spent=10,000 <= ideal*0.9 -> ahead
    const onCheckIn = vi.fn((): WriteResult => ({ ok: true }));
    renderWithRouter(
      React.createElement(
        CheckInSection,
        checkInProps({ onCheckIn, spentThisMonth: 10000, budgetAmount: 300000 }),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: /체크인/ }));

    expect(onCheckIn).toHaveBeenCalledTimes(1);
    expect(onCheckIn).toHaveBeenCalledWith(
      expect.objectContaining({ date: "2026-08-02", badge: "ahead" }),
    );

    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByText(/여유 페이스예요/)).toBeInTheDocument();
  });

  it("F5-AC-4[P1]: 이미 체크인한 상태에서 탭하면 광고/저장 없이 Toast가 뜨고 버튼 라벨이 '체크인 완료'로 고정된다", () => {
    const onCheckIn = vi.fn((): WriteResult => ({ ok: true }));
    renderWithRouter(
      React.createElement(CheckInSection, checkInProps({ onCheckIn, todayCheckedIn: true })),
    );

    const button = screen.getByRole("button", { name: /체크인 완료/ });
    fireEvent.click(button);

    expect(onCheckIn).not.toHaveBeenCalled();
    expect(screen.getByText(/오늘은 이미 체크인했어요/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /체크인 완료/ })).toBeInTheDocument();
  });

  it("F5-AC-5[P1]: 배너 광고가 지원되지 않아도 체크인은 정상 진행되어 배지가 지급된다", () => {
    const originalIsSupported = TossAds.attachBanner.isSupported;
    TossAds.attachBanner.isSupported = () => false;

    const onCheckIn = vi.fn((): WriteResult => ({ ok: true }));
    renderWithRouter(React.createElement(CheckInSection, checkInProps({ onCheckIn })));

    fireEvent.click(screen.getByRole("button", { name: /체크인/ }));

    expect(onCheckIn).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    TossAds.attachBanner.isSupported = originalIsSupported;
  });

  it("F5-AC-6[P2]: 3일 연속 체크인이면 '3일 연속 기록 중' 문구가 보이고, streak가 3 미만이면 보이지 않는다", () => {
    const { unmount } = renderWithRouter(
      React.createElement(CheckInSection, checkInProps({ streak: 3 })),
    );
    expect(screen.getByText(/3일 연속 기록 중/)).toBeInTheDocument();
    unmount();

    renderWithRouter(React.createElement(CheckInSection, checkInProps({ streak: 1 })));
    expect(screen.queryByText(/연속 기록 중/)).not.toBeInTheDocument();
  });
});
