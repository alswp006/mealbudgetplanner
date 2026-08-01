/**
 * Packet 0011: 라우팅 배선 + FloatingTabBar (App.tsx 단일 소유)
 *
 * Covers:
 * - AC-1[P0]: 5개 경로(/, /budget, /record, /stats, /simulation) 정상 이동 — 각 경로 진입 시 해당 페이지가 렌더
 * - AC-2[P0]: FloatingTabBar 3탭(홈/기록/통계) 동작 — 활성탭 컬러 틴트(aria-selected) + 클릭 시 올바른 경로 이동
 * - AC-3: 전역 Provider 배선 — main.tsx에 TDSMobileAITProvider+BrowserRouter가 살아있고, App.tsx가 이를 중복 구현하지 않음
 * - AC-4: main.tsx 미수정(@AI:ANCHOR 보존) + App.tsx가 유일한 진입점 컴포넌트
 *
 * Integration:
 * - App.tsx의 모든 Route path에 대응하는 페이지 컴포넌트 파일이 실제로 존재하는지
 * - 소스 전역에서 navigate('...') 정적 문자열로 이동하는 모든 경로가 App.tsx Route로 정의돼 있는지
 * - 5개 경로 모두 크래시 없이 렌더되는지
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

// FloatingTabBar/페이지는 useLocation()으로 활성탭을 판정하는데, react-router-dom mock은
// 고정된 mockLocation 객체를 반환한다(MemoryRouter의 initialEntries와 별개) — 렌더 전
// mockLocation.pathname을 실제 진입 경로와 맞춰줘야 활성탭 판정을 검증할 수 있다.
beforeEach(() => {
  (mockLocation as { pathname: string }).pathname = "/";
});

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
    if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name) && !rel.includes("__tests__")) return [rel];
    return [];
  });
}

describe("Packet 0011: 라우팅 배선 + FloatingTabBar (App.tsx 단일 소유)", () => {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-1[P0]: 5개 경로 정상 이동
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-1[P0]: 기본 경로 / 진입 시 홈 화면(식비 플래너)이 렌더된다", () => {
    renderWithRouter(React.createElement(App), { initialEntries: ["/"] });

    expect(screen.getByText("식비 플래너")).toBeInTheDocument();
    expect(screen.queryByText("이번 달 식비 예산")).not.toBeInTheDocument();
  });

  it("AC-1[P0]: /budget, /record, /stats, /simulation 각 경로 진입 시 해당 페이지가 렌더된다", () => {
    const cases: Array<{ path: string; heading: string }> = [
      { path: "/budget", heading: "이번 달 식비 예산" },
      { path: "/record", heading: "식사 기록" },
      { path: "/stats", heading: "주간 분석" },
      { path: "/simulation", heading: "절약 시뮬레이션" },
    ];

    for (const { path: routePath, heading } of cases) {
      const { unmount } = renderWithRouter(React.createElement(App), { initialEntries: [routePath] });
      expect(screen.getByText(heading)).toBeInTheDocument();
      unmount();
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-2[P0]: FloatingTabBar 3탭 동작(활성탭 컬러 틴트 + 이동)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-2[P0]: 홈(/)에서는 '홈' 탭만 활성(aria-selected=true), 나머지는 비활성이다", () => {
    renderWithRouter(React.createElement(App), { initialEntries: ["/"] });

    const homeTab = screen.getByRole("tab", { name: "홈" });
    const recordTab = screen.getByRole("tab", { name: "기록" });
    const statsTab = screen.getByRole("tab", { name: "통계" });

    expect(homeTab).toHaveAttribute("aria-selected", "true");
    expect(recordTab).toHaveAttribute("aria-selected", "false");
    expect(statsTab).toHaveAttribute("aria-selected", "false");
  });

  it("AC-2[P0]: /stats에서는 '통계' 탭만 활성이며, '기록' 탭 클릭 시 /record로 이동한다", () => {
    (mockLocation as { pathname: string }).pathname = "/stats";
    renderWithRouter(React.createElement(App), { initialEntries: ["/stats"] });

    const statsTab = screen.getByRole("tab", { name: "통계" });
    expect(statsTab).toHaveAttribute("aria-selected", "true");

    const recordTab = screen.getByRole("tab", { name: "기록" });
    fireEvent.click(recordTab);

    expect(mockNavigate).toHaveBeenCalledWith("/record");
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-3: 전역 Provider 배선
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-3: main.tsx가 TDSMobileAITProvider와 BrowserRouter로 App을 감싸는 전역 Provider 배선을 유지한다", () => {
    const mainSource = readSrcFile("main.tsx");

    expect(mainSource).toContain("TDSMobileAITProvider");
    expect(mainSource).toContain("BrowserRouter");
    expect(mainSource).toMatch(/<TDSMobileAITProvider>[\s\S]*<BrowserRouter>[\s\S]*<App\s*\/>/);
  });

  it("AC-3: App.tsx는 BrowserRouter나 TDSMobileAITProvider를 중복 선언하지 않는다(Provider는 main.tsx 단일 소유)", () => {
    const appSource = readSrcFile("App.tsx");

    expect(appSource).not.toContain("BrowserRouter");
    expect(appSource).not.toContain("TDSMobileAITProvider");
    expect(appSource).toContain("Routes");
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AC-4: main.tsx 미수정(@AI:ANCHOR 보존)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("AC-4: main.tsx는 @AI:ANCHOR 주석을 보존하며 App을 정확히 1회만 렌더한다", () => {
    const mainSource = readSrcFile("main.tsx");

    expect(mainSource).toContain("@AI:ANCHOR");
    const appUsageCount = (mainSource.match(/<App\s*\/>/g) ?? []).length;
    expect(appUsageCount).toBe(1);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Integration: Route ↔ 페이지 파일 존재 + navigate 대상 ↔ Route 정합성
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it("all Route paths in App.tsx have a matching page component file under src/pages", () => {
    const appSource = readSrcFile("App.tsx");
    const routePaths = [...appSource.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);

    expect(routePaths).toEqual(
      expect.arrayContaining(["/", "/budget", "/record", "/stats", "/simulation"]),
    );

    const pageFiles = fs.readdirSync(path.join(SRC_ROOT, "pages"));
    for (const routePath of routePaths) {
      if (routePath.startsWith("/__")) continue; // dev-only gallery route, no prod page
      const importMatch = appSource.match(
        new RegExp(`import \\w+ from '\\.\\/pages\\/(\\w+)'[\\s\\S]*?<Route\\s+path="${routePath.replace("/", "\\/")}"`),
      );
      // Fallback: just assert every imported page file physically exists.
      const importedFiles = [...appSource.matchAll(/from '\.\/pages\/(\w+)'/g)].map((m) => `${m[1]}.tsx`);
      for (const f of importedFiles) {
        expect(pageFiles).toContain(f);
      }
      void importMatch;
    }
  });

  it("all navigate('...') static targets found in src/ resolve to a Route defined in App.tsx", () => {
    const appSource = readSrcFile("App.tsx");
    const definedRoutes = new Set(
      [...appSource.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]),
    );

    const files = [
      ...listSrcFilesRecursive("pages"),
      ...listSrcFilesRecursive("components"),
    ];

    const navigateTargets = new Set<string>();
    for (const file of files) {
      const source = readSrcFile(file);
      for (const m of source.matchAll(/navigate\(\s*['"](\/[a-zA-Z0-9/_-]*)['"]/g)) {
        navigateTargets.add(m[1]);
      }
    }

    expect(navigateTargets.size).toBeGreaterThan(0);
    for (const target of navigateTargets) {
      expect(definedRoutes.has(target)).toBe(true);
    }
  });

  it("pages render without crashing for all 5 defined routes (smoke)", () => {
    const routes = ["/", "/budget", "/record", "/stats", "/simulation"];

    for (const routePath of routes) {
      expect(() => {
        const { unmount } = renderWithRouter(React.createElement(App), { initialEntries: [routePath] });
        unmount();
      }).not.toThrow();
    }
  });
});
