Cross-validation을 반영해 TASK를 갱신했습니다. 핵심은 **GAP 1(예산 초과 푸시)** 을 토스 미니앱 MVP 정책(푸시 미지원)에 맞춰 **인앱 경고로 정식 descope**하고, 이를 구현 태스크로 명시한 것입니다. **GAP 2(분석↔수익 모순)** 는 태스크로 해결할 수 없는 계약 이슈라 "측정 방식 결정" 근거를 명문화했고, **GAP 3(2.3 미완)** 은 이미 완결된 현재 정의를 유지합니다.

---

# TASK — MealBudgetPlanner

> **변경 요약 (Cross-validation 반영)**
> - **[GAP 1 해결]** PRD F6 "예산 초과 경고 푸시(토스 인앱 알림)" → **토스 미니앱 MVP는 푸시 알림 미지원**이므로 **인앱 경고로 정식 descope**. 홈 상단 상시 경고 배너 + **초과 진입 시점 1회 AlertDialog**로 대체하고 **Task 3.2A** 신설. (재빌드/서버/네이티브 모듈 불필요, 정책 준수)
> - **[GAP 2 해결]** "4,000 DAU 전제 수익모델" vs "외부 분석(GA/Amplitude) 금지" 모순 → **인앱 트래킹 태스크 신설 금지**. DAU/리텐션은 **앱인토스 콘솔 제공 지표(플랫폼 대시보드)로만 측정**한다는 원칙을 Common Note에 명문화. 수익 검증은 콘솔 지표 책임이며 코드 태스크 범위 밖임을 확정.
> - **[GAP 3 해결]** Task 2.3(상태 스토어) 정의 완결 확인·유지.
> - AC 커버리지 재산정: **49 ACs** (F2 예산 초과 인앱 경고 AC-8 신설 반영).

## Common Note — 측정/알림 정책 (GAP 1·2 계약)
- **알림**: 서버·푸시·네이티브 알림 미사용. 예산 초과 통지는 **인앱(홈 배너 + 1회 AlertDialog)** 으로만 처리.
- **측정**: 인앱 분석 SDK/서버 로깅 미도입(정책 금지). DAU·리텐션·수익 검증은 **앱인토스 콘솔 지표**에 위임. 코드 태스크는 이벤트 트래킹을 추가하지 않는다.

---

## Epic 1. TypeScript Types + Interfaces
Risk — Complexity: Low / 위험요인: RouteState 미정의 시 페이지 간 `location.state` 타입 불일치로 런타임 데이터 깨짐 / 완화: 모든 엔티티 타입과 RouteState를 최초 Task에서 확정해 이후 모든 storage·page 패킷이 동일 계약을 import.

### Task 1.1 엔티티 타입 & RouteState 정의
- Description: SPEC Data Models의 모든 타입(`Budget`, `MealRecord`, `MealSlot`, `MealCategory`, `CheckinLog`, `AppFlags`)과 API 계약(`SimulateRequest`, `SimulateResponse`, `ApiError`), storage 반환 결과(`SaveResult = { ok: true } | { ok: false; reason: 'quota' | 'parse' }`), 그리고 `RouteState`를 순수 타입으로 정의. 런타임 코드 없음.
- DoD: `src/lib/types.ts`에 위 타입 전부 export 하고 `tsc --noEmit` 통과. `RouteState` 반드시 포함: `{ "/": undefined; "/budget": { editMode?: boolean } | undefined; "/record": { date?: string } | undefined; "/records": undefined; "/analysis": undefined; "/simulate": undefined }`. HEX·any 미사용, 금액(정수 KRW)/날짜(YYYY-MM-DD) 타입 주석 명시.
- Covers: [기반 타입 — 전 기능 공통 계약]
- Files: src/lib/types.ts
- Depends on: none

---

## Epic 2. Data Layer (storage + 파생계산 + 상태)
Risk — Complexity: Medium / 위험요인: localStorage 파싱 오류·QuotaExceededError로 앱 크래시, 0으로 나눔(남은 끼니 0)으로 NaN/Infinity 노출, 13개월 초과 데이터 누적 / 완화: CRUD(2.1) → 파생계산·prune(2.2) → 상태(2.3) 순으로 방어 로직을 순수 함수 단위로 분리해 페이지가 계산을 직접 하지 않도록 강제.

