import { useMemo } from 'react';
import { Top, Asset, Paragraph, Spacing } from '@toss/tds-mobile';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { EmptyState, LoadingState } from '../components/StateView';
import { Card } from '../components/Card';
import { Amount } from '../components/Amount';
import { MiniBar } from '../components/MiniBar';
import { TossRewardAd } from '../components/TossRewardAd';
import { useAppData } from '@/lib/store';
import type { MealCategory } from '@/lib/types';

const CATEGORY_LABEL: Record<MealCategory, string> = {
  delivery: '배달',
  dining_out: '외식',
  home_cooked: '직접조리',
};
const CATEGORIES: MealCategory[] = ['delivery', 'dining_out', 'home_cooked'];
const DAY_MS = 24 * 60 * 60 * 1000;

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function toUTC(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/**
 * 주간 소비 패턴 분석 — 리워드 광고 시청 후 최근 7일 카테고리 비율 공개.
 * S5 계약: data-testid="donut-card", "category-legend", 총액 t2 강조.
 */
export default function Analysis() {
  const { meals, loading } = useAppData();

  const stats = useMemo(() => {
    const todayTs = toUTC(today());
    const recent = meals.filter((m) => {
      const diff = (todayTs - toUTC(m.date)) / DAY_MS;
      return diff >= 0 && diff <= 7;
    });
    const total = recent.reduce((s, r) => s + r.amount, 0);
    const byCategory = CATEGORIES.map((c) => {
      const amount = recent.filter((r) => r.category === c).reduce((s, r) => s + r.amount, 0);
      return { category: c, amount, ratio: total > 0 ? amount / total : 0 };
    });
    return { total, count: recent.length, byCategory };
  }, [meals]);

  if (loading) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>분석</Top.TitleParagraph>} />}>
        <LoadingState rows={4} />
      </ScreenScaffold>
    );
  }

  if (stats.count === 0) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>분석</Top.TitleParagraph>} />}>
        <EmptyState
          icon={<Asset.ContentIcon name="iconStarRegular" alt="기록 없음" style={{ width: 48, height: 48 }} />}
          title="분석할 식사 기록이 아직 없어요"
          description="최근 7일 안에 식사를 기록하면 소비 비율을 볼 수 있어요"
        />
      </ScreenScaffold>
    );
  }

  const result = (
    <>
      <Card testId="donut-card">
        <Paragraph.Text typography="st11">최근 7일 지출</Paragraph.Text>
        <Spacing size={4} />
        <Amount value={stats.total} unit="원" typography="t2" testId="analysis-total" />
        <Spacing size={16} />
        <div data-testid="category-legend" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {stats.byCategory.map((c) => (
            <div key={c.category}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Paragraph.Text typography="t6">{CATEGORY_LABEL[c.category]}</Paragraph.Text>
                <Paragraph.Text typography="t6">
                  {Math.round(c.ratio * 100)}% · {c.amount.toLocaleString('ko-KR')}원
                </Paragraph.Text>
              </div>
              <Spacing size={6} />
              <MiniBar ratio={c.ratio} />
            </div>
          ))}
        </div>
      </Card>
      <Spacing size={16} />
      <Paragraph.Text typography="st13">최근 7일 기록 {stats.count}건 기준</Paragraph.Text>
      <Spacing size={80} />
    </>
  );

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>분석</Top.TitleParagraph>} />}>
      <TossRewardAd
        slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID ?? 'analysis-unlock'}
        description="광고를 보고 최근 7일 소비 비율을 확인해요"
        buttonText="주간 분석 보기"
      >
        {result}
      </TossRewardAd>
    </ScreenScaffold>
  );
}
