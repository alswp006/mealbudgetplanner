import type { PaceBadge, WriteResult } from "@/lib/types";

// STUB — packet 0007 TDD red phase. NOT the real implementation.
// Exists only so `tsc`/imports resolve and src/__tests__/packet-0007.test.ts can
// run and fail on assertions (real red phase) instead of failing to compile.
// The Coder step replaces this with the actual TDS-based implementation.

export interface CheckInSectionProps {
  today: string;
  month: string;
  budgetAmount: number;
  spentThisMonth: number;
  todayHasMeal: boolean;
  todayCheckedIn: boolean;
  streak: number;
  onCheckIn: (input: { date: string; badge: PaceBadge; spentSoFar: number }) => WriteResult;
  adGroupId?: string;
}

export function CheckInSection(_props: CheckInSectionProps) {
  return null;
}
