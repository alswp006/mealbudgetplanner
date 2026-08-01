/**
 * Packet 0013: 라우팅 와이어링 + Provider 연결 + 통합 폴리시
 *
 * Covers (packet acceptance_criteria):
 * - AC-1[P0]: App.tsx에 모든 페이지 Route가 정의되어 있다
 * - AC-2[P0]: 모든 navigate() 대상에 Route가 존재한다
 * - AC-3[P1]: main.tsx의 TDSMobileAITProvider/BrowserRouter가 유지되어 있다
 * - AC-4[P0]: 앱이 '/' 경로에서 정상 렌더링된다
 *
 * This is the final integration packet — App.tsx and main.tsx already exist
 * (wired by prior packets 0011/0012). These tests re-verify the wiring holds
 * end-to-end and add a stricter reverse check (every page file under
 * src/pages is actually reachable via a Route, not just the other way round).
 */

import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { screen, fireEvent } from "@testing-library/react";
import { mockAll, mockNavigate, mockLocation } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

mockAll();

import App from "@/App";

const SRC_ROOT = path.resolve(__dirname, "..");

function readSrcFile(relPath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relPath), "utf-8");
}

function listSrcFilesRecursive(dir: string): string[] {
  const abs = path.join(SRC_ROOT, dir);
  const entries = fs.readdirSync(abs, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSrcFilesRecursive(rel);
    if (entry.isFile() && /\.tsx?$/.test(entry.name) && !rel.includes("__tests__")) return [rel];
    return [];
  });
}

beforeEach(() => {
  (mockLocation as { pathname: string; state: unknown }).pathname = "/";
  mockLocation.state = null;
});

