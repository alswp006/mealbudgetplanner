# Packet 0006 Sprint Contract — 라우팅 배선 + FloatingTabBar

## 만들 항목
- **src/App.tsx** (신규) — react-router-dom `<BrowserRouter>`, `<Routes>` 5개 경로 연결 (/, /budget, /record, /stats, /simulation)
- **라우팅 배선**: HomePage, BudgetPage, RecordPage, StatsPage, SimulationPage import & Route 정의
- **FloatingTabBar**: 3탭(홈/기록/분석) 배선, 클릭 시 올바른 경로 네비게이션
- **전역 Provider**: AppStore/AppStateContext + TDS SDK Provider 스택 적용
- **location.state 타입**: RouteState 타입(types.ts 추가 또는 기존 활용) 사용하여 페이지 간 상태 전달

## TypeScript 타입 (src/lib/types.ts)
- `RouteState` (신규): 페이지 간 location.state 타입 (예: `{ prevMonth?: string, selectedDate?: string }`)
- 기타 기존 타입 재사용: `MonthlyBudget`, `MealRecord`, `DailyCheckIn`, `AppFlags`

## 검증 방법
1. **pnpm typecheck** — TS 에러 0건
2. **각 탭 클릭 시 네비게이션 확인** — 홈 탭 → /, 기록 탭 → /record, 분석 탭 → /stats
3. **초기 경로 확인** — 앱 로드 시 / (홈)부터 시작
4. **main.tsx 무수정 확인** — git diff에서 main.tsx 변경 없음

## 절대 금지
- ❌ main.tsx 수정 (@AI:ANCHOR 위반)
- ❌ 새로운 entry point 생성 (main.tsx가 유일한 진입점)
- ❌ CSS 링크/style 임포트를 App.tsx에서 처리 (main.tsx 의존)
