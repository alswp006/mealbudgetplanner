The validation errors are caused by formatting: the fields were bolded (`- **Covers**:`) instead of matching the parser's expected plain-label format (`- Covers:`). I'll rewrite using the exact template field format.

# TASK — MealBudgetPlanner

## Epic 1. 타입 정의 (Types & Interfaces)

Risk Assessment
- Complexity: Low
- Risk factors: RouteState 누락 시 페이지 간 `location.state` 타입 불일치로 런타임 데이터 오염(F4→F3 `recorded` 플래그 등). 엔티티 필드 오타는 전 계층에 전파.
- Mitigation: 순수 타입만 먼저 고정(런타임 0) → 이후 모든 storage/state/page 패킷이 동일 소스에서 import하므로 계약 불일치 원천 차단.

### Task 1.1 엔티티 타입 + RouteState 정의
- Description: SPEC Data Models의 모든 인터페이스/유니온과 저장소 반환 계약, 페이지 간 네비게이션 계약을 순수 타입으로 정의한다. 런타임 코드 없음. `MonthlyBudget`, `MealRecord`, `MealType`, `MealCategory`, `DailyCheckIn`, `PaceBadge`, `AppFlags`. 계산 결과 타입 `RemainingResult { dailyAllowance:number; todayRemaining:number; isOver:boolean }`, `SavingResult`, `WeeklyStats`. 저장소 결과 타입 `WriteResult = { ok:true } | { ok:false; reason:'QUOTA'|'INVALID_AMOUNT' }`. RouteState 정의(필수): `export type RouteState = { "/": { recorded: boolean } | undefined; "/budget": undefined; "/record": { defaultMealType?: MealType } | undefined; "/stats": undefined; "/simulation": undefined; };`
- DoD: `tsc --noEmit` 통과. 다른 파일에서 import 가능. 런타임 export 0개(타입/인터페이스만). RouteState 5개 라우트 키 모두 포함.
- Covers: [F1-AC2, F4-AC1, F5-AC1]
- Files: [src/lib/types.ts]
- Depends on: none

---

## Epic 2. 데이터 계층 (Storage + Calc Engine + State)

Risk Assessment
- Complexity: Medium
- Risk factors: `QuotaExceededError`/손상 JSON 미방어 시 앱 크래시(F1-AC5/6). 예산 0 나눗셈 → `Infinity`(F8-AC5). 날짜/타임존 계산 오류로 허용금액 오산.
- Mitigation: storage(2.1)와 계산 엔진(2.2)을 분리해 각각 단위 테스트. 상태관리(2.3)는 순수 계층 위에만 의존 → UI 이전에 모든 계약 검증 완료.

### Task 2.1 localStorage 저장소 헬퍼 (CRUD + 방어)
- Description: 4개 키의 read/write 헬퍼를 구현한다. `crypto.randomUUID` 폴백 포함(G-6). try/catch로 `QuotaExceededError`→`{ok:false,reason:'QUOTA'}`, 손상 JSON→`null` 반환 + 해당 키 리셋(`console.error` 미출력). `getMeals()→[]`(키 없으면 빈 배열), `addMeal(input)`: amount 검증(1~999,999, 정수 아니면 `INVALID_AMOUNT`) → id/createdAt 채워 배열 맨 앞 삽입, memo 40자 클램프. `getBudget(month)`, `setBudget(month, amount)`, `getCheckIns()`, `addCheckIn(entry)`, `getFlags()`, `setFlags(patch)`. `safeParse` 유틸: JSON.parse 실패 시 키 removeItem 후 fallback 반환.
- DoD: 키 부재 시 `getMeals()` `[]` 반환. 손상값 주입 시 `getBudget` `null` + 콘솔 에러 0. quota mock 시 `addMeal` `{ok:false,reason:'QUOTA'}`. amount 0/-500/1000000 → `INVALID_AMOUNT`. 앱 컴파일 유지.
- Covers: [F1-AC1, F1-AC2, F1-AC5, F1-AC6, F1-AC7, G-6]
- Files: [src/lib/storage.ts]
- Depends on: Task 1.1