describe("Packet 0013: 라우팅 와이어링 + Provider 연결 + 통합 폴리시", () => {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-1[P0]: App.tsx에 모든 페이지 Route가 정의되어 있다
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-1[P0]: App.tsx는 /, /budget, /record, /stats, /simulation 5개 Route를 정확히 정의한다", () => {
    const appSource = readSrcFile("App.tsx");
    const routePaths = [...appSource.matchAll(/<Route\s+path="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((p) => !p.startsWith("/__")); // dev-only gallery route 제외

    expect(routePaths.sort()).toEqual(["/", "/budget", "/record", "/simulation", "/stats"]);
    expect(routePaths.length).toBe(5);
  });

  it("AC-1[P0]: src/pages의 모든 프로덕션 페이지 파일이 App.tsx에서 실제로 import되어 Route에 사용된다 (역방향 검증 — 라우트 없는 페이지 방지)", () => {
    const appSource = readSrcFile("App.tsx");
    const pageFiles = fs
      .readdirSync(path.join(SRC_ROOT, "pages"))
      .filter((f) => /\.tsx$/.test(f) && !f.startsWith("__"));

    expect(pageFiles.sort()).toEqual(
      ["BudgetPage.tsx", "Home.tsx", "RecordPage.tsx", "SimulationPage.tsx", "StatsPage.tsx"].sort(),
    );

    for (const file of pageFiles) {
      const componentName = file.replace(/\.tsx$/, "");
      expect(appSource).toMatch(new RegExp(`import ${componentName} from '\\./pages/${componentName}'`));
      expect(appSource).toMatch(new RegExp(`<Route[^>]*element=\\{<${componentName}\\s*/>\\}`));
    }
  });

  it("AC-1[P0]: 5개 경로 각각 진입 시 해당 페이지 고유 콘텐츠가 렌더된다", () => {
    const headingByPath: Record<string, string> = {
      "/": "식비 플래너",
      "/budget": "이번 달 식비 예산",
      "/record": "식사 기록",
      "/stats": "주간 분석",
      "/simulation": "절약 시뮬레이션",
    };

    for (const [routePath, heading] of Object.entries(headingByPath)) {
      (mockLocation as { pathname: string }).pathname = routePath;
      const { unmount } = renderWithRouter(React.createElement(App), { initialEntries: [routePath] });
      expect(screen.getByText(heading)).toBeInTheDocument();
      unmount();
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-2[P0]: 모든 navigate() 대상에 Route가 존재한다
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-2[P0]: src/pages, src/components 전체에서 navigate('...') 정적 문자열 대상이 모두 App.tsx Route로 정의돼 있다", () => {
    const appSource = readSrcFile("App.tsx");
    const definedRoutes = new Set(
      [...appSource.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]),
    );

    const files = [...listSrcFilesRecursive("pages"), ...listSrcFilesRecursive("components")];
    const navigateTargets = new Set<string>();
    for (const file of files) {
      const source = readSrcFile(file);
      for (const m of source.matchAll(/navigate\(\s*['"](\/[a-zA-Z0-9/_-]*)['"]/g)) {
        navigateTargets.add(m[1]);
      }
    }

    expect(navigateTargets.size).toBeGreaterThanOrEqual(3);
    for (const target of navigateTargets) {
      expect(definedRoutes.has(target)).toBe(true);
    }
  });

  it("AC-2[P0]: 홈의 빈 예산 상태에서 '예산 설정하기' 클릭 시 navigate('/budget')가 호출된다", () => {
    renderWithRouter(React.createElement(App), { initialEntries: ["/"] });

    fireEvent.click(screen.getByRole("button", { name: "예산 설정하기" }));

    expect(mockNavigate).toHaveBeenCalledWith("/budget");
  });

  it("AC-2[P0]: /stats의 빈 상태에서 '기록하러 가기' 클릭 시 navigate('/record')가 호출된다", () => {
    (mockLocation as { pathname: string }).pathname = "/stats";
    renderWithRouter(React.createElement(App), { initialEntries: ["/stats"] });

    fireEvent.click(screen.getByRole("button", { name: "기록하러 가기" }));

    expect(mockNavigate).toHaveBeenCalledWith("/record");
  });

  it("AC-2[P0]: /budget에서 예산 금액을 입력하고 저장하면 navigate('/')가 호출된다", () => {
    (mockLocation as { pathname: string }).pathname = "/budget";
    renderWithRouter(React.createElement(App), { initialEntries: ["/budget"] });

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "500000" } });
    fireEvent.click(screen.getByRole("button", { name: "저장하기" }));

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-3[P1]: main.tsx의 TDSMobileAITProvider/BrowserRouter가 유지되어 있다
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-3[P1]: main.tsx가 @AI:ANCHOR를 보존하며 TDSMobileAITProvider > BrowserRouter > App 순서로 배선한다", () => {
    const mainSource = readSrcFile("main.tsx");

    expect(mainSource).toContain("@AI:ANCHOR");
    expect(mainSource).toContain("TDSMobileAITProvider");
    expect(mainSource).toContain("BrowserRouter");
    expect(mainSource).toMatch(/<TDSMobileAITProvider>[\s\S]*<BrowserRouter>[\s\S]*<App\s*\/>[\s\S]*<\/BrowserRouter>[\s\S]*<\/TDSMobileAITProvider>/);
  });

  it("AC-3[P1]: App.tsx는 BrowserRouter/TDSMobileAITProvider/ReactDOM.createRoot를 중복 정의하지 않는다 (Provider는 main.tsx 단일 소유)", () => {
    const appSource = readSrcFile("App.tsx");

    expect(appSource).not.toContain("BrowserRouter");
    expect(appSource).not.toContain("TDSMobileAITProvider");
    expect(appSource).not.toContain("createRoot");
    expect(appSource).toContain("Routes");
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-4[P0]: 앱이 '/' 경로에서 정상 렌더링된다
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-4[P0]: '/' 경로 진입 시 크래시 없이 홈 화면(식비 플래너 타이틀 + 하단 3탭)이 렌더된다", () => {
    expect(() => {
      renderWithRouter(React.createElement(App), { initialEntries: ["/"] });
    }).not.toThrow();

    expect(screen.getByText("식비 플래너")).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(screen.getByRole("tab", { name: "홈" })).toHaveAttribute("aria-selected", "true");
  });

  it("AC-4[P0]: 5개 라우트 전부 크래시 없이 마운트/언마운트된다 (전체 경로 스모크)", () => {
    const routes = ["/", "/budget", "/record", "/stats", "/simulation"];

    for (const routePath of routes) {
      (mockLocation as { pathname: string }).pathname = routePath;
      expect(() => {
        const { unmount } = renderWithRouter(React.createElement(App), { initialEntries: [routePath] });
        unmount();
      }).not.toThrow();
    }
  });
});
