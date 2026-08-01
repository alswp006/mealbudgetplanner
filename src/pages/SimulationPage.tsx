import { useState } from 'react';
import { Top, Toast, Paragraph, Button, Spacing } from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { CountUp } from '@/components/CountUp';
import { EmptyState } from '@/components/StateView';
import { TossRewardAd } from '@/components/TossRewardAd';
import { AdSlot } from '@/components/AdSlot';
import { useAppData } from '@/lib/store';
import { getSaving } from '@/lib/calc';

const AD_SLOT_ID = (import.meta.env.VITE_TOSS_AD_SLOT_ID as string | undefined) ?? 'simulation-unlock';
const AD_GROUP_ID = (import.meta.env.VITE_TOSS_AD_GROUP_ID as string | undefined) ?? 'simulation-result';

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function SavingResultCard({ amount }: { amount: number }) {
  return (
    <Card testId="saving-result">
      <Paragraph.Text typography="st11">배달을 30% 줄이면</Paragraph.Text>
      <CountUp value={amount} unit="원" typography="t1" testId="saving-amount" />
      <Paragraph.Text typography="t6">절약할 수 있어요</Paragraph.Text>
    </Card>
  );
}

export default function SimulationPage() {
  const today = todayDate();
  const appData = useAppData(today);
  const [adErrorOpen, setAdErrorOpen] = useState(false);

  const hasDelivery = appData.meals.some((meal) => meal.category === 'delivery');
  const { savingAmount } = getSaving({ meals: appData.meals, today });
  const alreadySeenToday = appData.flags.lastSimulationDate === today;

  const handleRewarded = () => {
    setAdErrorOpen(false);
    appData.markSimulationSeen(today);
  };

  const handleWatchError = () => {
    setAdErrorOpen(true);
  };

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>절약 시뮬레이션</Top.TitleParagraph>} />}>
      {!hasDelivery ? (
        <EmptyState
          testId="simulation-empty"
          title="배달 기록이 아직 없어요"
          description="배달 기록을 남기면 30% 절약 가능액을 계산해 드려요"
          action={
            <Button variant="weak" display="block" disabled>
              시뮬레이션 하기
            </Button>
          }
        />
      ) : alreadySeenToday ? (
        <>
          <SavingResultCard amount={savingAmount} />
          <Spacing size={16} />
          <AdSlot adGroupId={AD_GROUP_ID} />
        </>
      ) : (
        <TossRewardAd
          slotId={AD_SLOT_ID}
          description="광고를 시청하면 절약 가능액을 확인할 수 있어요"
          buttonText="광고 보고 확인하기"
          onRewarded={handleRewarded}
          onWatchError={handleWatchError}
        >
          <SavingResultCard amount={savingAmount} />
          <Spacing size={16} />
          <AdSlot adGroupId={AD_GROUP_ID} />
        </TossRewardAd>
      )}
      <Toast
        open={adErrorOpen}
        text="광고를 불러오지 못했어요"
        position="bottom"
        onClose={() => setAdErrorOpen(false)}
      />
    </ScreenScaffold>
  );
}