### Task 2.1 localStorage CRUD 헬퍼
- Description: `mbp.budgets/mbp.meals/mbp.checkins/mbp.flags` 키에 대한 안전한 읽기/쓰기. `safeGet<T>`(try/catch → 파싱 실패 시 기본값 반환, `console.error` 미출력), `safeSet`(QuotaExceededError catch → `{ ok:false, reason:'quota' }`). 함수: `getBudget/setBudget`, `addMeal/deleteMeal/getMealsByMonth`, `getCheckin/setCheckin`, `getFlags/setFlags`. `setBudget`은 신규 시 `createdAt`, 수정 시 `updatedAt` 갱신. `addMeal`은 `crypto.randomUUID()`로 `id` 부여.
- DoD: `addMeal(...)` 후 `getMealsByMonth("2026-08")`가 `id` 포함 1건 반환. 손상 JSON(`"{invalid json"`) 상태에서 `getMealsByMonth`가 `[]` 반환 & 콘솔 에러 0. `setBudget` 재호출 시 `updatedAt > createdAt`. `setItem`이 quota 던지면 `addMeal`이 `{ ok:false, reason:'quota' }` 반환(예외 미전파). 키 부재 시 `getBudget` → `null`.
- Covers: [F1-AC-1, F1-AC-3, F1-AC-4, F1-AC-5, F1-AC-7]
- Files: src/lib/storage.ts
- Depends on: Task 1.1

### Task 2.2 파생계산 유틸 & 데이터 정리
- Description: 순수 계산 함수 — `getMonthSpent(month)`, `getSpentByCategory(records)`(배달/외식/직접조리 합계+비율), `getRemainingMeals(today)`(오늘 남은 끼니 + 남은 일수×3), `getAllowancePerMeal(remainingBudget, remainingMeals)`(1원 내림, 끼니 0이면 `null` 반환), `calcPaceBadge(budget, spent, dayN, totalDays)`(`ahead<95% / ontrack 95~105% / over>105%`), `getRecent7DaysStats`, `isOverBudget(budget, spent)`(초과 여부 + 초과금액), `pruneOldData()`(13개월 초과 meals 제거).
- DoD: amount 12000·8000·5000 → `getMonthSpent` = `25000`. 남은예산 150000 ÷ 남은끼니 29 → `getAllowancePerMeal` = `5172`(내림). 남은끼니 0 → `null`(NaN/Infinity 없음). 예산 500000, 15/31일차, 지출 200000 → `calcPaceBadge` = `ahead`. 카테고리 60000/30000/10000 → 비율 60/30/10, 총합 100000. **지출 520000 > 예산 500000 → `isOverBudget` = `{ over:true, excess:20000 }`; 지출 400000 → `{ over:false, excess:0 }`.** 13개월 초과 레코드 존재 시 `pruneOldData` 후 제거됨.
- Covers: [F1-AC-2, F1-AC-6, F2-AC-2, F2-AC-6, F2-AC-8, F4-AC-4, F5-AC-2]
- Files: src/lib/calc.ts
- Depends on: Task 2.1

### Task 2.3 앱 상태 스토어 & 초기화
- Description: 경량 React Context(`AppDataProvider` + `useAppData` 훅). 마운트 시 localStorage 로드(loading 플래그 노출), 로드 완료 후 `pruneOldData()` 1회 실행. 예산/식사/체크인 상태와 액션(`saveBudget`, `recordMeal`, `removeMeal`, `checkin`) 노출. 저장 실패(`reason:'quota'`) 시 Toast용 에러 상태 반환. **파생 셀렉터로 현재 월 초과 여부(`isOverBudget`) 노출** — 홈이 계산을 직접 하지 않도록 함.
- DoD: `useAppData()`가 `{ budget, meals, checkins, loading, overBudget, actions }` 반환하고 `tsc` 통과. Provider 마운트 시 `pruneOldData` 정확히 1회 호출. 액션 호출 시 상태 즉시 갱신되어 재렌더. `recordMeal`로 지출이 예산을 넘기면 `overBudget.over === true`로 즉시 반영.
- Covers: [상태 인프라 — 홈/기록 즉시 반영·초과 감지의 기반]
- Files: src/lib/store.tsx
- Depends on: Task 2.2

