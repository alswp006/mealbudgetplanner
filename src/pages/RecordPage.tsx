import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Top, Chip, TextField, Paragraph, Spacing, AlertDialog, Toast } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SubmitFooter } from '@/components/BottomCTA';
import { useAppData } from '@/lib/store';
import type { MealType, MealCategory, RouteState } from '@/lib/types';

const MAX_AMOUNT = 999_999;
const MEMO_MAX_LENGTH = 40;

const MEAL_TYPE_OPTIONS: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: '아침' },
  { value: 'lunch', label: '점심' },
  { value: 'dinner', label: '저녁' },
  { value: 'snack', label: '간식' },
];

const CATEGORY_OPTIONS: { value: MealCategory; label: string }[] = [
  { value: 'delivery', label: '배달' },
  { value: 'homemade', label: '직접조리' },
  { value: 'dining_out', label: '외식' },
];

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

function digitsOnly(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

function formatThousands(digits: string): string {
  if (digits === '') return '';
  return Number(digits).toLocaleString('ko-KR');
}

export default function RecordPage() {
  const navigate = useNavigate();
  const state = (useLocation().state as RouteState['/record']) ?? null;
  const today = todayString();
  const { recordMeal } = useAppData(today);

  const [mealType, setMealType] = useState<MealType>(state?.defaultMealType ?? 'breakfast');
  const [category, setCategory] = useState<MealCategory>('delivery');
  const [amountText, setAmountText] = useState('');
  const [memo, setMemo] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAmountError(null);
    setAmountText(formatThousands(digitsOnly(event.target.value)));
  };

  const handleMemoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMemo(event.target.value.slice(0, MEMO_MAX_LENGTH));
  };

  const handleSave = () => {
    const amount = Number(digitsOnly(amountText) || '0');

    if (!amount) {
      setAmountError('금액을 입력해주세요');
      return;
    }
    if (amount > MAX_AMOUNT) {
      setAmountError('한 끼 최대 999,999원까지 입력할 수 있어요');
      return;
    }
    setAmountError(null);

    const result = recordMeal({ date: today, mealType, category, amount, memo });

    if (result.ok) {
      fireHaptic('success');
      setShowToast(true);
      navigate('/', { state: { recorded: true } });
      return;
    }

    if (result.reason === 'QUOTA') {
      setQuotaError(true);
    }
  };

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>식사 기록</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="기록 저장" onClick={handleSave} />}
    >
      <Paragraph.Text typography="t4">끼니</Paragraph.Text>
      <Spacing size={8} />
      <div style={{ display: 'flex', gap: 8 }}>
        {MEAL_TYPE_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            variant={mealType === option.value ? 'fill' : 'weak'}
            aria-pressed={mealType === option.value}
            onClick={() => {
              fireHaptic('tickWeak');
              setMealType(option.value);
            }}
          >
            {option.label}
          </Chip>
        ))}
      </div>
      <Spacing size={16} />

      <Paragraph.Text typography="t4">카테고리</Paragraph.Text>
      <Spacing size={8} />
      <div style={{ display: 'flex', gap: 8, minHeight: 44 }}>
        {CATEGORY_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            variant={category === option.value ? 'fill' : 'weak'}
            aria-pressed={category === option.value}
            onClick={() => {
              fireHaptic('tickWeak');
              setCategory(option.value);
            }}
          >
            {option.label}
          </Chip>
        ))}
      </div>
      <Spacing size={16} />

      <TextField
        variant="box"
        label="금액"
        placeholder="0"
        value={amountText}
        onChange={handleAmountChange}
        inputMode="numeric"
        hasError={!!amountError}
        help={amountError ?? undefined}
      />
      <Spacing size={12} />
      <TextField
        variant="box"
        label="메모"
        placeholder="예: 김밥"
        value={memo}
        onChange={handleMemoChange}
        maxLength={MEMO_MAX_LENGTH}
      />
      <Spacing size={80} />

      <AlertDialog
        open={quotaError}
        title="저장 공간이 부족해요"
        description="오래된 기록을 지우고 다시 시도해주세요."
        alertButton={
          <AlertDialog.AlertButton onClick={() => setQuotaError(false)}>
            확인
          </AlertDialog.AlertButton>
        }
        onClose={() => setQuotaError(false)}
      />

      <Toast
        open={showToast}
        text="기록했어요"
        position="bottom"
        onClose={() => setShowToast(false)}
      />
    </ScreenScaffold>
  );
}
