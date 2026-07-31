import { describe, it, expect, beforeEach } from "vitest";

let dataLayer: any;
beforeEach(async () => {
  localStorage.clear();
  dataLayer = await import("@/data/index");
});

describe("dbg2", () => {
  it("repro", () => {
    dataLayer.addMeal({ date: "2026-08-01", slot: "lunch", category: "delivery", amount: 12000, memo: "" });
    console.log("via barrel getMealsByMonth:", dataLayer.getMealsByMonth("2026-08"));
    console.log("localStorage raw:", localStorage.getItem("mbp.meals"));
    console.log("getCategorySpent:", dataLayer.getCategorySpent("2026-08", "delivery"));
  });
});
