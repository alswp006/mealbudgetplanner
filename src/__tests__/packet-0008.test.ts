/**
 * Packet 0008: 식사 기록 페이지 /record
 *
 * Covers:
 * - AC-1[P0]: 점심/배달/12000/김밥 저장 -> recordMeal 기록 + success haptic + Toast '기록했어요'
 *   + navigate('/', { state: { recorded: true } })
 * - AC-2[P1]: 카테고리 Chip 3개(배달/직접조리/외식) 단일 선택
 * - AC-3[P0]: 금액 빈 -> '금액을 입력해주세요' 에러, 저장 안 함
 * - AC-4[P0]: 1000000 -> '한 끼 최대 999,999원까지 입력할 수 있어요' 에러, 저장 안 함
 * - AC-5[P1]: QUOTA 반환 -> AlertDialog '저장 공간이 부족해요...' 표시, 화면 유지
 * - AC-6[P2]: 메모 41자 입력 -> 40자에서 차단
 * - AC-7[U]: location.state.defaultMealType 프리필 + 금액 TextField inputMode=numeric
 *
 * RecordPage is NOT YET IMPLEMENTED — this is the TDD red phase.
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

import RecordPage from "@/pages/RecordPage";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import type { WriteResult } from "@/lib/types";

type MockAppData = {
  budget: unknown;
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
    recordMeal: vi.fn((): WriteResult => ({ ok: true })),
    doCheckIn: vi.fn(),
    markSimulationSeen: vi.fn(),
    ...overrides,
  };
}

describe("Packet 0008: 식사 기록 페이지 /record", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.state = null;
    useAppDataMock.mockReturnValue(makeAppData());
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-1[P0]: 저장 성공
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-1[P0]: 점심/배달/12000/김밥 입력 후 저장 -> recordMeal 기록 + success haptic + Toast + 홈 이동(recorded:true)", () => {
    const recordMeal = vi.fn((_input: Record<string, unknown>): WriteResult => ({ ok: true }));
    useAppDataMock.mockReturnValue(makeAppData({ recordMeal }));

    renderWithRouter(React.createElement(RecordPage));

    fireEvent.click(screen.getByRole("button", { name: "점심" }));
    fireEvent.click(screen.getByRole("button", { name: "배달" }));

    const amountInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(amountInput, { target: { value: "12000" } });

    const memoInput = screen.getAllByRole("textbox")[1];
    fireEvent.change(memoInput, { target: { value: "김밥" } });

    fireEvent.click(screen.getByRole("button", { name: /기록 저장/ }));

    expect(recordMeal).toHaveBeenCalledTimes(1);
    const saved = recordMeal.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(saved.mealType).toBe("lunch");
    expect(saved.category).toBe("delivery");
    expect(saved.amount).toBe(12000);
    expect(saved.memo).toBe("김밥");
    expect(saved.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "success" });
    expect(screen.getByText(/기록했어요/)).toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith("/", { state: { recorded: true } });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-2[P1]: 카테고리 Chip 단일 선택
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-2[P1]: 카테고리 Chip 3개(배달/직접조리/외식)가 렌더되고 단일 선택만 유지된다", () => {
    renderWithRouter(React.createElement(RecordPage));

    const delivery = screen.getByRole("button", { name: "배달" });
    const homemade = screen.getByRole("button", { name: "직접조리" });
    const diningOut = screen.getByRole("button", { name: "외식" });
    expect(delivery).toBeInTheDocument();
    expect(homemade).toBeInTheDocument();
    expect(diningOut).toBeInTheDocument();

    fireEvent.click(delivery);
    expect(delivery).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(diningOut);
    expect(diningOut).toHaveAttribute("aria-pressed", "true");
    expect(delivery).toHaveAttribute("aria-pressed", "false");
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-3[P0]: 금액 미입력 거부
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-3[P0]: 금액을 비운 채 저장 -> '금액을 입력해주세요' 에러, recordMeal 미호출", () => {
    const recordMeal = vi.fn((): WriteResult => ({ ok: true }));
    useAppDataMock.mockReturnValue(makeAppData({ recordMeal }));

    renderWithRouter(React.createElement(RecordPage));

    fireEvent.click(screen.getByRole("button", { name: "점심" }));
    fireEvent.click(screen.getByRole("button", { name: "배달" }));

    fireEvent.click(screen.getByRole("button", { name: /기록 저장/ }));

    expect(screen.getByText("금액을 입력해주세요")).toBeInTheDocument();
    expect(recordMeal).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-4[P0]: 상한 초과 거부
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-4[P0]: 금액 1000000 입력 후 저장 -> '한 끼 최대 999,999원까지 입력할 수 있어요' 에러, 저장 안 함", () => {
    const recordMeal = vi.fn((): WriteResult => ({ ok: true }));
    useAppDataMock.mockReturnValue(makeAppData({ recordMeal }));

    renderWithRouter(React.createElement(RecordPage));

    fireEvent.click(screen.getByRole("button", { name: "저녁" }));
    fireEvent.click(screen.getByRole("button", { name: "외식" }));

    const amountInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(amountInput, { target: { value: "1000000" } });

    fireEvent.click(screen.getByRole("button", { name: /기록 저장/ }));

    expect(screen.getByText("한 끼 최대 999,999원까지 입력할 수 있어요")).toBeInTheDocument();
    expect(recordMeal).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-5[P1]: 저장 실패(용량 초과)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-5[P1]: recordMeal이 QUOTA 반환 -> AlertDialog '저장 공간이 부족해요' 표시, 화면 유지(navigate 미호출)", () => {
    const recordMeal = vi.fn((): WriteResult => ({ ok: false, reason: "QUOTA" }));
    useAppDataMock.mockReturnValue(makeAppData({ recordMeal }));

    renderWithRouter(React.createElement(RecordPage));

    fireEvent.click(screen.getByRole("button", { name: "아침" }));
    fireEvent.click(screen.getByRole("button", { name: "직접조리" }));

    const amountInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(amountInput, { target: { value: "8000" } });

    fireEvent.click(screen.getByRole("button", { name: /기록 저장/ }));

    expect(recordMeal).toHaveBeenCalledTimes(1);
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent(/저장 공간이 부족해요/);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-6[P2]: 메모 길이 제한
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-6[P2]: 메모에 41자 입력 시 40자에서 입력이 차단된다", () => {
    renderWithRouter(React.createElement(RecordPage));

    const memoInput = screen.getAllByRole("textbox")[1] as HTMLInputElement;
    const overLong = "가".repeat(41);
    fireEvent.change(memoInput, { target: { value: overLong } });

    expect(memoInput.value.length).toBe(40);
    expect(memoInput.value).toBe("가".repeat(40));
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-7[U]: defaultMealType 프리필 + 숫자 키패드
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-7[U]: location.state.defaultMealType='dinner' -> '저녁' Chip이 사전 선택되고, 금액 필드는 inputMode=numeric이다", () => {
    (mockLocation as unknown as { state: unknown }).state = { defaultMealType: "dinner" };

    renderWithRouter(React.createElement(RecordPage));

    expect(screen.getByRole("button", { name: "저녁" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "아침" })).toHaveAttribute("aria-pressed", "false");

    const amountInput = screen.getAllByRole("textbox")[0];
    expect(amountInput).toHaveAttribute("inputmode", "numeric");
  });
});