---

## Epic 3. Core UI Pages
Risk — Complexity: High / 위험요인: TDS 외 컴포넌트·Tailwind 여백 덮어쓰기로 검수 반려, 리워드 광고 미완료 시 결과 유출, AI 고지 누락, 90건+ 리스트 프레임드랍, **초과 알림 중복 노출** / 완화: 페이지당 1패킷으로 분리해 TDS 조립만 수행, 광고 게이팅·AI 배지·무한스크롤·초과 알림 1회성 플래그를 각 DoD에 명시.

### Task 3.1 예산 설정 페이지 `/budget`
- Description: `ScreenScaffold + Top + TextField(inputMode="numeric") + SubmitFooter Button`. 입력 검증(1~10,000,000 정수), 저장 시 `saveBudget` 호출 후 `navigate('/', { replace: true })` + "예산이 저장되었어요" Toast. `location.state`를 `RouteState["/budget"]`로 캐스팅.
- DoD: `500000` 저장 → 저장+토스트+홈 이동(replace). `0` → "예산을 1원 이상 입력해주세요" 헬퍼, 미저장. `10000001` → "최대 10,000,000원까지 설정할 수 있어요" 헬퍼, 미저장. 저장 버튼 ≥48px, 키보드 상승 시 버튼 미가림.
- Covers: [F2-AC-1, F2-AC-3, F2-AC-4]
- Files: src/pages/BudgetPage.tsx
- Depends on: Task 2.3

### Task 3.2 홈 대시보드 페이지 `/`
- Description: `ScreenScaffold` + 3개 Card(예산/진행률 MiniBar/오늘 목록 ListRow). 허용 금액 "오늘 {slot}까지 5,172원" 표시, 진행률 % + 남은금액 t3, 예산 초과 시 `var(--tds-color-*)` 경고 배지 "예산 초과"+초과금액. 예산 `null`이면 빈 상태(Asset.ContentIcon + "이번 달 식비 예산을 설정해보세요" + "예산 설정" 버튼)만 렌더. 남은끼니 0이면 "이번 달 식사가 모두 끝났어요". 로딩 중 Card 스켈레톤. 하단 고정 1차 액션. 모든 이동은 앱 내 `navigate`만 사용.
- DoD: 예산·기록 존재 시 `data-testid="budget-card"`, `data-testid="today-list"` 렌더, 진행률 70%/남은 150000원(t3). 예산 초과 시 경고 배지+초과금액 표시. 예산 `null` → 빈 상태만, 진행률/목록 Card 미렌더. 남은끼니 0 → 종료 안내(NaN 미표시). 로딩 시 스켈레톤. `window.location.href/open` 미사용.
- Covers: [F7-AC-1, F7-AC-3, F7-AC-4, F7-AC-5, F7-AC-6, F7-AC-7, F2-AC-2, F2-AC-5, F2-AC-6, F2-AC-7]
- Files: src/pages/HomePage.tsx
- Depends on: Task 2.3

