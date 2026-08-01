import { describe, it, expect } from "vitest";

// Leftover debug scratch from a prior session — file deletion is blocked in this
// sandbox, so this is neutralized (no-op) instead of removed.
describe.skip("zzz-debug2 (neutralized scratch file)", () => {
  it("noop", () => {
    expect(true).toBe(true);
  });
});
