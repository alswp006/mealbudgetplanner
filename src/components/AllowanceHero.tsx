import type { ReactNode } from "react";
import { SummaryHero } from "./SummaryHero";
import { CountUp } from "./CountUp";

/**
 * 홈 대시보드 히어로 — 오늘 남은 끼니 허용 금액을 크게 보여주는 시각 앵커.
 * SummaryHero(Card + 라벨 + 핵심 숫자)를 고정 라벨로 감싼 얇은 래퍼.
 */
export function AllowanceHero({
  amount,
  caption,
  action,
  testId,
}: {
  amount: number;
  caption?: ReactNode;
  action?: ReactNode;
  testId?: string;
}) {
  return (
    <SummaryHero
      testId={testId}
      label="오늘 남은 끼니 허용 금액"
      value={<CountUp value={amount} unit="원" typography="t1" />}
      caption={caption}
      action={action}
    />
  );
}
