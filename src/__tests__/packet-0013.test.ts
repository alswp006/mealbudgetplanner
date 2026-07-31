import { describe, it, expect, vi } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";

const __dirname = dirname(fileURLToPath(import.meta.url));

// TDS + @apps-in-toss + TossRewardAd + react-router-dom(useNavigate/useLocation) mocks
mockAll();

// AppDataProvider/useAppData — spy on the provider so we can assert it wraps the tree,
// and give every page a safe default data shape so pages that call useAppData don't crash.
const { providerSpy } = vi.hoisted(() => ({ providerSpy: vi.fn() }));

vi.mock("@/lib/store", () => ({
  AppDataProvider: ({ children }: { children: React.ReactNode }) => {
    providerSpy();
    return children;
  },
  useAppData: () => ({
    budget: null,
    meals: [],
    checkins: [],
    loading: false,
    overBudget: { over: false, excess: 0 },
    error: null,
    actions: {
      saveBudget: vi.fn(),
      recordMeal: vi.fn(),
      removeMeal: vi.fn(),
      checkin: vi.fn(),
    },
  }),
}));

const ROUTES = ["/", "/budget", "/record", "/records", "/analysis", "/simulate"];

describe("라우팅 & FloatingTabBar 배선 + Provider", () => {
  it("AC-1[P0] happy: 6개 라우트가 각각 크래시 없이 마운트되고, 공통 탭바(4탭)가 유지된다", async () => {
    const { default: App } = await import("@/App");

    for (const path of ROUTES) {
      const { unmount } = render(
        React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)),
      );

      // 라우트 콘텐츠가 실제로 렌더됐다 (빈 화면 아님)
      expect(document.body.textContent?.trim().length).toBeGreaterThan(0);
      // 공통 하단 탭(App 레벨 chrome)이 모든 라우트에서 유지된다
      expect(screen.getAllByRole("tab")).toHaveLength(4);

      unmount();
    }
  });

  it("AC-1[P0] edge: 정의되지 않은 경로로 진입해도 앱 전체가 크래시하지 않는다", async () => {
    const { default: App } = await import("@/App");

    expect(() =>
      render(
        React.createElement(
          MemoryRouter,
          { initialEntries: ["/does-not-exist"] },
          React.createElement(App),
        ),
      ),
    ).not.toThrow();
    // 크래시로 인한 에러 바운더리/얼럿이 뜨지 않는다
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("AC-2[P1]: 홈의 '식사 기록' 버튼을 누르면 /record로 이동한다", async () => {
    const { default: App } = await import("@/App");
    render(React.createElement(MemoryRouter, { initialEntries: ["/"] }, React.createElement(App)));

    const button = screen.getByRole("button", { name: /식사 ?기록/ });
    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith("/record");
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it("AC-3[P0]: FloatingTabBar는 4탭이며 각 탭 터치 영역이 48px 이상이고 외부 URL 이동이 없다", async () => {
    const { default: App } = await import("@/App");
    const { openURL } = await import("@apps-in-toss/web-framework");
    const openSpy = vi.spyOn(window, "open");

    render(React.createElement(MemoryRouter, { initialEntries: ["/"] }, React.createElement(App)));

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
    expect(new Set(tabs.map((t) => t.getAttribute("aria-label")))).toEqual(
      new Set(["홈", "기록", "분석", "시뮬"]),
    );

    for (const tab of tabs) {
      const minHeight = parseInt((tab as HTMLElement).style.minHeight || "0", 10);
      expect(minHeight).toBeGreaterThanOrEqual(48);
    }

    fireEvent.click(tabs[1]);
    expect(openSpy).not.toHaveBeenCalled();
    expect(openURL).not.toHaveBeenCalled();
  });

  it("AC-4[P0]: App.tsx가 AppDataProvider로 전체 앱을 감싸고, main.tsx는 수정되지 않는다", async () => {
    const { default: App } = await import("@/App");
    render(React.createElement(MemoryRouter, { initialEntries: ["/"] }, React.createElement(App)));

    expect(providerSpy).toHaveBeenCalledTimes(1);

    const mainSource = readFileSync(resolve(__dirname, "../main.tsx"), "utf-8");
    expect(mainSource).toContain("@AI:ANCHOR");
    expect(mainSource).not.toMatch(/AppDataProvider/);
  });

  it("AC-4[P0] edge: App.tsx 소스가 실제로 AppDataProvider를 import/사용한다 (정적 검증)", () => {
    const appSource = readFileSync(resolve(__dirname, "../App.tsx"), "utf-8");
    expect(appSource).toMatch(/AppDataProvider/);
    expect(appSource).toMatch(/react-router-dom/);
  });
});
