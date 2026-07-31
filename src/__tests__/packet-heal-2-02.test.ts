import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAll } from "@/__tests__/__helpers__/mocks";

/**
 * TDD RED PHASE — 확정된 배럴 계약에 맞춰 라우팅·Provider·FloatingTabBar 배선으로 앱 조립 복구 [packet heal-2-02]
 *
 * heal-1-02가 라우팅/Provider/TabBar 배선 자체는 이미 고정했으므로(packet-heal-1-02.test.ts),
 * 이 패킷은 그 위에서 "모든 페이지가 heal-2-01이 고정한 src/data 배럴만 참조하는가"(AC-3)와
 * 라우팅 단일 진입점·Provider 단일 마운트가 유지되는가(AC-1/2/5)를 검증한다.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = resolve(__dirname, "..");

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

// jsdom-only React DOM nesting warnings from the shared TDS test mock's simplified
// markup are unrelated to this packet's scope (data barrel wiring) — filter them out.
function nonNestingErrorCalls(spy: ReturnType<typeof vi.spyOn>) {
  return spy.mock.calls.filter((call) => !String(call[0]).includes("validateDOMNesting"));
}

// Recursively collect source files under src/, excluding tests/helpers.
function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "__tests__" || entry === "data") continue;
      collectSourceFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".d.ts")) {
      acc.push(full);
    }
  }
  return acc;
}

describe("확정된 배럴 계약에 맞춰 라우팅·Provider·FloatingTabBar 배선으로 앱 조립 복구", () => {
  it("AC-1[P0] happy: 6개 라우트 각각에서 앱이 크래시 없이 부팅되고 FloatingTabBar 탭 이동이 동작한다", async () => {
    for (const path of ROUTES) {
      let unmount: () => void = () => {};
      await act(async () => {
        const result = await renderAppAt(path);
        unmount = result.unmount;
      });

      expect(document.body.textContent?.trim().length ?? 0).toBeGreaterThan(0);
      unmount();
    }

    let utils!: ReturnType<typeof render>;
    await act(async () => {
      utils = await renderAppAt("/");
    });

    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBeGreaterThanOrEqual(4);

    const analysisTab = tabs.find((t) => t.getAttribute("aria-label") === "분석");
    expect(analysisTab).toBeDefined();

    await act(async () => {
      fireEvent.click(analysisTab as HTMLElement);
    });
    expect((analysisTab as HTMLElement).getAttribute("aria-selected")).toBe("true");

    utils.unmount();
  });

  it("AC-2[P0]: 스토어 Provider가 트리 최상위 1곳(App)에만 마운트되고, 모든 페이지가 같은 데이터를 공유한다", async () => {
    // 어떤 page 파일도 자체 Provider(Context.Provider / *Provider 컴포넌트)를 렌더하지 않는다 —
    // 데이터 접근은 App 최상위에서 주입된 단일 스토어를 통해서만 이뤄져야 한다.
    const pageFiles = readdirSync(resolve(SRC_ROOT, "pages")).filter((f) => f.endsWith(".tsx"));
    for (const file of pageFiles) {
      const source = readFileSync(resolve(SRC_ROOT, "pages", file), "utf-8");
      expect(source).not.toMatch(/<\w*Provider[\s>]/);
    }

    // Budget에서 저장한 예산이 같은 App 트리 내 Home 재방문에도 반영된다 (Provider 단일 인스턴스 증거).
    let utils!: ReturnType<typeof render>;
    await act(async () => {
      utils = await renderAppAt("/budget");
    });

    const input = screen.getByPlaceholderText("예: 500,000") as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: "500000" } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /예산 저장/ }));
    });

    const rawBudgets = localStorage.getItem("mbp.budgets");
    expect(rawBudgets).not.toBeNull();
    const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    expect(JSON.parse(rawBudgets as string)).toMatchObject({ [month]: { totalBudget: 500000 } });

    utils.unmount();
  });

  it("AC-3[P0] happy: App/페이지/컴포넌트 소스가 데이터 접근에 @/lib/store·@/lib/types·@/lib/storage·@/lib/calc를 직접 import하지 않는다", () => {
    const forbidden = [
      /from\s+['"]@\/lib\/store['"]/,
      /from\s+['"]@\/lib\/types['"]/,
      /from\s+['"]@\/lib\/storage['"]/,
      /from\s+['"]@\/lib\/calc['"]/,
    ];

    const files = collectSourceFiles(SRC_ROOT).filter(
      (f) => !f.includes(`${resolve(SRC_ROOT, "lib")}`),
    );

    const violations: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf-8");
      for (const pattern of forbidden) {
        if (pattern.test(source)) {
          violations.push(`${file.replace(SRC_ROOT, "src")} matches ${pattern}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("AC-3[P0] edge: src/data 배럴이 페이지가 필요로 하는 데이터 심볼을 실제로 export한다 (미해결 import 방지)", async () => {
    const dataLayer = await import("@/data/index");

    expect(typeof dataLayer.getBudget).toBe("function");
    expect(typeof dataLayer.setBudget).toBe("function");
    expect(typeof dataLayer.addMeal).toBe("function");
    expect(typeof dataLayer.getMealsByMonth).toBe("function");
    expect(typeof dataLayer.getMonthSpent).toBe("function");
    expect(typeof dataLayer.getCategorySpent).toBe("function");
    expect(typeof dataLayer.getRemainingBudget).toBe("function");
    expect(typeof dataLayer.getFlags).toBe("function");
    expect(typeof dataLayer.setFlags).toBe("function");
  });

  it("AC-4[P0]: 모든 라우트를 순회 렌더해도 console.error가 한 번도 호출되지 않는다 (배럴 재배선 후 회귀 방지)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    for (const path of ROUTES) {
      await act(async () => {
        const { unmount } = await renderAppAt(path);
        unmount();
      });
    }

    expect(nonNestingErrorCalls(errorSpy)).toHaveLength(0);
  });

  it("AC-5[P0]: 라우트 경로 정의(0013/0015 중복 라우팅)가 src 전체에서 단 한 곳에서만 존재한다", () => {
    const files = collectSourceFiles(SRC_ROOT);
    const matches: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf-8");
      if (/path=["']\/budget["']/.test(source)) {
        matches.push(file.replace(SRC_ROOT, "src"));
      }
    }

    expect(matches).toHaveLength(1);
  });
});
