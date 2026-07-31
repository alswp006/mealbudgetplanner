import { useMemo, useState } from 'react';
import {
  Top,
  ListRow,
  Asset,
  AlertDialog,
  Paragraph,
  Spacing,
  Button,
} from '@toss/tds-mobile';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { EmptyState, LoadingState } from '../components/StateView';
import { Amount } from '../components/Amount';
import { Card } from '../components/Card';
import { useAppData } from '@/data';
import type { MealCategory, MealRecord } from '@/data';

const CATEGORY_LABEL: Record<MealCategory, string> = {
  delivery: '배달',
  dining_out: '외식',
  home_cooked: '직접조리',
};

const SLOT_LABEL: Record<MealRecord['slot'], string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
};

const FILTERS: { key: MealCategory | 'all'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'delivery', label: '배달' },
  { key: 'dining_out', label: '외식' },
  { key: 'home_cooked', label: '직접조리' },
];

const PAGE_SIZE = 30;

/**
 * 전체 기록 목록 — 카테고리 Chip 필터 + 스크롤 리스트(30건 단위 점진 렌더).
 * 삭제는 행의 '삭제' 버튼 → AlertDialog 확인. S4 계약: data-testid="records-list".
 */
export default function Records() {
  const { meals, loading, actions } = useAppData();
  const [filter, setFilter] = useState<MealCategory | 'all'>('all');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...meals]
        .filter((m) => filter === 'all' || m.category === filter)
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt))),
    [meals, filter]
  );

  const shown = sorted.slice(0, visible);

  const confirmDelete = () => {
    if (pendingDelete) actions.removeMeal(pendingDelete);
    setPendingDelete(null);
  };

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>기록</Top.TitleParagraph>} />}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? 'fill' : 'weak'}
            onClick={() => {
              setFilter(f.key);
              setVisible(PAGE_SIZE);
            }}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <Spacing size={16} />

      {loading ? (
        <LoadingState rows={4} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<Asset.ContentIcon name="iconStarRegular" alt="기록 없음" style={{ width: 48, height: 48 }} />}
          title={filter === 'all' ? '아직 기록이 없어요' : '이 카테고리 기록이 없어요'}
          description="식사를 기록하면 여기에 모여요"
        />
      ) : (
        <Card testId="records-list">
          {shown.map((m) => (
            <ListRow
              key={m.id}
              border="none"
              contents={
                <ListRow.Texts
                  type="2RowTypeA"
                  top={`${m.date} · ${SLOT_LABEL[m.slot]}`}
                  bottom={m.memo ? `${CATEGORY_LABEL[m.category]} · ${m.memo}` : CATEGORY_LABEL[m.category]}
                />
              }
              right={
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Amount value={m.amount} unit="원" typography="t5" />
                  <Button variant="weak" onClick={() => setPendingDelete(m.id)}>
                    삭제
                  </Button>
                </div>
              }
            />
          ))}
        </Card>
      )}

      {shown.length < sorted.length && (
        <>
          <Spacing size={16} />
          <Button variant="weak" display="block" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
            더 보기
          </Button>
        </>
      )}

      {!loading && sorted.length > 0 && (
        <>
          <Spacing size={12} />
          <Paragraph.Text typography="st13">총 {sorted.length}건</Paragraph.Text>
        </>
      )}

      <Spacing size={80} />

      <AlertDialog
        open={pendingDelete !== null}
        title="기록을 삭제할까요?"
        description="삭제하면 되돌릴 수 없어요"
        alertButton={<AlertDialog.AlertButton onClick={confirmDelete}>삭제</AlertDialog.AlertButton>}
        onClose={() => setPendingDelete(null)}
      />
    </ScreenScaffold>
  );
}