### Task 2.2 계산 엔진 (허용금액·페이스·절약·주간집계 순수함수)
- Description: 결정론적 산술 계산 함수를 순수함수로 구현(생성형 AI 미사용). Asia/Seoul 로컬 `YYYY-MM-DD`/`YYYY-MM` 유틸 포함. `getRemainingPerMeal({month,today})`: `dailyAllowance=floor((예산-누적)/이번달남은일수)`, `todayRemaining=dailyAllowance-오늘지출`, 음수는 `0` 클램프 + `isOver:true`. 예산 0/미설정 시 나눗셈 방어(`Infinity` 금지). `getPaceBadge`: `ideal=예산*(경과일/총일수)`, ≤ideal×0.9→`ahead`, ≤ideal×1.1→`ontrack`, else`over`. `getSaving`: 최근 30일 환산 배달지출×0.3 `round`(보유<30일이면 합계 그대로 — A-6). `getWeeklyStats`: 최근 7일 카테고리별 합계·비율·총액·최다 카테고리. `getOverBudgetStatus`: 소진율 90%↑/100%↑ 구간 판정, 예산 0 → 미표시. 금액 포맷 `formatKRW`(`Intl.NumberFormat('ko-KR')` + "원", 음수 `0원` 클램프).
- DoD: SPEC 수치 재현 — 예산600k/누적200k/남은30일/오늘4k → `dailyAllowance=13333`, `todayRemaining=9333`. 초과 시 `0`+`isOver:true`. 예산0 입력 시 `Infinity`/NaN 없음. `tsc --noEmit` 통과.
- Covers: [F1-AC3, F1-AC4, F5-AC2, F6-AC1, F7-AC2, F8-AC5]
- Files: [src/lib/calc.ts, src/lib/format.ts]
- Depends on: Task 1.1

### Task 2.3 상태 관리 훅/스토어
- Description: storage+calc를 감싸 컴포넌트에 데이터/파생값을 제공하는 경량 store(React state + subscribe 또는 Context). 쓰기 후 재조회로 홈 지표 즉시 갱신. `useAppData()`: `{ budget, meals, checkins, flags, loading }` + `refresh()`. `useDerived(today)`: `remaining`, `weeklyStats`, `overStatus`, `todayCheckedIn`, `streak`(연속 체크인 일수), `todayHasMeal`. 액션: `saveBudget`, `recordMeal`, `doCheckIn`, `markSimulationSeen`. 초기 마운트 시 `loading:true` → 읽기 완료 후 `false`(Skeleton 트리거용).
- DoD: 훅이 loading 플래그 노출. `recordMeal` 후 `refresh` 시 meals 최신순 반영. 손상 데이터 시 안전 기본값(예산 없음 취급). 컴파일 유지.
- Covers: [F3-AC5, F5-AC6, F6-AC4]
- Files: [src/lib/store.ts]
- Depends on: Task 2.1, Task 2.2

---

## Epic 3. UI 페이지 (ONE page per task)

Risk Assessment
- Complexity: Medium
- Risk factors: TDS 여백을 Tailwind/인라인으로 덮어써 검수 반려. 도넛 차트 HEX 하드코딩(G-5). SubmitFooter가 키보드에 가림. 리워드/배너 광고 로드 실패 시 크래시.
- Mitigation: 페이지당 1 패킷으로 10분 내 완결. 데이터 계층 완성 후 진입 → UI는 렌더/이벤트만. 각 페이지 독립 라우트로 개별 컴파일 검증.

