import { useState } from 'react';
import { Top, TextField, Button, Toast, Paragraph, Spacing } from '@toss/tds-mobile';
import { useNavigate, useLocation } from 'react-router-dom';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SubmitFooter } from '../components/BottomCTA';
import { useAppData } from '@/data';
import type { MealSlot, MealCategory } from '@/data';

const SLOTS: { key: MealSlot; label: string }[] = [
  { key: 'breakfast', label: '아침' },
  { key: 'lunch', label: '점심' },
  { key: 'dinner', label: '저녁' },
];

const CATEGORIES: { key: MealCategory; label: string }[] = [
  { key: 'delivery', label: '배달' },
  { key: 'dining_out', label: '외식' },
  { key: 'home_cooked', label: '직접조리' },
];

const MEMO_MAX = 50;

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 식사 기록 입력 — 끼니/카테고리 Chip + 금액/메모 → 하단 고정 저장. 저장 즉시 홈으로.
 * S3 계약: Chip 그룹 → TextField → SubmitFooter, 검증 실패는 인라인 에러.
 */
export default function Record() {
  const navigate = useNavigate();
  const location = useLocation();
  const { actions } = useAppData();
  const date = (location.state as { date?: string } | null)?.date ?? today();

  const [slot, setSlot] = useState<MealSlot>('lunch');
  const [category, setCategory] = useState<MealCategory | null>(null);
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  const parsed = Number(amount.replace(/[^0-9]/g, ''));

  const handleSave = () => {
    if (!parsed || parsed < 1) {
      setError('금액을 입력해 주세요');
      return;
    }
    if (!category) {
      setError('카테고리를 선택해 주세요');
      return;
    }
    setError(null);
    actions.recordMeal({ date, slot, category, amount: parsed, memo });
    setToast(true);
    navigate('/', { replace: true });
  };

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>식사 기록</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="기록 저장" onClick={handleSave} />}
    >
      <Paragraph.Text typography="st11">끼니</Paragraph.Text>
      <Spacing size={8} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {SLOTS.map((s) => (
          <Button
            key={s.key}
            variant={slot === s.key ? 'fill' : 'weak'}
            onClick={() => setSlot(s.key)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      <Spacing size={20} />
      <Paragraph.Text typography="st11">카테고리</Paragraph.Text>
      <Spacing size={8} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {CATEGORIES.map((c) => (
          <Button
            key={c.key}
            variant={category === c.key ? 'fill' : 'weak'}
            onClick={() => {
              setCategory(c.key);
              if (error) setError(null);
            }}
          >
            {c.label}
          </Button>
        ))}
      </div>

      <Spacing size={20} />
      <TextField
        variant="box"
        label="금액"
        placeholder="예: 12,000"
        inputMode="numeric"
        value={amount}
        onChange={(e) => {
          setAmount(e.target.value);
          if (error) setError(null);
        }}
        suffix="원"
        hasError={!!error}
        help={error ?? '먹은 끼니의 금액을 적어요'}
      />

      <Spacing size={16} />
      <TextField
        variant="box"
        label="메모"
        placeholder="예: 점심 배달"
        value={memo}
        onChange={(e) => setMemo(e.target.value.slice(0, MEMO_MAX))}
        help={`최대 ${MEMO_MAX}자 (${memo.length}/${MEMO_MAX})`}
      />

      <Toast
        open={toast}
        position="bottom"
        text="기록했어요"
        onClose={() => setToast(false)}
      />
    </ScreenScaffold>
  );
}
