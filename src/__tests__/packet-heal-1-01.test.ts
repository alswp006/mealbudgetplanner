/**
 * Packet heal-1-01: App.tsx 단일 소유 라우팅 + Provider + FloatingTabBar 완성
 *
 * Covers:
 * - AC-1[P0]: /, /record, /stats, /budget, /simulation 5개 경로가 모두 렌더되고 크래시 없음
 * - AC-2[P0]: FloatingTabBar가 App.tsx에서만 렌더되어 중복 인스턴스가 없음
 *   (Home.tsx/StatsPage.tsx가 더 이상 FloatingTabBar를 직접 import/렌더하지 않음)
 * - AC-3: Provider/스토어(main.tsx의 TDSMobileAITProvider+BrowserRouter)가 최상위에서 단 1회 마운트됨
 * - AC-4: 콘솔 에러 없이 렌더됨(프로덕션 console.error 0개의 jsdom 프록시) + 정의되지 않은 라우트는 홈으로 폴백
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { screen } from "@testing-library/react";
import { mockAll, mockLocation } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

mockAll();

import App from "@/App";

// FloatingTabBar/페이지는 useLocation()으로 활성탭을 판정하는데, react-router-dom mock은
// 고정된 mockLocation 객체를 반환한다(MemoryRouter의 initialEntries와 별개) — 렌더 전
// mockLocation.pathname을 실제 진입 경로와 맞춰줘야 한다.
beforeEach(() => {
  (mockLocation as { pathname: string }).pathname = "/";
});

const SRC_ROOT = path.resolve(__dirname, "..");

function readSrcFile(relPath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relPath), "utf-8");
}

describe("Packet heal-1-01: App.tsx 단일 소유 라우팅 + Provider + FloatingTabBar 완성", () => {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-1[P0]: 5개 경로 모두 렌더되고 크래시 없음
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-1[P0]: /, /record, /stats, /budget, /simulation 5개 경로가 모두 크래시 없이 렌더된다", () => {
    const routes = ["/", "/record", "/stats", "/budget", "/simulation"];

    for (const routePath of routes) {
      (mockLocation as { pathname: string }).pathname = routePath;
      expect(() => {
        const { unmount } = renderWithRouter(React.createElement(App), {
          initialEntries: [routePath],
        });
        unmount();
      }).not.toThrow();
    }
  });

  it("AC-1[P0]: 각 경로 진입 시 해당 페이지 고유 콘텐츠가 렌더된다", () => {
    const cases: Array<{ path: string; heading: string }> = [
      { path: "/", heading: "식비 플래너" },
      { path: "/budget", heading: "이번 달 식비 예산" },
      { path: "/record", heading: "식사 기록" },
      { path: "/stats", heading: "주간 분석" },
      { path: "/simulation", heading: "절약 시뮬레이션" },
    ];

    for (const { path: routePath, heading } of cases) {
      (mockLocation as { pathname: string }).pathname = routePath;
      const { unmount } = renderWithRouter(React.createElement(App), {
        initialEntries: [routePath],
      });
      expect(screen.getByText(heading)).toBeInTheDocument();
      unmount();
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-2[P0]: FloatingTabBar는 App.tsx에서만 렌더 — 중복 소유 제거
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-2[P0]: App.tsx 소스가 FloatingTabBar를 소유(import+렌더)하고, 페이지 컴포넌트는 더 이상 직접 렌더하지 않는다", () => {
    const appSource = readSrcFile("App.tsx");
    expect(appSource).toContain("FloatingTabBar");
    expect(appSource).toMatch(/<FloatingTabBar\b/);

    const homeSource = readSrcFile("pages/Home.tsx");
    const statsSource = readSrcFile("pages/StatsPage.tsx");
    expect(homeSource).not.toContain("FloatingTabBar");
    expect(statsSource).not.toContain("FloatingTabBar");
  });

  it("AC-2[P0]: 홈(/)과 통계(/stats) 화면 각각에서 FloatingTabBar(tablist)는 정확히 1개만 렌더된다", () => {
    (mockLocation as { pathname: string }).pathname = "/";
    const homeRender = renderWithRouter(React.createElement(App), { initialEntries: ["/"] });
    expect(screen.getAllByRole("tablist")).toHaveLength(1);
    expect(screen.getByRole("tab", { name: "홈" })).toHaveAttribute("aria-selected", "true");
    homeRender.unmount();

    (mockLocation as { pathname: string }).pathname = "/stats";
    const statsRender = renderWithRouter(React.createElement(App), { initialEntries: ["/stats"] });
    expect(screen.getAllByRole("tablist")).toHaveLength(1);
    expect(screen.getByRole("tab", { name: "통계" })).toHaveAttribute("aria-selected", "true");
    statsRender.unmount();
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-3: Provider/스토어가 최상위에서 단 1회만 마운트
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-3: main.tsx가 TDSMobileAITProvider+BrowserRouter로 App을 정확히 1회 감싸고, App.tsx는 이를 중복 선언하지 않는다", () => {
    const mainSource = readSrcFile("main.tsx");
    expect(mainSource).toContain("@AI:ANCHOR");
    expect(mainSource).toMatch(/<TDSMobileAITProvider>[\s\S]*<BrowserRouter>[\s\S]*<App\s*\/>/);
    const appUsageCount = (mainSource.match(/<App\s*\/>/g) ?? []).length;
    expect(appUsageCount).toBe(1);

    const appSource = readSrcFile("App.tsx");
    expect(appSource).not.toContain("BrowserRouter");
    expect(appSource).not.toContain("TDSMobileAITProvider");
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-4: 콘솔 에러 0개 + 정의되지 않은 라우트는 홈으로 폴백
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-4: 5개 경로 렌더 중 console.error가 한 번도 호출되지 않는다", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const routes = ["/", "/record", "/stats", "/budget", "/simulation"];

    for (const routePath of routes) {
      (mockLocation as { pathname: string }).pathname = routePath;
      const { unmount } = renderWithRouter(React.createElement(App), {
        initialEntries: [routePath],
      });
      unmount();
    }

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("AC-4: 정의되지 않은 경로(/no-such-route)로 진입하면 홈 화면으로 폴백된다", () => {
    (mockLocation as { pathname: string }).pathname = "/no-such-route";
    renderWithRouter(React.createElement(App), { initialEntries: ["/no-such-route"] });

    expect(screen.getByText("식비 플래너")).toBeInTheDocument();
    expect(screen.queryByText("이번 달 식비 예산")).not.toBeInTheDocument();
  });
});
