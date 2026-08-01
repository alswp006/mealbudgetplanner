import { test, expect } from '@playwright/test';

// nightcrew Sentinel smoke 팩 — Factory 산출(§7.1)
// 핵심 막: 월 식비 예산 설정 + 오늘 남은 끼니별 허용 금액 자동 계산 (예: '오늘 저녁까지 8,400원'), 식사 기록 입력 (금액+카테고리: 배달/직접조리/외식) — 3탭 이내, 일일 체크인: 오늘 식사 기록하면 배너 광고 후 '이번 달 페이스' 배지 지급, 주간 소비 패턴 분석 (배달 vs 외식 vs 직접조리 비율 도넛차트), 리워드 광고 시청 후 '월간 식비 절약 가능 금액 시뮬레이션' 결과 공개
// 토스 브릿지 의존 구간(로그인·결제)은 외부 재현 불가 — 화면 도달 확인까지만.
const ROUTES = ["/","/BudgetPage","/Home","/RecordPage","/SimulationPage"];
// WebView 밖 실행에서만 나는 콘솔 에러는 무시(앱인토스 관례 — toss visual-smoke 템플릿 계승)
const IGNORED_CONSOLE = [/SafeAreaInsets/i, /granite/i, /apps-in-toss/i];

for (const route of ROUTES) {
  test(`smoke: ${route} 렌더링과 콘솔 에러 없음`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !IGNORED_CONSOLE.some((re) => re.test(msg.text()))) errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(String(err)));
    await page.goto(route);
    await expect(page.locator('body')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
