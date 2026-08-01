import { Button, Paragraph, Spacing } from "@toss/tds-mobile";
import type { getOverBudgetStatus } from "@/lib/calc";
import { formatKRW } from "@/lib/format";

export interface OverBudgetAlertProps {
  status: ReturnType<typeof getOverBudgetStatus>;
  onAdjustBudget: () => void;
}

const TONE_STYLE = {
  warning: { background: "var(--adaptiveOrange50)", color: "var(--adaptiveOrange500)" },
  critical: { background: "var(--adaptiveRed50)", color: "var(--adaptiveRed500)" },
} as const;

/**
 * 예산 초과 경고 배너 — 90%↑&<100%(warning) / 100%↑(critical)에서만 렌더.
 * TDS에 Callout 컴포넌트가 없어 adaptive 토큰 기반 커스텀 컨테이너로 구현.
 */
export function OverBudgetAlert({ status, onAdjustBudget }: OverBudgetAlertProps) {
  if (status.status === "normal") return null;

  const tone = status.status === "exceeded" ? "critical" : "warning";
  const style = TONE_STYLE[tone];

  return (
    <div
      data-testid="over-alert"
      data-tone={tone}
      style={{
        padding: 16,
        borderRadius: 16,
        backgroundColor: style.background,
      }}
    >
      {status.status === "approaching" ? (
        <>
          <Paragraph.Text typography="st11" color={style.color}>
            예산의 90%를 썼어요
          </Paragraph.Text>
          <Spacing size={4} />
          <Paragraph.Text typography="st12">
            남은 예산 {formatKRW(status.remainingBudget)}
          </Paragraph.Text>
        </>
      ) : (
        <Paragraph.Text typography="st11" color={style.color}>
          예산을 {formatKRW(status.overAmount)} 초과했어요
        </Paragraph.Text>
      )}
      <Spacing size={12} />
      <Button variant="weak" display="block" onClick={onAdjustBudget}>
        예산 조정
      </Button>
    </div>
  );
}
