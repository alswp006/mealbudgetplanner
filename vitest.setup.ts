/**
 * Vitest setup — runs before each test file.
 *
 * Handles:
 *  - localStorage isolation between tests (prevents cross-test pollution)
 *  - requestAnimationFrame shim for jsdom (needed for animate/countup utilities)
 *  - sessionStorage isolation
 *  - console.error filtering (React Router warnings etc.)
 */

import { beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import Module from "node:module";
import path from "node:path";
import fs from "node:fs";

// ── require("@/...") alias resolution ──
// Some tests use CJS require() (e.g. to re-require a module between assertions).
// Node's own module resolver knows nothing about Vite's "@" alias or extensionless
// .ts imports, so patch _resolveFilename to mirror vite.config.ts's alias.
const nodeModule = Module as unknown as {
  _resolveFilename: (request: string, ...rest: unknown[]) => string;
};
const originalResolveFilename = nodeModule._resolveFilename;
nodeModule._resolveFilename = function (request: string, ...rest: unknown[]) {
  if (request.startsWith("@/")) {
    request = path.resolve(process.cwd(), "src", request.slice(2));
  }
  if (!path.extname(request) && fs.existsSync(`${request}.ts`)) {
    request = `${request}.ts`;
  }
  return originalResolveFilename.call(this, request, ...rest);
};

// ── localStorage / sessionStorage isolation ──
// jsdom's storage persists between tests by default. Clear it to prevent pollution.
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

// ── requestAnimationFrame shim for jsdom ──
// jsdom does NOT implement rAF natively, so animate/countup code hangs forever.
// Shim that immediately invokes callback with a monotonic timestamp.
if (typeof globalThis.requestAnimationFrame !== "function") {
  let now = 0;
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    now += 16;
    return setTimeout(() => cb(now), 0) as unknown as number;
  }) as typeof globalThis.requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) => clearTimeout(id)) as typeof globalThis.cancelAnimationFrame;
}

// ── afterEach reset ──
afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers(); // in case a test used fake timers
});
