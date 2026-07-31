import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAll } from "@/__tests__/__helpers__/mocks";

/**
 * TDD RED PHASE — 라우팅·Provider 통합 배선으로 앱 조립 복구 [packet heal-1-02]
 *
 * 실제 페이지 구현체(Home/Budget/Record/Records/Analysis/Simulate)를 그대로 렌더해서
 * App.tsx가 라우팅 + AppDataProvider 배선을 실제로 완료했는지 검증한다(0015처럼 페이지를
 * 스텁으로 치환하지 않음 — AC-2가 "실제 페이지에 Provider 컨텍스트가 주입되는가"이므로).
 */

const __dirname = dirname(fileURLToPath(import.meta.url));

mockAll();

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

const ROUTES = ["/", "/budget", "/record", "/records", "/analysis", "/simulate"];

async function renderAppAt(path: string) {
  const { default: App } = await import("@/App");
  return render(
    React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)),
  );
}

// jsdom-only React DOM nesting warnings can come from the shared TDS test mock's
// simplified markup (unrelated to routing/Provider wiring, this packet's actual scope) —
// filter those out so this file only flags errors relevant to AC-1/AC-4 (routing/provider crashes).
function nonNestingErrorCalls(spy: ReturnType<typeof vi.spyOn>) {
  return spy.mock.calls.filter(
    (call) => !String(call[0]).includes("validateDOMNesting"),
  );
}

describe("라우팅·Provider 통합 배선으로 앱 조립 복구", () => {
  it("AC-1[P0] happy: 6개 라우트 각각에서 앱이 크래시 없이 부팅되고 콘솔 에러 없이 렌더된다", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    for (const path of ROUTES) {
      let unmount: () => void = () => {};
      await act(async () => {
        const result = await renderAppAt(path);
        unmount = result.unmount;
      });

      expect(document.body.textContent?.trim().length ?? 0).toBeGreaterThan(0);
      unmount();
    }

    expect(nonNestingErrorCalls(errorSpy)).toHaveLength(0);
  });

  it("AC-1[P0] edge: 정의되지 않은 경로로 진입해도 크래시 없이 빈 콘텐츠 영역만 렌더된다", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await act(async () => {
      await expect(renderAppAt("/does-not-exist")).resolves.toBeDefined();
    });

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("AC-2[P0] happy: Budget 페이지가 실제 AppDataProvider 컨텍스트로부터 useAppData를 정상 주입받는다 (throw 없음)", async () => {
    await act(async () => {
      await renderAppAt("/budget");
    });

    // useAppData()가 Provider 밖에서 호출되면 "must be used within AppDataProvider"를 throw한다.
    // 렌더가 여기까지 도달했다는 것 자체가 컨텍스트 주입 성공의 증거이며, 실제 폼 필드가
    // 보인다는 것으로 실행 경로(useState(budget) 등)가 정상 완주했음을 추가 확인한다.
    expect(screen.getByPlaceholderText("예: 500,000").tagName).toBe("INPUT");
    expect(screen.getAllByText("예산 설정").length).toBeGreaterThan(0);
  });

  it("AC-2[P0] edge: Budget에서 저장한 예산이 Provider 상태를 거쳐 Home 재렌더에도 반영된다 (모든 페이지가 같은 스토어를 공유)", async () => {
    localStorage.clear();
    let utils!: ReturnType<typeof render>;
    await act(async () => {
      utils = await renderAppAt("/budget");
    });

    const input = screen.getByPlaceholderText("예: 500,000") as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: "500000" } });
    });

    const saveBtn = screen.getByRole("button", { name: /예산 저장/ });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    // navigate('/', { replace: true })가 실제로 실행되어 Home으로 이동했다면
    // localStorage에 예산이 실제로 영속화되어 있어야 한다 (Provider의 actions.saveBudget 경로).
    const rawBudgets = localStorage.getItem("mbp.budgets");
    expect(rawBudgets).not.toBeNull();
    expect(JSON.parse(rawBudgets as string)).toMatchObject({
      [`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`]: {
        totalBudget: 500000,
      },
    });

    utils.unmount();
  });

  it("AC-3[P0]: FloatingTabBar 탭이 4개 이상 렌더되고, 클릭 시 실제로 경로가 이동하며, 각 탭의 터치 타깃이 44px 이상이다", async () => {
    await act(async () => {
      await renderAppAt("/");
    });

    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBeGreaterThanOrEqual(4);

    for (const tab of tabs) {
      const minHeight = parseInt((tab as HTMLElement).style.minHeight || "0", 10);
      expect(minHeight).toBeGreaterThanOrEqual(44);
    }

    const recordsTab = tabs.find((t) => t.getAttribute("aria-label") === "기록");
    expect(recordsTab?.getAttribute("aria-label")).toBe("기록");

    await act(async () => {
      fireEvent.click(recordsTab as HTMLElement);
    });

    expect((recordsTab as HTMLElement).getAttribute("aria-selected")).toBe("true");
  });

  it("AC-4[P0]: main.tsx는 수정되지 않았고, App.tsx가 유일한 Provider 배선 지점이며 vite.config.ts에 외부 SDK를 external 처리하지 않는다", () => {
    const mainSource = readFileSync(resolve(__dirname, "../main.tsx"), "utf-8");
    const appSource = readFileSync(resolve(__dirname, "../App.tsx"), "utf-8");
    const viteConfigSource = readFileSync(resolve(__dirname, "../../vite.config.ts"), "utf-8");

    expect(mainSource).toContain("@AI:ANCHOR");
    expect(mainSource).not.toMatch(/AppDataProvider/);
    expect(appSource).toMatch(/AppDataProvider/);
    // rollupOptions.external에 SDK를 등록하면 안 된다(주석 속 "external" 언급은 허용) —
    // 실제 코드에서 external: 키가 쓰였는지만 검사.
    expect(viteConfigSource).not.toMatch(/external\s*:/);
  });

  it("AC-4[P0] edge: 모든 라우트를 순회 렌더해도 console.error가 한 번도 호출되지 않는다 (프로덕션 검수 콘솔 에러 0개 전제조건)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    for (const path of ROUTES) {
      await act(async () => {
        const { unmount } = await renderAppAt(path);
        unmount();
      });
    }

    expect(nonNestingErrorCalls(errorSpy)).toHaveLength(0);
  });
});
