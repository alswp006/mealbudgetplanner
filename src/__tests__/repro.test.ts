import { describe, it, expect } from "vitest";

describe("repro (noop placeholder)", () => {
  it("noop", () => {
    expect(true).toBe(true);
  });
});
