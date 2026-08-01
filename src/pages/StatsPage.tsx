import { Top, Paragraph, Spacing, Button } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { DonutChart } from '@/components/DonutChart';
import { MiniBar } from '@/components/MiniBar';
import { Sparkline } from '@/components/Sparkline';
import { EmptyState, LoadingState } from '@/components/StateView';
import { useDerived } from '@/lib/store';
import { formatKRW } from '@/lib/format';
import type { MealCategory } from '@/lib/types';

const CATEGORY_ORDER: MealCategory[] = ['delivery', 'dining_out', 'homemade'];
const CATEGORY_LABEL: Record<MealCategory, string> = {
  delivery: '배달',
  dining_out: '외식',
  homemade: '직접조리',
};

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const result = new Date(Date.UTC(y, m - 1, d + days));
  const yyyy = result.getUTCFullYear();
  const mm = String(result.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(result.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function StatsPage() {
  const navigate = useNavigate();
  const today = todayString();
  const { weeklyStats, appData } = useDerived(today);

  const isEmpty = weeklyStats.totalAmount === 0;

  const start = addDays(today, -7);
  const recentMeals = appData.meals.filter((meal) => meal.date >= start && meal.date <= today);
  const recentDates = Array.from(new Set(recentMeals.map((meal) => meal.date))).sort();
  const dailyTotals = recentDates.map((date) =>
    recentMeals.filter((meal) => meal.date === date).reduce((sum, meal) => sum + meal.amount, 0),
  );

  const maxCategory = CATEGORY_ORDER.reduce((max, cat) =>
    weeklyStats.totalByCategory[cat] > weeklyStats.totalByCategory[max] ? cat : max,
  CATEGORY_ORDER[0]);

  const segments = CATEGORY_ORDER.map((cat) => ({
    key: cat,
    label: CATEGORY_LABEL[cat],
    amount: weeklyStats.totalByCategory[cat],
    percentage: weeklyStats.categoryPercentage[cat],
  }));

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>주간 분석</Top.TitleParagraph>} />}
    >
      {appData.loading ? (
        <LoadingState rows={3} testId="stats-loading" />
      ) : isEmpty ? (
        <EmptyState
          title="이번 주 기록이 아직 없어요"
          description="식사를 기록하면 주간 분석을 볼 수 있어요"
          action={
            <Button variant="fill" display="block" onClick={() => navigate('/record')}>
              기록하러 가기
            </Button>
          }
        />
      ) : (
        <>
          <DonutChart segments={segments} testId="donut-chart" />

          <Spacing size={16} />

          <Card testId="stats-card">
            <Paragraph.Text typography="t2">
              주간 총 식비 {formatKRW(weeklyStats.totalAmount)}
            </Paragraph.Text>
            <Spacing size={12} />
            {CATEGORY_ORDER.map((cat) => (
              <div key={cat} style={{ marginBottom: 8 }}>
                <Paragraph.Text typography="st13">{CATEGORY_LABEL[cat]}</Paragraph.Text>
                <Spacing size={4} />
                <MiniBar ratio={weeklyStats.categoryPercentage[cat] / 100} testId={`stats-minibar-${cat}`} />
              </div>
            ))}
          </Card>

          <Spacing size={12} />

          <Paragraph.Text typography="st12">
            이번 주는 {CATEGORY_LABEL[maxCategory]}에 가장 많이 썼어요
          </Paragraph.Text>

          {recentDates.length >= 3 ? (
            <>
              <Spacing size={16} />
              <Sparkline data={dailyTotals} testId="stats-sparkline" />
            </>
          ) : null}

          <Spacing size={16} />

          <Button variant="weak" display="block" onClick={() => navigate('/simulation')}>
            절약 시뮬레이션 보기
          </Button>
        </>
      )}

      <Spacing size={80} />
    </ScreenScaffold>
  );
}
