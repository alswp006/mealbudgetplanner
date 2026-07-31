import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAll } from "@/__tests__/__helpers__/mocks";

const __dirname = dirname(fileURLToPath(import.meta.url));

// TDS + @apps-in-toss + TossRewardAd + react-router-dom(useNavigate/useLocation) mocks
mockAll();

// 실제 페이지 구현(다른 패킷 산출물)은 이 패킷의 관심사가 아니다 — App.tsx가 "어느 경로에
// 어느 페이지를 연결했는가"만 검증하도록 각 페이지를 식별 가능한 스텁으로 치환한다.
vi.mock("@/pages/Home", () => ({
  default: () => React.createElement("div", { "data-testid": "page-home" }, "홈"),
}));
vi.mock("@/pages/Budget", () => ({
  default: () => React.createElement("div", { "data-testid": "page-budget" }, "예산 설정"),
}));
vi.mock("@/pages/Record", () => ({
  default: () => React.createElement("div", { "data-testid": "page-record" }, "식사 기록"),
}));
vi.mock("@/pages/Records", () => ({
  default: () => React.createElement("div", { "data-testid": "page-records" }, "기록 목록"),
}));
vi.mock("@/pages/Analysis", () => ({
  default: () => React.createElement("div", { "data-testid": "page-analysis" }, "분석"),
}));
vi.mock("@/pages/Simulate", () => ({
  default: () => React.createElement("div", { "data-testid": "page-simulate" }, "시뮬레이션"),
}));

// RouteState(src/lib/types.ts)의 키와 1:1 — navigate()로 이동 가능한 모든 경로.
const ROUTE_TO_TESTID: Record<string, string> = {
  "/": "page-home",
  "/budget": "page-budget",
  "/record": "page-record",
  "/records": "page-records",
  "/analysis": "page-analysis",
  "/simulate": "page-simulate",
};
const ROUTES = Object.keys(ROUTE_TO_TESTID);
const TESTID_TO_LABEL: Record<string, string> = {
  "page-home": "홈",
  "page-budget": "예산 설정",
  "page-record": "식사 기록",
  "page-records": "기록 목록",
  "page-analysis": "분석",
  "page-simulate": "시뮬레이션",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("라우팅 와이어링 + Provider 연결 + 통합 폴리시", () => {
  it("AC-1[P0] happy: RouteState의 6개 경로 각각에 대응하는 실제 페이지 컴포넌트가 렌더된다", async () => {
    const { default: App } = await import("@/App");

    for (const path of ROUTES) {
      const { unmount } = render(
        React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)),
      );

      const expectedTestId = ROUTE_TO_TESTID[path];
      expect(screen.getByTestId(expectedTestId).textContent).toBe(TESTID_TO_LABEL[expectedTestId]);

      // 다른 페이지의 테스트id는 동시에 나타나지 않는다 — path마다 정확히 하나의 페이지만 매칭
      const otherTestIds = Object.values(ROUTE_TO_TESTID).filter((id) => id !== expectedTestId);
      for (const otherId of otherTestIds) {
        expect(screen.queryByTestId(otherId)).toBeNull();
      }

      unmount();
    }
  });

  it("AC-1[P0] edge: 정의되지 않은 경로로 진입해도 앱이 크래시하지 않고 콘솔 에러가 없다", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
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

    for (const testId of Object.values(ROUTE_TO_TESTID)) {
      expect(screen.queryByTestId(testId)).toBeNull();
    }
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("AC-2[P0]: App.tsx 소스에 RouteState의 6개 경로 전부가 <Route path>로 정의되어 있다", async () => {
    const appSource = readFileSync(resolve(__dirname, "../App.tsx"), "utf-8");

    for (const path of ROUTES) {
      const routePattern = new RegExp(`path=["']${path.replace("/", "\\/")}["']`);
      expect(appSource).toMatch(routePattern);
    }
    // 페이지 소스도 함께 import되어 있어야 한다 (Placeholder로 대체된 채 남아있지 않음)
    expect(appSource).toMatch(/pages\/Budget/);
    expect(appSource).toMatch(/pages\/Record["']/);
    expect(appSource).toMatch(/pages\/Records["']/);
    expect(appSource).toMatch(/pages\/Analysis["']/);
    expect(appSource).toMatch(/pages\/Simulate["']/);
  });

  it("AC-2[P1]: 하단 FloatingTabBar 탭을 눌러 이동하는 모든 경로에 실제 페이지가 연결되어 있다", async () => {
    const { default: App } = await import("@/App");
    render(React.createElement(MemoryRouter, { initialEntries: ["/"] }, React.createElement(App)));

    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBeGreaterThanOrEqual(4);

    fireEvent.click(tabs[1]);
    expect(screen.getByTestId("page-records").textContent).toBe("기록 목록");

    fireEvent.click(tabs[2]);
    expect(screen.getByTestId("page-analysis").textContent).toBe("분석");

    fireEvent.click(tabs[3]);
    expect(screen.getByTestId("page-simulate").textContent).toBe("시뮬레이션");
  });

  it("AC-3[P0]: main.tsx는 수정되지 않았고 TDSMobileAITProvider/BrowserRouter를 그대로 유지한다", () => {
    const mainSource = readFileSync(resolve(__dirname, "../main.tsx"), "utf-8");

    expect(mainSource).toContain("@AI:ANCHOR");
    expect(mainSource).toMatch(/TDSMobileAITProvider/);
    expect(mainSource).toMatch(/BrowserRouter/);
    // Provider 배선 책임은 App.tsx에만 있어야 한다 — main.tsx에 재선언 금지
    expect(mainSource).not.toMatch(/AppDataProvider/);
  });

  it("AC-4[P0] happy: 앱이 '/' 경로에서 정상 렌더링되고 콘솔 에러가 없다", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { default: App } = await import("@/App");

    render(React.createElement(MemoryRouter, { initialEntries: ["/"] }, React.createElement(App)));

    expect(screen.getByTestId("page-home").textContent).toBe("홈");
    expect(document.body.textContent?.trim().length).toBeGreaterThan(0);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("AC-4[P0] edge: '/' 이외의 알려진 경로로 직접 진입(새로고침)해도 해당 페이지만 렌더된다", async () => {
    const { default: App } = await import("@/App");
    render(
      React.createElement(MemoryRouter, { initialEntries: ["/simulate"] }, React.createElement(App)),
    );

    expect(screen.getByTestId("page-simulate").textContent).toBe("시뮬레이션");
    expect(screen.queryByTestId("page-home")).toBeNull();
  });
});
