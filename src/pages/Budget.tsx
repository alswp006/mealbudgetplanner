import { useState } from 'react';
import { Top, TextField, Toast, Paragraph, Spacing } from '@toss/tds-mobile';
import { useNavigate, useLocation } from 'react-router-dom';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SubmitFooter } from '../components/BottomCTA';
import { Amount } from '../components/Amount';
import { useAppData } from '@/lib/store';

const MAX_BUDGET = 10_000_000;

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 월 예산 설정 — 숫자 1개 입력 + 하단 고정 저장(SubmitFooter). 저장 즉시 홈으로.
 * S2 계약: 입력 1개, 에러는 TextField 하단 헬퍼로, 성공 시 navigate('/', {replace:true}).
 */
export default function Budget() {
  const navigate = useNavigate();
  const location = useLocation();
  const { budget, actions } = useAppData();
  const editMode = (location.state as { editMode?: boolean } | null)?.editMode ?? false;

  const [value, setValue] = useState(
    editMode && budget ? String(budget.totalBudget) : ''
  );
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  const parsed = Number(value.replace(/[^0-9]/g, ''));

  const handleSave = () => {
    if (!parsed || parsed < 1) {
      setError('예산을 1원 이상 입력해 주세요');
      return;
    }
    if (parsed > MAX_BUDGET) {
      setError('최대 10,000,000원까지 설정할 수 있어요');
      return;
    }
    setError(null);
    actions.saveBudget({ month: currentMonth(), totalBudget: parsed });
    setToast(true);
    navigate('/', { replace: true });
  };

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>예산 설정</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="예산 저장" onClick={handleSave} />}
    >
      <Paragraph.Text typography="st11">이번 달 식비 예산</Paragraph.Text>
      <Spacing size={12} />
      <TextField
        variant="box"
        label="예산 금액"
        placeholder="예: 500,000"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (error) setError(null);
        }}
        suffix="원"
        hasError={!!error}
        help={error ?? '한 달 동안 쓸 식비 총액을 정해요'}
      />
      {parsed > 0 && parsed <= MAX_BUDGET && (
        <>
          <Spacing size={16} />
          <Amount value={parsed} unit="원" typography="t3" testId="budget-preview" />
        </>
      )}
      <Toast
        open={toast}
        position="bottom"
        text="예산을 저장했어요"
        onClose={() => setToast(false)}
      />
    </ScreenScaffold>
  );
}
