import type { getOverBudgetStatus } from "@/lib/calc";

// STUB — packet 0007 TDD red phase. NOT the real implementation.
// Exists only so `tsc`/imports resolve and src/__tests__/packet-0007.test.ts can
// run and fail on assertions (real red phase) instead of failing to compile.
// The Coder step replaces this with the actual TDS-based implementation.

export interface OverBudgetAlertProps {
  status: ReturnType<typeof getOverBudgetStatus>;
  onAdjustBudget: () => void;
}

export function OverBudgetAlert(_props: OverBudgetAlertProps) {
  return null;
}