### Task 3.2A 예산 초과 인앱 경고 (홈 내 알림) — **[GAP 1: 푸시 → 인앱 대체]**
- Description: PRD F6(예산 초과 경고)를 **푸시 미지원 정책에 맞춰 인앱으로 구현**. 홈 상단에 **상시 경고 배너**(`var(--tds-color-*)` 경고 톤, "예산을 {excess}원 초과했어요")를 초과 상태에서 노출. 추가로 **미초과→초과로 처음 전환되는 세션 1회**만 `AlertDialog`("예산을 초과했어요" + 이번 달 초과금액 + "기록 보기"/"닫기") 표시. 1회성은 `mbp.flags.overBudgetAlertedMonth = "YYYY-MM"`로 가드(같은 달 재노출 금지, 새 달·재초과 시 초기화). 초과 해소(기록 삭제로 예산 이하 복귀) 시 배너 자동 제거. 서버·푸시·네이티브 알림 미사용.
- DoD: 지출이 예산을 처음 넘긴 렌더에서 `data-testid="overbudget-alert"` AlertDialog 1회 노출 후 `mbp.flags.overBudgetAlertedMonth` 저장, 재렌더/재진입 시 재노출 안 됨. 초과 상태 유지 시 `data-testid="overbudget-banner"` 상시 표시(초과금액 통화포맷 `20,000원`). 기록 삭제로 예산 이하 복귀 시 배너 사라짐. 다음 달 초과 시 플래그 갱신되어 AlertDialog 재노출. `TossAds`/푸시 API 미호출, 콘솔 에러 0.
- Covers: [F2-AC-8 (예산 초과 인앱 경고 = PRD F6 대체)]
- Files: src/components/OverBudgetAlert.tsx
- Depends on: Task 3.2

### Task 3.3 일일 체크인 & 페이스 배지 (홈 내 섹션)
- Description: 홈의 체크인 블록. 오늘 기록 0건이면 탭 시 "먼저 오늘 식사를 기록해주세요" Toast. 기록 ≥1 & 미체크인이면 버튼 활성 → 탭 시 배너 광고 노출(`AdSlot`) 후 `calcPaceBadge` 산정, `setCheckin` 저장, 배지 애니메이션. 광고 로드 실패해도 배지 정상 지급+"광고를 불러오지 못했어요" Toast. 처리 중 로딩 스피너+버튼 비활성(중복 방지). 이미 체크인 시 "오늘 체크인 완료" 비활성.
- DoD: 기록≥1·미체크인 → 광고 후 `mbp.checkins["오늘"]` 저장+배지 표시. 이미 체크인 → 버튼 비활성 "오늘 체크인 완료", 재지급 없음. 기록 0건 탭 → 에러 토스트, 미체크인. 광고 실패 → 배지 지급+토스트. 처리 중 스피너+비활성.
- Covers: [F4-AC-1, F4-AC-2, F4-AC-3, F4-AC-5, F4-AC-6]
- Files: src/components/CheckinCard.tsx
- Depends on: Task 3.2

### Task 3.4 식사 기록 입력 페이지 `/record`
- Description: `ScreenScaffold + Top + Chip(끼니·카테고리) + TextField(금액 numeric / 메모 50자 카운터) + SubmitFooter`. 제출 시 검증 후 `recordMeal` → "기록했어요" Toast + `navigate('/', { replace: true })`. `location.state`를 `RouteState["/record"]`로 캐스팅, 기본 date=오늘.
- DoD: 유효 입력 제출 → 저장+토스트+홈 최상단 반영. amount 0 → "금액을 입력해주세요", 미저장. 카테고리 미선택 → "카테고리를 선택해주세요", 미저장. 메모 51자 → 50자 컷+"최대 50자" 헬퍼. Chip ≥44px, 저장 ≥48px.
- Covers: [F3-AC-1, F3-AC-2, F3-AC-3, F3-AC-4]
- Files: src/pages/RecordPage.tsx
- Depends on: Task 2.3

### Task 3.5 전체 기록 목록 페이지 `/records`
- Description: `ScreenScaffold` + 카테고리 Chip 필터 + ListRow(날짜·카테고리·금액). 삭제: 스와이프/삭제 → AlertDialog "삭제할까요?" 확인 시 `removeMeal`. 0건이면 Asset.ContentIcon+"오늘 첫 식사를 기록해보세요". 90건+ 대응 30건 단위 무한 스크롤.
- DoD: 삭제 확인 → `mbp.meals`에서 제거+목록 사라짐. 0건 → 빈 상태 표시. 90건+ → 세로 스크롤+30건 점진 렌더, `data-testid="records-list"`. ListRow ≥44px.
- Covers: [F3-AC-5, F3-AC-6, F3-AC-7]
- Files: src/pages/RecordsPage.tsx
- Depends on: Task 2.3

