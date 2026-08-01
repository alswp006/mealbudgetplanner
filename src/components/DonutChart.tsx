import { Paragraph } from "@toss/tds-mobile";
import { formatKRW } from "@/lib/format";
import type { MealCategory } from "@/lib/types";

export interface DonutSegment {
  key: MealCategory | string;
  label: string;
  amount: number;
  percentage: number;
}

const SEGMENT_COLOR: Record<string, string> = {
  delivery: "var(--adaptiveBlue500)",
  dining_out: "var(--adaptiveOrange500)",
  homemade: "var(--adaptiveRed500)",
};
const FALLBACK_COLOR = "var(--adaptiveGrey500)";

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * 카테고리별 지출 비중 도넛 차트 — SVG stroke-dasharray 세그먼트(의존성 0).
 *
 * Pre-built (재구현 금지): 색은 카테고리별 var(--adaptive*) 토큰 고정(다크모드 자동, HEX 금지).
 */
export function DonutChart({ segments, testId }: { segments: DonutSegment[]; testId?: string }) {
  let cumulativePercent = 0;

  return (
    <div data-testid={testId} style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <svg
        width={96}
        height={96}
        viewBox="0 0 100 100"
        role="img"
        aria-label="카테고리별 지출 비중 도넛 차트"
      >
        {segments.map((seg) => {
          const dash = (seg.percentage / 100) * CIRCUMFERENCE;
          const offset = CIRCUMFERENCE * (1 - cumulativePercent / 100);
          cumulativePercent += seg.percentage;
          return (
            <circle
              key={seg.key}
              cx={50}
              cy={50}
              r={RADIUS}
              fill="none"
              stroke={SEGMENT_COLOR[seg.key] ?? FALLBACK_COLOR}
              strokeWidth={16}
              strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
              strokeDashoffset={offset}
              transform="rotate(-90 50 50)"
            />
          );
        })}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        {segments.map((seg) => (
          <div
            key={seg.key}
            data-testid={`donut-legend-${seg.key}`}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: SEGMENT_COLOR[seg.key] ?? FALLBACK_COLOR,
                flexShrink: 0,
              }}
            />
            <Paragraph.Text typography="st12">
              {seg.label} {seg.percentage}% · {formatKRW(seg.amount)}
            </Paragraph.Text>
          </div>
        ))}
      </div>
    </div>
  );
}
