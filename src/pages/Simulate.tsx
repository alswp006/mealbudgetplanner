import { useMemo, useState } from 'react';
import { Top, AlertDialog, Toast, Paragraph, Spacing, Button } from '@toss/tds-mobile';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { EmptyState, LoadingState } from '../components/StateView';
import { Card } from '../components/Card';
import { SummaryHero } from '../components/SummaryHero';
import { CountUp } from '../components/CountUp';
import { TossRewardAd } from '../components/TossRewardAd';
import { AdSlot } from '../components/AdSlot';
import { useAppData, getSpentByCategory, getFlags, setFlags } from '@/data';
import type { SimulateRequest, SimulateResponse } from '@/data';

const MIN_RECORDS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function toUTC(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

type SimResult = { monthlySaving: number; targetDeliveryRatio: number; comment: string; ai: boolean };
type Status = 'gate' | 'loading' | 'done' | 'error';

/**
 * 월간 식비 절약 시뮬레이션 — AI 고지(1회) + 리워드 광고 후 결과 공개.
 * 절약액은 규칙 기반(클라이언트), AI 코멘트만 서버(POST /simulate)에서 생성.
 * S6 계약: data-testid="saving-hero" SummaryHero + "ai-tip-card" Card + AI 배지.
 */
export default function Simulate() {
  const { meals, budget } = useAppData();
  const [aiNoticeOpen, setAiNoticeOpen] = useState(() => !getFlags().aiNoticeAcknowledged);
  const [status, setStatus] = useState<Status>('gate');
  const [result, setResult] = useState<SimResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const month = currentMonth();
  const recentCount = useMemo(() => {
    const todayTs = toUTC(
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`
    );
    return meals.filter((m) => {
      const diff = (todayTs - toUTC(m.date)) / DAY_MS;
      return diff >= 0 && diff <= 30;
    }).length;
  }, [meals]);

  const acknowledgeAi = () => {
    setFlags({ aiNoticeAcknowledged: true });
    setAiNoticeOpen(false);
  };

  const runSimulation = async () => {
    setStatus('loading');
    const { total, byCategory } = getSpentByCategory(meals, month);
    const req: SimulateRequest = {
      month,
      totalBudget: budget?.totalBudget ?? 0,
      spentByCategory: {
        delivery: byCategory.delivery.amount,
        dining_out: byCategory.dining_out.amount,
        home_cooked: byCategory.home_cooked.amount,
      },
      recordCount: recentCount,
    };
    // 규칙 기반 절약액(클라이언트) — 배달 비중을 30%까지 줄였을 때 절감액
    const ruleSaving = Math.max(0, req.spentByCategory.delivery - Math.round(total * 0.3));

    const api = import.meta.env.VITE_SIMULATE_API_URL;
    if (!api) {
      setResult({
        monthlySaving: ruleSaving,
        targetDeliveryRatio: 30,
        comment: '배달 비중을 30%까지 줄이면 한 달에 이만큼 아낄 수 있어요',
        ai: false,
      });
      setStatus('done');
      return;
    }
    try {
      const res = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data: SimulateResponse = await res.json();
      setResult({
        monthlySaving: data.monthlySaving,
        targetDeliveryRatio: data.targetDeliveryRatio,
        comment: data.aiComment,
        ai: data.generatedByAI === true,
      });
      setStatus('done');
    } catch {
      setStatus('error');
      setToast('결과를 불러오지 못했어요. 다시 시도해 주세요');
    }
  };

  const notice = (
    <AlertDialog
      open={aiNoticeOpen}
      title="생성형 AI 안내"
      description="이 서비스는 생성형 AI를 활용해 절약 팁을 만들어요. 참고용으로 확인해 주세요."
      alertButton={<AlertDialog.AlertButton onClick={acknowledgeAi}>확인</AlertDialog.AlertButton>}
      onClose={acknowledgeAi}
    />
  );

  if (recentCount < MIN_RECORDS) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>시뮬</Top.TitleParagraph>} />}>
        <EmptyState
          title="식사를 5번 이상 기록해 주세요"
          description={`정확한 분석을 위해 최근 30일 기록이 ${MIN_RECORDS}건 이상 필요해요 (현재 ${recentCount}건)`}
        />
        {notice}
      </ScreenScaffold>
    );
  }

  const resultView = result && (
    <>
      <SummaryHero
        label="이번 달 예상 절약액"
        value={<CountUp value={result.monthlySaving} unit="원" typography="t1" />}
        caption={`배달 비중 ${result.targetDeliveryRatio}% 기준`}
        ai={result.ai}
        testId="saving-hero"
      />
      <Spacing size={16} />
      <Card testId="ai-tip-card">
        <Paragraph.Text typography="st11">실천 팁</Paragraph.Text>
        <Spacing size={6} />
        <Paragraph.Text typography="t5">{result.comment}</Paragraph.Text>
        {result.ai && (
          <>
            <Spacing size={8} />
            <Paragraph.Text typography="st13">AI가 생성한 결과입니다</Paragraph.Text>
          </>
        )}
      </Card>
      <Spacing size={16} />
      <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID ?? 'simulate-banner'} />
      <Spacing size={80} />
    </>
  );

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>시뮬</Top.TitleParagraph>} />}>
      {status === 'done' && resultView}

      {status === 'loading' && <LoadingState rows={4} />}

      {status === 'error' && (
        <>
          <EmptyState
            title="결과를 불러오지 못했어요"
            description="네트워크 상태를 확인하고 다시 시도해 주세요"
            action={
              <Button variant="weak" display="block" onClick={runSimulation}>
                다시 시도
              </Button>
            }
          />
        </>
      )}

      {status === 'gate' && (
        <TossRewardAd
          slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID ?? 'simulate-unlock'}
          description="광고를 보고 이번 달 절약 가능 금액을 확인해요"
          buttonText="절약액 보기"
          onRewarded={runSimulation}
        >
          <LoadingState rows={4} />
        </TossRewardAd>
      )}

      {notice}
      <Toast
        open={!!toast}
        position="bottom"
        text={toast ?? ''}
        onClose={() => setToast(null)}
      />
    </ScreenScaffold>
  );
}
