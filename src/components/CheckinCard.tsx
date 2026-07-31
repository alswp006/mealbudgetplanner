import { useState } from 'react';
import { Button, Toast, Paragraph, Spacing, Badge } from '@toss/tds-mobile';
import { TossAds } from '@apps-in-toss/web-framework';
import { Card } from './Card';
import { AdSlot } from './AdSlot';
import { useAppData } from '@/lib/store';
import { calcPaceBadge } from '@/lib/calc';

// AdSlot과 동일한 가드 패턴 — WebView 밖에서는 isSupported가 예외를 던진다.
function isBannerAdSupported(): boolean {
  try {
    return TossAds.attachBanner.isSupported?.() === true;
  } catch {
    return false;
  }
}

const PACE_LABEL: Record<'ahead' | 'ontrack' | 'over', string> = {
  ahead: '여유',
  ontrack: '양호',
  over: '초과',
};

const PACE_COLOR: Record<'ahead' | 'ontrack' | 'over', 'blue' | 'green' | 'red'> = {
  ahead: 'blue',
  ontrack: 'green',
  over: 'red',
};

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysInMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

/**
 * 홈 내 일일 체크인 섹션 — F4. 오늘 기록 ≥1건 & 미체크인이면 체크인 가능.
 * 탭 → 배너 광고 노출 → 페이스 배지 산정·저장(광고 실패와 무관하게 지급).
 */
export function CheckinCard() {
  const { budget, meals, checkins, actions } = useAppData();
  const [processing, setProcessing] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [justGranted, setJustGranted] = useState(false);

  const date = today();
  const todayMeals = meals.filter((m) => m.date === date);
  const todayCheckin = checkins.find((c) => c.date === date) ?? null;

  const handleCheckin = () => {
    if (todayMeals.length === 0) {
      setToast('먼저 오늘 식사를 기록해 주세요');
      return;
    }
    setProcessing(true);
    setShowAd(true);

    // 배너 광고를 잠깐 노출한 뒤(성공/실패 무관) 배지를 지급한다.
    const adOk = isBannerAdSupported();
    setTimeout(() => {
      const now = new Date();
      const dayN = now.getDate();
      const totalDays = daysInMonth(now.getFullYear(), now.getMonth() + 1);
      const monthSpent = meals
        .filter((m) => m.date.startsWith(date.slice(0, 7)))
        .reduce((sum, m) => sum + m.amount, 0);
      const badge = budget
        ? calcPaceBadge(budget.totalBudget, monthSpent, dayN, totalDays)
        : 'ontrack';

      actions.checkin({ date, paceBadge: badge });
      setProcessing(false);
      setShowAd(false);
      setJustGranted(true);
      if (!adOk) setToast('광고를 불러오지 못했어요');
    }, 400);
  };

  return (
    <Card testId="checkin-card">
      <Paragraph.Text typography="st11">오늘 체크인</Paragraph.Text>
      <Spacing size={8} />

      {todayCheckin ? (
        <>
          <div
            className={justGranted ? 'badge-grant-animate' : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Badge size="medium" variant="weak" color={PACE_COLOR[todayCheckin.paceBadge]}>
              {PACE_LABEL[todayCheckin.paceBadge]}
            </Badge>
            <Paragraph.Text typography="t6">이번 달 페이스</Paragraph.Text>
          </div>
          <Spacing size={12} />
          <Button variant="weak" display="block" disabled>
            오늘 체크인 완료
          </Button>
        </>
      ) : (
        <>
          <Paragraph.Text typography="t6">
            오늘 식사를 기록하면 이번 달 소비 페이스를 확인할 수 있어요
          </Paragraph.Text>
          <Spacing size={12} />
          {showAd && <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID ?? 'checkin-banner'} />}
          <Button variant="fill" display="block" onClick={handleCheckin} disabled={processing}>
            {processing ? '체크인 처리 중...' : '오늘 체크인'}
          </Button>
        </>
      )}

      <Toast open={!!toast} position="bottom" text={toast ?? ''} onClose={() => setToast(null)} />
    </Card>
  );
}
