import { useState } from "react";
import { Button, Paragraph, Spacing, BottomSheet, Toast, Badge } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { AdSlot } from "@/components/AdSlot";
import { getPaceBadge } from "@/lib/calc";
import type { PaceBadge, WriteResult } from "@/lib/types";

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

const BADGE_INFO: Record<PaceBadge, { label: string; sheetTitle: string; color: "blue" | "green" | "red" }> = {
  ahead: { label: "여유", sheetTitle: "여유 페이스예요", color: "blue" },
  ontrack: { label: "정상", sheetTitle: "정상 페이스예요", color: "green" },
  over: { label: "초과", sheetTitle: "초과 페이스예요", color: "red" },
};

function fireHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "success" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

/**
 * 오늘 체크인 섹션 — 배너 광고 + 체크인 버튼 + 배지 BottomSheet.
 * 중복 체크인은 저장/광고 없이 Toast로만 안내.
 */
export function CheckInSection({
  today,
  month,
  budgetAmount,
  spentThisMonth,
  todayHasMeal,
  todayCheckedIn,
  streak,
  onCheckIn,
  adGroupId,
}: CheckInSectionProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [earnedBadge, setEarnedBadge] = useState<PaceBadge | null>(null);
  const [dupToastOpen, setDupToastOpen] = useState(false);

  const handleClick = () => {
    if (todayCheckedIn) {
      setDupToastOpen(true);
      return;
    }

    const badge = getPaceBadge({ budget: budgetAmount, spent: spentThisMonth, month, today });
    const result = onCheckIn({ date: today, badge, spentSoFar: spentThisMonth });
    if (result.ok) {
      setEarnedBadge(badge);
      setSheetOpen(true);
      fireHaptic();
    }
  };

  return (
    <div>
      {adGroupId && <AdSlot adGroupId={adGroupId} />}

      <Spacing size={16} />

      {!todayHasMeal && (
        <>
          <Paragraph.Text typography="st13" color="var(--adaptiveGrey500)">
            오늘 식사를 먼저 기록해주세요
          </Paragraph.Text>
          <Spacing size={8} />
        </>
      )}

      {streak >= 3 && (
        <>
          <Paragraph.Text typography="st13">{streak}일 연속 기록 중 🔥</Paragraph.Text>
          <Spacing size={8} />
        </>
      )}

      <Button
        variant="weak"
        display="block"
        disabled={!todayHasMeal}
        onClick={handleClick}
      >
        {todayCheckedIn ? "오늘 체크인 완료" : "오늘 체크인"}
      </Button>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        {earnedBadge && (
          <>
            <Paragraph.Text typography="t3">{BADGE_INFO[earnedBadge].sheetTitle}</Paragraph.Text>
            <Spacing size={8} />
            <Badge size="medium" variant="weak" color={BADGE_INFO[earnedBadge].color}>
              {BADGE_INFO[earnedBadge].label}
            </Badge>
            <Spacing size={16} />
            <Button variant="fill" display="block" onClick={() => setSheetOpen(false)}>
              확인
            </Button>
          </>
        )}
      </BottomSheet>

      <Toast
        open={dupToastOpen}
        text="오늘은 이미 체크인했어요"
        position="top"
        onClose={() => setDupToastOpen(false)}
      />
    </div>
  );
}