### Task 3.1 예산 설정 페이지 `/budget`
- Description: `ScreenScaffold`(Top "예산 설정" + 뒤로가기) + 금액 `TextField`(`inputMode="numeric"`, 자동 천단위 콤마) + `SubmitFooter`+`Button`("저장", display="block"). 기존 예산 프리필. 검증(빈/0, 상한 9,999,999) 실패 시 필드 하단 `Paragraph.Text` 에러. 저장 성공 시 Toast + `navigate('/')`. RouteState로 location.state 캐스팅.
- DoD: `600000` 저장 → `mbp_budget_v1["2026-08"]` 기록 + "예산이 저장되었어요" Toast + 홈 복귀. 기존 500000 존재 시 `500,000` 프리필. 빈/0 → "예산 금액을 입력해주세요". `10000000` → "최대 9,999,999원까지 입력할 수 있어요". 뒤로가기 시 저장 없이 복귀. 숫자 키패드 표시.
- Covers: [F2-AC1, F2-AC2, F2-AC3, F2-AC4, F2-AC5, F2-AC6]
- Files: [src/pages/BudgetPage.tsx]
- Depends on: Task 2.3

### Task 3.2 홈 대시보드 `/` (허용금액 + 지표 + 빈/로딩)
- Description: `ScreenScaffold`(Top "MealBudget"). `SummaryHero`(`data-testid="allowance-hero"`, CountUp 허용금액, 서브 "오늘 남은 끼니 허용 금액"). `Card`(`data-testid="budget-card"`: 남은 예산 t2 강조/이번 달 지출/`Progress` 진행률). 예산 미설정 시 `Asset.ContentIcon`+"이번 달 예산을 정해볼까요?"+"예산 설정하기"(→`/budget`). 로딩 시 `Skeleton`. "식사 기록하기" 버튼(display="block")→`navigate('/record')`. 초과 시 히어로 `0원`. location.state를 RouteState로 캐스팅.
- DoD: SPEC 수치 시 히어로 `9,333원`, budget-card 남은 `400,000원`/지출 `200,000원`/진행률 33%. 예산 없으면 빈 상태+버튼 이동. 마운트 직후 Skeleton→실데이터. 초과 시 히어로 `0원`. "식사 기록하기"→`/record`.
- Covers: [F3-AC1, F3-AC2, F3-AC3, F3-AC4, F3-AC5, F3-AC7]
- Files: [src/pages/HomePage.tsx, src/components/AllowanceHero.tsx]
- Depends on: Task 2.3

### Task 3.3 홈 예산 초과 경고 배너 (F8) + 체크인 섹션 (F5)
- Description: 홈에 인앱 경고 배너와 체크인 UI를 추가한다. 경고: `data-testid="over-alert"` `Callout`/`Card` — 90%↑&<100% "예산의 90%를 썼어요. 남은 예산 X원"(warning), 100%↑ "예산을 A원 초과했어요"(critical), 90%미만/예산0 미렌더. "예산 조정" 버튼→`navigate('/budget')`. 체크인: 오늘 기록 0건 시 버튼 disabled+"오늘 식사를 먼저 기록해주세요". 미체크인 시 활성 → `<AdSlot>` 배너 노출 후 `addCheckIn` + 배지 `BottomSheet`("여유/정상/초과"). 중복 시 광고/저장 없이 Toast "오늘은 이미 체크인했어요"+"체크인 완료" 고정. 광고 로드 실패 시 영역 접고 배지 지급 정상 진행. 3일 연속 시 "N일 연속 기록 중 🔥".
- DoD: 소진 95% → over-alert warning 표시, 105% → critical, 85%/예산0 → DOM에 over-alert 없음. 오늘 기록 0건 → 체크인 disabled. 체크인 성공 시 badge 저장+BottomSheet. 재탭 시 Toast+고정. 3일 연속 텍스트 표시.
- Covers: [F8-AC1, F8-AC2, F8-AC3, F8-AC4, F5-AC1, F5-AC3, F5-AC4, F5-AC5, F5-AC6]
- Files: [src/components/OverBudgetAlert.tsx, src/components/CheckInSection.tsx]
- Depends on: Task 2.3, Task 3.2

