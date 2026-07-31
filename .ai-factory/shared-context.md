# Shared Context (auto-generated — do NOT modify)


## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
// YYYY-MM format (e.g., "2026-08")
type MonthString = string;

// YYYY-MM-DD format (e.g., "2026-08-01")
type DateString = string;

// ISO datetime format (e.g., "2026-08-01T12:30:00Z")
type DateTimeString = string;

// Amount in integer KRW (e.g., 3000000 = ₩3,000,000)
type AmountKRW = number;

export interface Budget {
  month: MonthString;
  totalBudget: AmountKRW;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

export type MealSlot = "breakfast" | "lunch" | "dinner";

export type MealCategory = "delivery" | "dining_out" | "home_cooked";

export interface MealRecord {
  id: string;
  date: DateString;
  slot: MealSlot;
  category: MealCategory;
  amount: AmountKRW;
  memo: string;
  createdAt: DateTimeString;
}

export interface CheckinLog {
  date: DateString;
  paceBadge: "ahead" | "ontrack" | "over";
  grantedAt: DateTimeString;
}

export interface AppFlags {
  aiNoticeAcknowledged: boolean;
  overBudgetAlertedMonth?: MonthString;
}

export type SaveResult = { ok: true } | { ok: false; reason: "quota" | "parse" };

export interface RouteState {
  "/": undefined;
  "/budget": { editMode?: boolean } | undefined;
  "/record": { date?: string } | undefined;
  "/records": undefined;
  "/analysis": undefined;
  "/simulate": undefined;
}

export interface SimulateRequest {
  month: MonthString;
  totalBudget: AmountKRW;
  spentByCategory: {
    delivery: AmountKRW;
    dining_out: AmountKRW;
    home_cooked: AmountKRW;
  };
  recordCount: number;
}

export interface SimulateResponse {
  monthlySaving: AmountKRW;
  targetDeliveryRatio: number;
  aiComment: string;
  generatedByAI: true;
}

export interface ApiError {
  error: string;
}

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
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
    storage.ts
    store.tsx
    types.ts
    utils.ts
  main.tsx
  pages/
    Home.tsx
    __TdsGallery.tsx
  store/
    index.ts
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- calc.ts: export function getMonthSpent(records: MealRecord[], month: string): number; export function getSpentByCategory( records: MealRecord[], month: string ):; export function getRemainingMeals( today: string, dayN: number, totalDaysInMonth: number ):; export function getAllowancePerMeal( remainingBudget: number, remainingMeals: number ): number | null; export function calcPaceBadge( budget: number, spent: number, dayN: number, totalDays: number ): "ahead" | "ontrack" | "; export function getRecent7DaysStats( records: MealRecord[], today: string ):; export function isOverBudget( budget: number, spent: number ):; export function pruneOldData( records: MealRecord[], today: string ): MealRecord[]
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void; export function getBudget(month: string): Budget | null; export function setBudget(month: string, totalBudget: number): Budget; export interface AddMealInput; export function addMeal(input: AddMealInput):; export function deleteMeal(id: string): void
- types.ts: export interface Budget; export type MealSlot = "breakfast" | "lunch" | "dinner"; export type MealCategory = "delivery" | "dining_out" | "home_cooked"; export interface MealRecord; export interface CheckinLog; export interface AppFlags; export type SaveResult =; export interface RouteState
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
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
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 엔티티 타입 & RouteState 정의 (files: src/lib/types.ts)
- 0002: localStorage CRUD 헬퍼 (files: src/lib/storage.ts)
- 0003: 파생계산 유틸 & 데이터 정리 (files: src/lib/calc.ts)
- 0004: 앱 상태 스토어 & 초기화 (files: src/lib/store.tsx)
- heal-1-01: 데이터 레이어 공개 API 계약 정합화 및 배럴 export 고정 (files: src/store/index.ts, src/lib/storage.ts, src/lib/derive.ts, src/types/index.ts)
- 0013: 라우팅 & FloatingTabBar 배선 + Provider (files: src/App.tsx)
- 0015: 라우팅 와이어링 + Provider 연결 + 통합 폴리시 (files: src/App.tsx)