# Sprint Contract: 라우팅 & FloatingTabBar 배선 + Provider

## 만들 항목
- **src/App.tsx** — `AppDataProvider` 감싸기, 6개 라우트(`/`, `/budget`, `/record`, `/records`, `/analysis`, `/simulate`) 정의, `FloatingTabBar` 4탭(홈/기록/분석/시뮬) 연결
- **src/pages/** — 각 라우트별 페이지 컴포넌트 마운트 확인

## 사용할 TypeScript 타입
- `RouteState` (src/lib/types.ts — 각 라우트의 state 타입 정의)
- 라우트별 페이지 props 타입 필요 시 types.ts에 추가

## 검증 방법
1. `pnpm dev` → 각 라우트(/,/budget,/record,/records,/analysis,/simulate) SPA 전환 확인
2. FloatingTabBar 4탭 클릭 → 해당 페이지 이동 검증
3. "식사 기록" 버튼 → `/record` 이동 동작 확인
4. 새로고침 시 라우트 유지 (query/state 구간별 전달)
5. `pnpm typecheck` — TS 에러 0

## 절대 하면 안 되는 것
- main.tsx 수정 금지 (@AI:ANCHOR 보호)
- 외부 URL 이동(window.location.href) 금지 — 모두 SPA 내 라우팅
- AppDataProvider 제거/교체 금지 — 이후 전역 상태 공급처

## AC 커버리스트
- F7-AC-2: 라우트 정상 마운트
- F7-AC-6: 내부 네비게이션 배선
