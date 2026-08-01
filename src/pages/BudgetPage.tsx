import { useEffect, useState } from 'react';
import { Top, TextField, Paragraph, Spacing, IconButton, Toast } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SubmitFooter } from '@/components/BottomCTA';
import { useAppData } from '@/lib/store';

const MAX_BUDGET = 9_999_999;

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

function formatThousands(digits: string): string {
  if (digits === '') return '';
  return Number(digits).toLocaleString('ko-KR');
}

function digitsOnly(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

export default function BudgetPage() {
  const navigate = useNavigate();
  const today = todayString();
  const month = today.slice(0, 7);
  const { budget, saveBudget } = useAppData(today);

  const [amountText, setAmountText] = useState(() =>
    budget ? formatThousands(String(budget.amount)) : ''
  );
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!touched && budget) {
      setAmountText(formatThousands(String(budget.amount)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budget]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTouched(true);
    setError(null);
    setAmountText(formatThousands(digitsOnly(event.target.value)));
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleSave = () => {
    const amount = Number(digitsOnly(amountText) || '0');

    if (!amount) {
      setError('예산 금액을 입력해주세요');
      return;
    }
    if (amount > MAX_BUDGET) {
      setError('최대 9,999,999원까지 입력할 수 있어요');
      return;
    }

    setError(null);
    fireHaptic('success');

    const now = Date.now();
    const result = saveBudget({
      month,
      amount,
      createdAt: budget?.createdAt ?? now,
      updatedAt: now,
    });

    if (result.ok) {
      setShowToast(true);
      navigate('/');
    }
  };

  return (
    <ScreenScaffold
      top={
        <Top title={<Top.TitleParagraph>이번 달 식비 예산</Top.TitleParagraph>}>
          <IconButton aria-label="뒤로가기" name="iconArrowLeftRegular" onClick={handleBack} />
        </Top>
      }
      bottom={<SubmitFooter label="저장하기" onClick={handleSave} />}
    >
      <Paragraph.Text typography="st11" color="secondary">
        한 달 동안 쓸 식비 총액을 정해주세요
      </Paragraph.Text>
      <Spacing size={16} />
      <TextField
        variant="box"
        label="예산 금액"
        placeholder="0"
        value={amountText}
        onChange={handleChange}
        inputMode="numeric"
        hasError={!!error}
        help={error ?? undefined}
      />
      <Spacing size={80} />

      <Toast
        open={showToast}
        text="예산이 저장되었어요"
        position="bottom"
        onClose={() => setShowToast(false)}
      />
    </ScreenScaffold>
  );
}