### Task 3.4 식사 기록 페이지 `/record`
- Description: `ScreenScaffold`(Top "식사 기록"). 끼니 `Chip` 4개 + 카테고리 `Chip` 3개(배달/직접조리/외식, 단일 선택, ≥44px). 금액 `TextField`(`inputMode="numeric"`) + 메모 `TextField`(40자 차단). `SubmitFooter`+`Button`("기록 저장", 키보드 위 유지). 저장 성공→Toast "기록했어요"+`navigate('/', { state:{ recorded:true } })`. 검증 실패/QUOTA 처리. `location.state.defaultMealType` 프리필(RouteState 캐스팅).
- DoD: 점심/배달/12000/김밥 저장 → `addMeal` 기록+Toast+홈 이동(state recorded:true). 금액 빈 → "금액을 입력해주세요". `1000000` → "한 끼 최대 999,999원까지 입력할 수 있어요". QUOTA 반환 시 AlertDialog "저장 공간이 부족해요..." 화면 유지. 메모 41자 → 40자 차단. 숫자 키패드.
- Covers: [F4-AC1, F4-AC2, F4-AC3, F4-AC4, F4-AC5, F4-AC6, F4-AC7]
- Files: [src/pages/RecordPage.tsx]
- Depends on: Task 2.3

### Task 3.5 주간 분석 페이지 `/stats`
- Description: `ScreenScaffold`(Top "주간 분석"). 도넛 차트(SVG, `var(--tds-color-*)` 팔레트 — HEX 금지). `Card`(`data-testid="stats-card"`: "주간 총 식비" t2 강조 + `MiniBar` 3개). 최다 카테고리 피드백 `Paragraph.Text`. 3일↑ 기록 시 `Sparkline`. 빈 상태(`Asset.ContentIcon`+"이번 주 기록이 아직 없어요"+"기록하러 가기"→`/record`). 로딩 `Skeleton`.
- DoD: 배달50k/외식30k/직접조리20k → 도넛 50/30/20% + 범례 금액. stats-card 총 `100,000원`+MiniBar 3. 기록 0건 → 빈 상태, 도넛 미표시. 마운트 직후 Skeleton. 배달 최다 시 "이번 주는 배달에 가장 많이 썼어요". 3일↑ 시 Sparkline. HEX 하드코딩 0.
- Covers: [F6-AC1, F6-AC2, F6-AC3, F6-AC4, F6-AC5, F6-AC6]
- Files: [src/pages/StatsPage.tsx, src/components/DonutChart.tsx]
- Depends on: Task 2.3

### Task 3.6 절약 시뮬레이션 페이지 `/simulation`
- Description: `ScreenScaffold`(Top "절약 시뮬레이션"). `<TossRewardAd slotId=...>`로 결과 게이팅. 미시청 시 결과 블러 + "광고 보고 결과 확인하기" 버튼만, 숫자 비노출. 시청 완료 시 `data-testid="saving-result"` `Card`+`SummaryHero`(CountUp 절약액) + `markSimulationSeen`(flags 오늘 날짜). 배달 기록 0건 시 빈 상태+버튼 비활성. 광고 실패 시 Toast "잠시 후 다시 시도해주세요" 결과 비공개 유지. `lastSimulationDate==오늘`이면 광고 없이 바로 결과.
- DoD: 배달 300k → 절약 `90,000원` CountUp 표시 + flags 저장. 미시청 시 블러+숫자 비노출. 배달 0건 → 빈 상태+버튼 disabled. 광고 실패 → Toast, 결과 유지 블러, 크래시 없음. 당일 재진입 시 광고 스킵.
- Covers: [F7-AC1, F7-AC3, F7-AC4, F7-AC5, F7-AC6]
- Files: [src/pages/SimulationPage.tsx]
- Depends on: Task 2.3

---

## Epic 4. 통합 + 마감 (Routing / Ad 배치 / 검수 전역 AC)