### Task 3.6 주간 분석 페이지 `/analysis`
- Description: `ScreenScaffold` + "주간 분석 보기" 버튼. 최근 7일 0건이면 광고 없이 빈 상태(Asset.ContentIcon+"분석할 식사 기록이 아직 없어요"). 데이터 있으면 `TossRewardAd`로 결과 감쌈 — 완주 시 `getRecent7DaysStats` 도넛(커스텀 SVG 또는 MiniBar 조합)+비율+총액 t2. 광고 중도 종료 → 결과 미공개+"광고를 끝까지 봐야 결과를 볼 수 있어요" Toast+재시도. 집계 중 스켈레톤.
- DoD: 광고 완주 → 배달60%/외식30%/직접조리10%, 총합 100000원(t2), `data-testid="donut-card"`+`data-testid="category-legend"`. 광고 중도 종료 → 미공개+토스트+재시도. 7일 0건 → 광고 없이 빈 상태. 집계 중 스켈레톤. 버튼 ≥48px.
- Covers: [F5-AC-1, F5-AC-2, F5-AC-3, F5-AC-4, F5-AC-5, F5-AC-6]
- Files: src/pages/AnalysisPage.tsx
- Depends on: Task 2.3

### Task 3.7 절약 시뮬레이션 페이지 `/simulate`
- Description: `ScreenScaffold`. 최근 30일 <5건이면 "정확한 분석을 위해 식사를 5번 이상 기록해주세요"(광고/요청 미진행). 첫 이용 시 AI 고지 AlertDialog 1회 → 확인 시 `mbp.flags.aiNoticeAcknowledged=true`. "절약액 보기" → `TossRewardAd` 완주 후 클라이언트 규칙기반 절약액 계산 + `POST /simulate`(env API) 호출로 aiComment 취득. `SummaryHero(CountUp)` `data-testid="saving-hero"` + AI 팁 Card `data-testid="ai-tip-card"` + "AI가 생성한 결과입니다" 배지. 500/네트워크 오류 시 각각 Toast+재시도(크래시 없음), 대기 중 로딩+버튼 재탭 차단.
- DoD: 첫 진입 → AI 고지 다이얼로그 1회+플래그 저장. 광고 완주 → `monthlySaving` SummaryHero(CountUp)+AI 배지+팁 Card. `500 {error:"internal_error"}` → "결과를 불러오지 못했어요..." Toast+재시도, 크래시 없음. 네트워크 실패 → "네트워크 연결을 확인해주세요", CORS 허용 API만 호출, 콘솔 에러 0. 대기 중 로딩+재탭 차단. 30일 <5건 → 안내만, 광고/요청 미진행.
- Covers: [F6-AC-1, F6-AC-2, F6-AC-3, F6-AC-4, F6-AC-5, F6-AC-6, F6-AC-7, F6-AC-8]
- Files: src/pages/SimulatePage.tsx, src/lib/api.ts
- Depends on: Task 2.3

---

## Epic 4. Integration + Landing
Risk — Complexity: Low / 위험요인: 라우트 미등록·`navigate` 대상 불일치로 화면 전환 실패, 광고가 콘텐츠와 겹쳐 검수 반려 / 완화: 페이지 완성 후 마지막에 라우터·FloatingTabBar·광고 배치를 일괄 배선.

### Task 4.1 라우팅 & FloatingTabBar 배선
- Description: `react-router-dom`으로 `/ /budget /record /records /analysis /simulate` 6개 라우트 등록, `AppDataProvider`로 앱 래핑. 템플릿 `FloatingTabBar` 3탭(홈`/`·분석`/analysis`·기록`/records`). 홈의 "식사 기록" 버튼 → `navigate('/record')` 등 아웃고잉 계약 배선. 모든 이동은 앱 내 라우팅.
- DoD: 6개 라우트 정상 마운트, 새로고침 없이 SPA 전환. "식사 기록" 버튼 → `/record` 이동. FloatingTabBar 3탭 높이 ≥48px, 외부 URL 이동 0.
- Covers: [F7-AC-2, F7-AC-6]
- Files: src/App.tsx, src/main.tsx
- Depends on: Task 3.1, Task 3.2, Task 3.2A, Task 3.4, Task 3.5, Task 3.6, Task 3.7

