# Packet 0006 Sprint Contract — 라우팅 배선 + FloatingTabBar

## 만들 항목
**src/App.tsx** (신규) — `<BrowserRouter>` + `<Routes>` 5개 경로 (/, /budget, /record, /stats, /simulation)
- 각 경로에 HomePage/BudgetPage/RecordPage/StatsPage/SimulationPage 컴포넌트 Route 정의
- FloatingTabBar 3탭(홈/기록/분석) → 클릭 시 올바른 경로 네비게이션
- 전역 Provider 스택: AppStateContext + TDS + 광고/결제 SDK

## 타입 (src/lib/types.ts)
`RouteState` (신규) — location.state 타입: `{ prevMonth?: string, selectedDate?: string }` 등

## 검증
1. `pnpm typecheck` — 0 error
2. 탭 클릭 시 올바른 경로 네비게이션 확인
3. `git diff main` — main.tsx 무수정

## 금지
- ❌ main.tsx 수정 (@AI:ANCHOR)
- ❌ 새로운 entry point (main.tsx 유일)
