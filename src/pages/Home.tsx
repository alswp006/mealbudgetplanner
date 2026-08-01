import { useEffect, useState } from 'react';
import { Top, Chip, Paragraph, Spacing, Button, Toast } from '@toss/tds-mobile';
import { useLocation, useNavigate } from 'react-router-dom';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { Amount } from '@/components/Amount';
import { MiniBar } from '@/components/MiniBar';
import { EmptyState, LoadingState } from '@/components/StateView';
import { AllowanceHero } from '@/components/AllowanceHero';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { OverBudgetAlert } from '@/components/OverBudgetAlert';
import { CheckInSection } from '@/components/CheckInSection';
import { useDerived } from '@/lib/store';

const TAB_ITEMS = [
  { label: '홈', path: '/' },
  { label: '기록', path: '/record' },
  { label: '통계', path: '/stats' },
];

const AD_GROUP_ID = (import.meta.env.VITE_TOSS_AD_GROUP_ID as string | undefined) ?? 'home-checkin';

function fireHaptic(type: 'success' | 'tickWeak') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const today = todayString();
  const month = today.slice(0, 7);
  const { remaining, appData, overStatus, todayCheckedIn, streak, todayHasMeal } = useDerived(today);

  const recorded = Boolean((location.state as { recorded?: boolean } | null)?.recorded);
  const [showRecordedToast, setShowRecordedToast] = useState(recorded);

  useEffect(() => {
    if (recorded) {
      navigate(location.pathname, { replace: true, state: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRecord = () => {
    fireHaptic('success');
    navigate('/record');
  };

  const budget = appData.budget;
  const spentThisMonth = budget
    ? appData.meals.filter((meal) => meal.date.startsWith(budget.month)).reduce((sum, meal) => sum + meal.amount, 0)
    : 0;
  const remainingBudget = budget ? Math.max(budget.amount - spentThisMonth, 0) : 0;
  const progressRatio = budget && budget.amount > 0 ? spentThisMonth / budget.amount : 0;

  const monthChip = `${new Date().getMonth() + 1}월`;

  return (
    <ScreenScaffold
      top={
        <Top
          title={<Top.TitleParagraph>식비 플래너</Top.TitleParagraph>}
          right={<Chip>{monthChip}</Chip>}
        />
      }
      bottom={<FloatingTabBar items={TAB_ITEMS} />}
    >
      {appData.loading ? (
        <LoadingState rows={2} testId="home-loading" />
      ) : !budget ? (
        <EmptyState
          title="이번 달 예산을 정해볼까요?"
          description="예산을 정하면 끼니별 허용 금액을 알려드려요"
          action={
            <Button variant="fill" display="block" onClick={() => navigate('/budget')}>
              예산 설정하기
            </Button>
          }
        />
      ) : (
        <>
          <AllowanceHero
            amount={remaining.todayRemaining}
            testId="allowance-hero"
            action={
              <Button variant="fill" display="block" onClick={handleRecord}>
                식사 기록하기
              </Button>
            }
          />

          <Spacing size={16} />

          {overStatus.status !== 'normal' && (
            <>
              <OverBudgetAlert status={overStatus} onAdjustBudget={() => navigate('/budget')} />
              <Spacing size={16} />
            </>
          )}

          <Card testId="budget-card">
            <Paragraph.Text typography="st11">남은 예산</Paragraph.Text>
            <Spacing size={4} />
            <Amount value={remainingBudget} unit="원" typography="t2" />
            <Spacing size={12} />
            <Paragraph.Text typography="st12">이번 달 지출</Paragraph.Text>
            <Spacing size={4} />
            <Amount value={spentThisMonth} unit="원" typography="st12" />
            <Spacing size={12} />
            <MiniBar ratio={progressRatio} testId="budget-progress" />
          </Card>

          <Spacing size={16} />

          <CheckInSection
            today={today}
            month={month}
            budgetAmount={budget.amount}
            spentThisMonth={spentThisMonth}
            todayHasMeal={todayHasMeal}
            todayCheckedIn={todayCheckedIn}
            streak={streak}
            onCheckIn={appData.doCheckIn}
            adGroupId={AD_GROUP_ID}
          />
        </>
      )}

      <Spacing size={80} />

      <Toast
        open={showRecordedToast}
        text="기록했어요"
        position="bottom"
        onClose={() => setShowRecordedToast(false)}
      />
    </ScreenScaffold>
  );
}