Risk Assessment
- Complexity: Low
- Risk factors: 라우트 미배선으로 페이지 도달 불가. 배너가 콘텐츠와 겹침(F3-AC6). 외부 URL/console.error/분석 SDK 잔존으로 검수 반려(G-1~5).
- Mitigation: 모든 페이지 완성 후 마지막에 배선 → 전 경로 실기동 검증. 전역 검수 AC를 단일 패킷에서 grep 스윕으로 일괄 확인.

### Task 4.1 라우팅 배선 + FloatingTabBar + 광고 배치 + 검수 스윕
- Description: `react-router-dom` 라우트 5개(`/`,`/budget`,`/record`,`/stats`,`/simulation`) 등록. `FloatingTabBar`(홈/기록/분석) 배선. 홈 배너 `<AdSlot>`를 지표 카드와 "오늘 기록" 섹션 사이 배치(겹침 없음). 분석 화면에 "절약 시뮬레이션 보기" 진입점→`/simulation`. 전역 검수 스윕: `window.open`/외부 `window.location.href` 제거, 프로덕션 `console.error` 0, GA/Amplitude 미탑재, "앱 설치/다운로드" 유도 문구 없음, HEX 하드코딩 0(다크모드 확인), `grantPromotionReward` 미사용, `crypto.randomUUID` 폴백 확인.
- DoD: 5개 경로 정상 이동, TabBar 3탭 동작. 홈 배너가 카드-기록섹션 사이(콘텐츠 비겹침). `grep`으로 window.open/외부URL/GA/Amplitude/HEX/console.error 0 확인. 프로덕션 빌드 성공.
- Covers: [F3-AC6, G-1, G-2, G-3, G-4, G-5, G-7]
- Files: [src/App.tsx, src/router.tsx, src/components/FloatingTabBar.tsx]
- Depends on: Task 3.1, Task 3.2, Task 3.3, Task 3.4, Task 3.5, Task 3.6

---

## AC Coverage

- Total ACs in SPEC: 57 (F1:7, F2:6, F3:7, F4:7, F5:6, F6:6, F7:6, F8:5, G:7)
- Covered by tasks: 57
  - F1-AC1 → 2.1 / F1-AC2 → 1.1, 2.1 / F1-AC3 → 2.2 / F1-AC4 → 2.2 / F1-AC5 → 2.1 / F1-AC6 → 2.1 / F1-AC7 → 2.1
  - F2-AC1~6 → 3.1
  - F3-AC1 → 3.2 / F3-AC2 → 3.2 / F3-AC3 → 3.2 / F3-AC4 → 3.2 / F3-AC5 → 2.3, 3.2 / F3-AC6 → 4.1 / F3-AC7 → 3.2
  - F4-AC1 → 1.1, 3.4 / F4-AC2~7 → 3.4
  - F5-AC1 → 3.3 / F5-AC2 → 2.2 / F5-AC3 → 3.3 / F5-AC4 → 3.3 / F5-AC5 → 3.3 / F5-AC6 → 2.3, 3.3
  - F6-AC1 → 2.2 / F6-AC2 → 3.5 / F6-AC3 → 3.5 / F6-AC4 → 2.3, 3.5 / F6-AC5 → 3.5 / F6-AC6 → 3.5
  - F7-AC1 → 3.6 / F7-AC2 → 2.2 / F7-AC3~6 → 3.6
  - F8-AC1 → 3.3 / F8-AC2 → 3.3 / F8-AC3 → 3.3 / F8-AC4 → 3.3 / F8-AC5 → 2.2
  - G-1~5 → 4.1 / G-6 → 2.1 / G-7 → 4.1
- Uncovered: 0 ✅

> 참고 (Open Questions): Q-4(절약 시뮬 탭 노출)는 현재 분석 화면 내 진입점(4.1)으로 구현. Q-1/Q-2/Q-3(임계치·절약률·기록 정리 정책)는 MVP에서 SPEC 고정값 사용.