### Task 4.2 광고 배치 & 최종 UX 점검
- Description: 배너 `AdSlot`을 `/simulate` 결과 하단 1개(콘텐츠 겹침 없음)에만 배치, 홈 콘텐츠 사이 배너 미배치 확인. 체크인 배너/리워드 게이트 흐름 최종 확인. **예산 초과 인앱 경고(3.2A)가 광고·콘텐츠와 겹치지 않는지 확인.** 프로덕션 빌드 `console.error` 0, 터치 타깃·통화포맷(`12,000원`)·다크모드(HEX 하드코딩 0) 최종 점검.
- DoD: `/simulate` 결과 아래에만 배너, 홈 배너 없음. 초과 경고 배너/AlertDialog가 다른 요소와 미겹침. `vite build` 성공, 콘솔 에러 0. 통화포맷·44/48px 터치타깃·`var(--tds-color-*)`만 사용 확인.
- Covers: [광고 배치·검수 최종 게이트 — 공통 원칙 준수]
- Files: src/pages/SimulatePage.tsx, src/pages/HomePage.tsx
- Depends on: Task 4.1

---

## AC Coverage
- Total ACs in SPEC: **49** (F1:7, F2:**8**, F3:7, F4:6, F5:6, F6:8, F7:7) — *F2-AC-8(예산 초과 인앱 경고)은 PRD F6 푸시를 정책 준수 형태로 대체한 신규 AC*
- Covered by tasks: **49**
  - F1 — F1-AC-1·F1-AC-3·F1-AC-4·F1-AC-5·F1-AC-7 (2.1), F1-AC-2·F1-AC-6 (2.2)
  - F2 — F2-AC-1·F2-AC-3·F2-AC-4 (3.1), F2-AC-2·F2-AC-5·F2-AC-6·F2-AC-7 (3.2), **F2-AC-8 (2.2 계산 + 3.2A UI)**
  - F3 — F3-AC-1·F3-AC-2·F3-AC-3·F3-AC-4 (3.4), F3-AC-5·F3-AC-6·F3-AC-7 (3.5)
  - F4 — F4-AC-4 (2.2), F4-AC-1·F4-AC-2·F4-AC-3·F4-AC-5·F4-AC-6 (3.3)
  - F5 — F5-AC-2 (2.2), F5-AC-1·F5-AC-3·F5-AC-4·F5-AC-5·F5-AC-6 (3.6)
  - F6 — F6-AC-1~F6-AC-8 (3.7)
  - F7 — F7-AC-1·F7-AC-3·F7-AC-4·F7-AC-5·F7-AC-7 (3.2), F7-AC-2·F7-AC-6 (4.1), F7-AC-6 (3.2)
- Uncovered: 0 ✅

---

## 미해결/계약 이슈 (태스크 범위 밖 — 확인 필요)
1. **[GAP 2 잔여]** 수익모델 4,000 DAU 전제는 **앱인토스 콘솔 지표로만 검증**하는 것으로 확정(인앱 트래킹 금지). PRD가 인앱 계측을 요구한다면 정책 충돌 → PRD 수정 필요.
2. **F6 SPEC 상세** (`SimulateRequest/Response`, 규칙 기반 절약액 산식, 외부 API 스펙)이 SPEC 발췌에 미포함. Task 3.7·1.1이 참조하는 계약이므로 SPEC에 명시 필요.
3. **F2-AC-8 문구/임계치**(경고 톤, 1회 알림 정책)를 SPEC 본문에 정식 등재해 이 TASK와 동기화 필요.

특히 위 1번(분석↔수익 계약)과 2번(F6 API 스펙)은 PRD/SPEC 원문 보강이 필요합니다. 원문을 주시면 해당 태스크 DoD를 구체 수치로 확정하겠습니다.