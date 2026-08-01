# Shared Context (auto-generated — do NOT modify)


## 패킷 간 계약 (src/lib/contract.ts — 자동 생성, 수정 금지)
여기 선언된 이름·인자·반환 타입은 확정이다. 기반 패킷은 이대로 구현하고,
화면 패킷은 이대로 호출하라. 다르게 만들지 마라.

```typescript
/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

/** 거래 기록 엔티티, 모든 페이지에서 참조 (구현: 패킷 0001) */
export type Transaction = { id: string; date: string; amountKrw: number };

/** 예산 설정, 모든 페이지에서 참조 (구현: 패킷 0001) */
export type Budget = { monthlyLimitKrw: number };

/** 라우팅 상태 타입, App.tsx + 페이지 간 전달 (구현: 패킷 0001) */
export type RouteState = 'home' | 'budget' | 'record' | 'stats' | 'simulation';

/** 금액 표시 (₩12,300 형식), 모든 페이지에서 사용 (구현: 패킷 0003) */
export type formatAmountFn = (amount: number) => string;

/** 날짜 포맷 (8월 2일), 거래 목록 표시 (구현: 패킷 0003) */
export type formatDateFn = (date: string) => string;

/** 남은 예산 계산, HomePage + 통계 페이지 (구현: 패킷 0003) */
export type calculateRemainingFn = (spent: number, limit: number) => number;

/** 초과 여부 체크, OverBudgetAlert 컴포넌트 (구현: 패킷 0003) */
export type isOverBudgetFn = (spent: number, limit: number) => boolean;

/** 예산 상태 훅, 0005/0006/0010에서 사용 (구현: 패킷 0004) */
export type useBudgetStoreFn = () => { budget: Budget | null; setBudget(budget: Budget): void };

/** 거래 목록 상태 훅, 0008/0009/홈대시 컴포넌트에서 사용 (구현: 패킷 0004) */
export type useTransactionStoreFn = () => { transactions: Transaction[]; addTransaction(transaction: Transaction): void; removeTransaction(id: string): void };

```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
// Meal classification types
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type MealCategory = 'delivery' | 'homemade' | 'dining_out';
export type PaceBadge = 'ahead' | 'ontrack' | 'over';

// Database schemas (localStorage records)
export interface MonthlyBudget {
  month: string; // "YYYY-MM"
  amount: number; // 원, 정수, 1 ~ 9,999,999
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
}

export interface MealRecord {
  id: string; // crypto.randomUUID()
  date: string; // "YYYY-MM-DD"
  mealType: MealType;
  category: MealCategory;
  amount: number; // 원, 정수, 1 ~ 999,999
  memo: string; // 최대 40자, 없으면 ""
  createdAt: number; // epoch ms
}

export interface DailyCheckIn {
  date: string; // "YYYY-MM-DD" (하루 1건, unique)
  badge: PaceBadge;
  spentSoFar: number; // 체크인 시점 이번 달 누적 지출(원)
  createdAt: number; // epoch ms
}

export interface AppFlags {
  onboardingSeen: boolean; // 최초 예산 미설정 안내 확인 여부
  lastSimulationDate: string; // "YYYY-MM-DD" | ""
}

// Calculation result types
export interface RemainingResult {
  dailyAllowance: number; // 오늘 하루 남은 끼니별 허용 금액
  todayRemaining: number; // 오늘 실제 남은 금액 (0 이상)
  isOver: boolean; // 초과 여부
}

export interface SavingResult {
  savingAmount: number; // 절약 가능액(원)
}

export interface WeeklyStats {
  totalByCategory: Record<MealCategory, number>; // 카테고리별 총액
  categoryPercentage: Record<MealCategory, number>; // 카테고리별 비율 (0~100)
  totalAmount: number; // 주간 총액
}

// Write operation result
export type WriteResult =
  | { ok: true }
  | { ok: false; reason: 'QUOTA' | 'INVALID_AMOUNT' };

// Navigation state contracts per route
export type RouteState = {
  '/': undefined;
  '/budget': undefined;
  '/record': { defaultMealType?: MealType } | undefined;
  '/stats': undefined;
  '/simulation': undefined;
};

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    AllowanceHero.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CheckInSection.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    OverBudgetAlert.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  hooks/
  lib/
    calc.ts
    contract.ts
    format.ts
    storage.ts
    store.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Home.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- calc.ts: export function getRemainingPerMeal(params:; export function getPaceBadge(params:; export function getSaving(params:; export function getWeeklyStats(params:; export function getOverBudgetStatus(params:
- contract.ts: export type Transaction =; export type Budget =; export type RouteState = 'home' | 'budget' | 'record' | 'stats' | 'simulation'; export type formatAmountFn = (amount: number) => string; export type formatDateFn = (date: string) => string; export type calculateRemainingFn = (spent: number, limit: number) => number; export type isOverBudgetFn = (spent: number, limit: number) => boolean; export type useBudgetStoreFn = () =>
- format.ts: export function formatKRW(amount: number): string
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void; export function safeParse<T>(key: string, fallback: T): T; export function getMeals(): MealRecord[]; export function addMeal(input: Omit<MealRecord, 'id' | 'createdAt'>): WriteResult; export function getBudget(month: string): MonthlyBudget | null; export function setBudget(month: string, budget: MonthlyBudget): WriteResult
- store.ts: export interface AppData; export function useAppData(today: string); export interface DerivedValues; export function useDerived(today: string): DerivedValues &
- types.ts: export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'; export type MealCategory = 'delivery' | 'homemade' | 'dining_out'; export type PaceBadge = 'ahead' | 'ontrack' | 'over'; export interface MonthlyBudget; export interface MealRecord; export interface DailyCheckIn; export interface AppFlags; export interface RemainingResult
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- AllowanceHero.tsx: AllowanceHero
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CheckInSection.tsx: CheckInSection
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- OverBudgetAlert.tsx: OverBudgetAlert
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd

### Module Dependencies (import graph)
  lib/calc.ts → imports: lib/types
  lib/storage.ts → imports: lib/types
  lib/store.ts → imports: lib/types, lib/storage, lib/calc
  pages/Home.tsx → imports: components/ScreenScaffold, components/Card, components/Amount, components/MiniBar, components/StateView, components/AllowanceHero, components/FloatingTabBar, lib/store
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 엔티티 타입 + RouteState 정의 (files: src/lib/types.ts)
- 0002: localStorage 저장소 헬퍼 (CRUD + 방어) (files: src/lib/storage.ts)
- 0003: 계산 엔진 + 금액 포맷 순수함수 (files: src/lib/calc.ts, src/lib/format.ts)
- 0004: 상태 관리 훅/스토어 (files: src/lib/store.ts)
- 0006: 홈 대시보드 / (허용금액+지표+빈/로딩) (files: src/pages/HomePage.tsx, src/components/AllowanceHero.tsx)
- 0007: 홈 초과 경고 배너(F8) + 체크인 섹션(F5) + 배너광고 (files: src/components/OverBudgetAlert.tsx, src/components/CheckInSection.tsx)
- 0005: 예산 설정 페이지 /budget (files: src/pages/BudgetPage.tsx)