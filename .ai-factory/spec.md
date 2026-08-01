# SPEC — MealBudgetPlanner

## Common Principles
- **플랫폼**: 앱인토스 (Vite + React + TypeScript + TDS `@toss/tds-mobile`), React Router (`react-router-dom`), localStorage 영속화. 서버 없음.
- **인증**: 토스 세션 자동 제공. 별도 로그인 호출 없음. 유저 식별 필요 시 `getIsTossLoginIntegratedService()`로 통합 상태만 확인.
- **화면 골격**: 모든 화면은 `ScreenScaffold`(Top + 콘텐츠 + 필요 시 SubmitFooter)로 감싼다. raw `<div>` 골격 금지.
- **하단 네비**: 템플릿 제공 `src/components/FloatingTabBar` 사용 (홈 / 기록 / 분석). TDS에 TabBar 없음.
- **색상**: HEX 하드코딩 금지. TDS 컴포넌트 또는 `var(--tds-color-*)`만 사용 (다크모드 필수).
- **금액 포맷**: 모든 금액은 `Intl.NumberFormat('ko-KR')`로 천단위 콤마 + "원" 접미사. 음수 금액은 화면에 표시하지 않고 `0원`으로 클램프.
- **날짜 기준**: "오늘"은 로컬 타임존(Asia/Seoul) `YYYY-MM-DD`. "이번 달"은 `YYYY-MM`.
- **생성형 AI 미사용**: 본 앱의 허용금액/피드백/절약 시뮬레이션은 전부 **결정론적 산술 계산**(규칙 기반). 생성형 AI 결과물이 없으므로 AI 고지 의무 대상 아님 (Assumptions 참조).
- **광고**: 배너 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`, 리워드 게이트 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`. 광고는 콘텐츠 섹션 사이 또는 결과 하단에만 배치, 콘텐츠와 겹치지 않음.
- **터치 타깃**: 모든 인터랙티브 요소 ≥ 44px.
- **에러 정책**: 프로덕션 빌드에서 `console.error` 0개, 외부 도메인 이탈(`window.open`/`window.location.href` 외부 URL) 금지, 외부 분석 솔루션(GA/Amplitude) 미탑재.

---

## Data Models

### MonthlyBudget — 월 식비 예산
```ts
interface MonthlyBudget {
  month: string;      // "YYYY-MM", 예: "2026-08"
  amount: number;     // 총 월 예산(원), 정수, 1 ~ 9,999,999
  createdAt: number;  // epoch ms
  updatedAt: number;  // epoch ms
}
```
- **localStorage key**: `mbp_budget_v1`
- **shape**: `Record<string /* month */, MonthlyBudget>`
- **size**: 항목당 ~90B × 최대 24개월 보관 ≈ 2.2KB

### MealRecord — 식사 기록
```ts
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type MealCategory = 'delivery' | 'homemade' | 'dining_out'; // 배달/직접조리/외식

interface MealRecord {
  id: string;          // crypto.randomUUID()
  date: string;        // "YYYY-MM-DD"
  mealType: MealType;
  category: MealCategory;
  amount: number;      // 원, 정수, 1 ~ 999,999
  memo: string;        // 최대 40자, 없으면 ""
  createdAt: number;   // epoch ms
}
```
- **localStorage key**: `mbp_meals_v1`
- **shape**: `MealRecord[]` (최신순 정렬 유지)
- **size**: 항목당 ~140B. 하루 4건 × 365일 ≈ 1,460건 ≈ 205KB (5MB 이내)

### DailyCheckIn — 일일 체크인/페이스 배지
```ts
type PaceBadge = 'ahead' | 'ontrack' | 'over'; // 여유/정상/초과

interface DailyCheckIn {
  date: string;        // "YYYY-MM-DD" (하루 1건, unique)
  badge: PaceBadge;
  spentSoFar: number;  // 체크인 시점 이번 달 누적 지출(원)
  createdAt: number;
}
```
- **localStorage key**: `mbp_checkins_v1`
- **shape**: `DailyCheckIn[]`
- **size**: 항목당 ~80B × 365 ≈ 29KB

### AppFlags — 온보딩/게이트 플래그
```ts
interface AppFlags {
  onboardingSeen: boolean;      // 최초 예산 미설정 안내 확인 여부
  lastSimulationDate: string;   // "YYYY-MM-DD" | "" — 리워드 시뮬 마지막 열람일
}
```
- **localStorage key**: `mbp_flags_v1`
- **shape**: `AppFlags` (단일 객체)
- **size**: ~60B

> **총 용량 추정**: ~236KB / 5MB (여유 충분).

---

## Feature List

### F1. 데이터 계층 & 계산 엔진 (localStorage repository + allowance calc)
- **Description**: 예산/기록/체크인/플래그의 CRUD를 담당하는 localStorage 저장소 헬퍼와, "오늘 남은 끼니별 허용 금액" 및 "페이스 배지"를 산출하는 순수 함수 계산 엔진을 제공한다. 모든 상위 UI 기능이 이 계층에 의존하며, 저장 실패(quota)와 손상 데이터를 방어한다.
- **Data**: MonthlyBudget, MealRecord, DailyCheckIn, AppFlags
- **API**: 없음 (로컬 전용)
- **Requirements**:
  - **AC-1 [U][P0]**: Scenario: 저장소 초기화
    - Given `mbp_meals_v1` 키가 없을 때
    - When `getMeals()` 호출
    - Then 빈 배열 `[]` 반환 (throw 없음)
  - **AC-2 [E][P0]**: Scenario: 기록 저장
    - Given 유효한 MealRecord `{ date:"2026-08-02", mealType:"lunch", category:"delivery", amount:12000, memo:"점심" }`
    - When `addMeal(record)` 호출
    - Then `mbp_meals_v1`에 `id`, `createdAt`가 채워진 항목이 배열 맨 앞에 추가됨
  - **AC-3 [U][P0]**: Scenario: 오늘 남은 끼니 허용 금액 계산
    - Given 월예산 600,000원, 이번 달 누적 지출 200,000원, 오늘이 8월 2일(이번 달 남은 일수 30일 포함 오늘), 오늘 이미 지출 4,000원
    - When `getRemainingPerMeal({ month:"2026-08", today:"2026-08-02" })` 호출
    - Then `dailyAllowance = floor((600000-200000)/30) = 13333`, `todayRemaining = 13333-4000 = 9333` 반환
  - **AC-4 [S][P1]**: Scenario: 남은 예산 음수 클램프
    - While 누적 지출이 월예산을 초과한 상태에서
    - When `getRemainingPerMeal` 호출
    - Then `todayRemaining`은 음수 없이 `0` 반환하고 `isOver: true` 플래그 반환
  - **AC-5 [W][P1]**: Scenario: localStorage 용량 초과
    - Given `setItem`이 `QuotaExceededError`를 던지는 상태
    - When `addMeal(record)` 호출
    - Then 저장하지 않고 `{ ok:false, reason:"QUOTA" }` 반환 (throw로 앱 크래시 금지)
  - **AC-6 [W][P1]**: Scenario: 손상된 JSON 복구
    - Given `mbp_budget_v1` 값이 `"{broken"` 인 상태
    - When `getBudget("2026-08")` 호출
    - Then `null` 반환하고 `console.error` 출력 없이 내부적으로 키를 리셋
  - **AC-7 [W][P0]**: Scenario: 잘못된 금액 거부
    - Given amount가 `0` 또는 `-500` 또는 `1000000`인 MealRecord
    - When `addMeal` 호출
    - Then 저장하지 않고 `{ ok:false, reason:"INVALID_AMOUNT" }` 반환

---

### F2. 월 예산 설정 (Budget Setup)
- **Description**: 사용자가 이번 달 총 식비 예산을 입력/수정하는 화면. 예산이 없으면 홈에서 이 화면으로 유도하며, 저장 시 홈 대시보드로 복귀한다. 이미 예산이 있으면 기존 값이 프리필된다.
- **Data**: MonthlyBudget
- **API**: 없음
- **Requirements**:
  - **AC-1 [E][P0]**: Scenario: 예산 저장 성공
    - Given 예산 설정 화면에서 토스 유저가 있을 때
    - When 금액 필드에 `600000` 입력 후 저장 버튼 탭
    - Then `mbp_budget_v1["2026-08"] = { amount:600000, ... }` 저장, "예산이 저장되었어요" Toast 표시, `navigate('/')`로 홈 복귀
  - **AC-2 [S][P1]**: Scenario: 기존 예산 프리필
    - While `mbp_budget_v1["2026-08"].amount = 500000`이 존재하는 상태
    - When 예산 설정 화면 진입
    - Then TextField 초기값이 `500,000`으로 표시됨
  - **AC-3 [W][P1]**: Scenario: 빈 금액 거부
    - Given 예산 설정 화면
    - When 금액을 비운 채(또는 `0`) 저장 탭
    - Then 저장하지 않고 필드 하단에 "예산 금액을 입력해주세요" 에러 텍스트 표시
  - **AC-4 [W][P1]**: Scenario: 상한 초과 거부
    - When 금액 필드에 `10000000` 입력 후 저장 탭
    - Then "최대 9,999,999원까지 입력할 수 있어요" 에러 표시, 저장 안 함
  - **AC-5 [U][P1]**: Scenario: 숫자 키패드 표시
    - Given 예산 설정 화면의 금액 TextField
    - Then `inputMode="numeric"`로 모바일 숫자 키패드가 뜨고, 입력 중 자동 천단위 콤마 포맷 적용
  - **AC-6 [E][P2]**: Scenario: 취소 이탈
    - When Top의 뒤로가기 탭
    - Then 저장 없이 이전 화면으로 복귀

---

### F3. 홈 대시보드 (오늘 허용 금액 + 남은 예산)
- **Description**: 앱의 핵심 가치 화면. 오늘 남은 끼니별 허용 금액을 히어로로 강조하고, 이번 달 남은 예산·진행률·오늘 지출을 카드로 보여준다. 예산 미설정 시 설정 유도 빈 상태를 표시한다.
- **Data**: MonthlyBudget, MealRecord (읽기), F1 계산 엔진
- **API**: 없음
- **Requirements**:
  - **AC-1 [U][P0]**: Scenario: 허용 금액 히어로 표시
    - Given 월예산 600,000, 누적 200,000, 오늘 지출 4,000, 남은 일수 30일
    - When 홈 진입
    - Then `data-testid="allowance-hero"` SummaryHero에 CountUp으로 `9,333원` 강조 표시, 서브텍스트 "오늘 남은 끼니 허용 금액"
  - **AC-2 [U][P0]**: Scenario: 핵심 지표 카드 위계
    - Given 예산이 설정된 상태
    - When 홈 진입
    - Then `data-testid="budget-card"` Card 안에 "남은 예산 400,000원"(t2 강조), "이번 달 지출 200,000원", 진행률 바(33%)가 표시됨
  - **AC-3 [S][P1]**: Scenario: 예산 미설정 빈 상태
    - While `mbp_budget_v1["2026-08"]`가 없는 상태
    - When 홈 진입
    - Then `Asset.ContentIcon` + "이번 달 예산을 정해볼까요?" 문구 + `display="block"` "예산 설정하기" 버튼 표시, 버튼 탭 시 `navigate('/budget')`
  - **AC-4 [S][P1]**: Scenario: 예산 초과 상태 강조
    - While 누적 지출이 월예산을 초과한 상태
    - When 홈 진입
    - Then 허용 금액 히어로가 `0원`으로 표시되고 "예산을 초과했어요" 경고 배지(TDS Badge, tone=warning)가 카드 상단에 노출 (F8과 연동)
  - **AC-5 [U][P1]**: Scenario: 로딩 상태
    - Given localStorage 읽기 진행 중(초기 렌더)
    - When 홈 마운트 직후
    - Then 히어로/카드 자리에 TDS Skeleton이 표시되고 데이터 준비 후 실제 값으로 대체
  - **AC-6 [U][P2]**: Scenario: 배너 광고 배치
    - Given 홈 대시보드
    - Then `<AdSlot>` 배너가 지표 카드와 "오늘 기록" 섹션 **사이**에 배치되어 콘텐츠와 겹치지 않음
  - **AC-7 [E][P0]**: Scenario: 기록 화면 이동
    - When 홈의 `display="block"` "식사 기록하기" 버튼 탭
    - Then `navigate('/record')` 실행
  - **Navigation state contract**:
    - Incoming: `location.state = undefined` (탭 진입)
    - Outgoing: `navigate('/budget')` (state 없음), `navigate('/record')` (state 없음)

---

### F4. 식사 기록 입력 (Meal Record Form)
- **Description**: 금액·끼니·카테고리·메모를 3탭 이내로 입력해 식사를 기록하는 폼 화면. 저장 시 홈 지표가 즉시 갱신되도록 저장 후 홈으로 복귀한다.
- **Data**: MealRecord
- **API**: 없음
- **Requirements**:
  - **AC-1 [E][P0]**: Scenario: 기록 저장 성공
    - Given 기록 화면에서 끼니=`점심`, 카테고리=`배달`, 금액=`12000`, 메모=`김밥` 입력
    - When 하단 고정 "기록 저장" 버튼 탭
    - Then `addMeal({ date:"2026-08-02", mealType:"lunch", category:"delivery", amount:12000, memo:"김밥" })` 저장, "기록했어요" Toast, `navigate('/', { state:{ recorded:true } })`
  - **AC-2 [U][P0]**: Scenario: 카테고리 3탭 선택
    - Given 기록 화면
    - Then 카테고리는 TDS Chip 3개(`배달`/`직접조리`/`외식`)로 제공되며 각 Chip 터치 타깃 ≥ 44px, 단일 선택
  - **AC-3 [W][P1]**: Scenario: 금액 미입력 거부
    - When 금액을 비운 채 저장 탭
    - Then 저장 안 함, 금액 필드 하단 "금액을 입력해주세요" 에러 표시
  - **AC-4 [W][P1]**: Scenario: 상한 초과 거부
    - When 금액에 `1000000` 입력 후 저장 탭
    - Then "한 끼 최대 999,999원까지 입력할 수 있어요" 에러 표시, 저장 안 함
  - **AC-5 [W][P1]**: Scenario: 저장 실패(용량 초과)
    - Given F1이 `{ ok:false, reason:"QUOTA" }` 반환
    - When 저장 탭
    - Then "저장 공간이 부족해요. 오래된 기록을 정리해주세요" AlertDialog 표시, 화면 유지
  - **AC-6 [U][P1]**: Scenario: 모바일 키보드 처리
    - Given 금액 TextField
    - Then `inputMode="numeric"`, 포커스 시 하단 "기록 저장" 버튼이 키보드에 가리지 않도록 SubmitFooter가 키보드 위로 유지
  - **AC-7 [E][P2]**: Scenario: 메모 길이 제한
    - When 메모에 41자 입력
    - Then 40자에서 입력이 차단됨
  - **Navigation state contract**:
    - Incoming: `location.state = { defaultMealType?: MealType } | undefined`
    - Outgoing: `navigate('/', { state: { recorded: true } })`

---

### F5. 일일 체크인 + 페이스 배지 (Daily Check-in)
- **Description**: 오늘 식사를 1건 이상 기록하면 홈의 "오늘 체크인" 버튼이 활성화되고, 배너 광고 노출 후 이번 달 소비 페이스 배지(여유/정상/초과)를 지급한다. 하루 1회만 체크인 가능하다.
- **Data**: DailyCheckIn, MealRecord (읽기), MonthlyBudget (읽기)
- **API**: 없음
- **Requirements**:
  - **AC-1 [E][P0]**: Scenario: 체크인 성공 및 배지 지급
    - Given 오늘 MealRecord ≥ 1건 존재, 오늘 미체크인, 누적 지출이 이상적 페이스(경과일 비례 예산) 이하
    - When "오늘 체크인" 버튼 탭
    - Then 배너 광고 노출 → `mbp_checkins_v1`에 `{ date:"2026-08-02", badge:"ahead" }` 저장 → "여유 페이스예요 🟢" 배지 BottomSheet 표시
  - **AC-2 [U][P0]**: Scenario: 배지 판정 규칙
    - Given 경과일 비례 이상 지출 `ideal = monthBudget * (경과일/총일수)`
    - Then 누적 ≤ ideal×0.9 → `ahead`, ideal×0.9 < 누적 ≤ ideal×1.1 → `ontrack`, 누적 > ideal×1.1 → `over`
  - **AC-3 [S][P1]**: Scenario: 오늘 기록 없음
    - While 오늘 MealRecord가 0건인 상태
    - When 홈 진입
    - Then "오늘 체크인" 버튼은 disabled, 서브텍스트 "오늘 식사를 먼저 기록해주세요" 표시
  - **AC-4 [W][P1]**: Scenario: 중복 체크인 차단
    - Given `mbp_checkins_v1`에 오늘 날짜 항목이 이미 존재
    - When "오늘 체크인" 버튼 탭
    - Then 광고/저장 없이 "오늘은 이미 체크인했어요" Toast, 버튼은 "체크인 완료" 상태로 고정
  - **AC-5 [W][P1]**: Scenario: 배너 광고 로드 실패
    - Given `<AdSlot>`가 광고를 로드하지 못한 상태
    - When 체크인 시도
    - Then 광고 영역을 빈 상태로 접고(레이아웃 밀림 없음) 배지 지급은 정상 진행
  - **AC-6 [U][P2]**: Scenario: 연속 체크인 표시
    - Given 최근 3일 연속 체크인 존재
    - Then 홈에 "3일 연속 기록 중 🔥" 텍스트 표시

---

### F6. 주간 소비 패턴 분석 (Weekly Stats)
- **Description**: 최근 7일 식사 기록을 배달/외식/직접조리 비율 도넛 차트와 카테고리별 금액으로 시각화하는 분석 화면. 데이터가 없으면 빈 상태를 표시한다.
- **Data**: MealRecord (읽기)
- **API**: 없음
- **Requirements**:
  - **AC-1 [U][P0]**: Scenario: 카테고리 비율 집계
    - Given 최근 7일 기록: 배달 50,000, 외식 30,000, 직접조리 20,000 (총 100,000)
    - When 분석 화면 진입
    - Then 도넛 차트에 배달 50%, 외식 30%, 직접조리 20%로 렌더, 범례에 각 금액 표시
  - **AC-2 [U][P0]**: Scenario: 핵심 지표 카드 레이아웃
    - Given 분석 화면
    - Then `data-testid="stats-card"` Card에 "주간 총 식비 100,000원"(t2 강조)과 카테고리별 `MiniBar` 3개가 위계 있게 표시됨
  - **AC-3 [S][P1]**: Scenario: 데이터 없음 빈 상태
    - While 최근 7일 기록이 0건인 상태
    - When 분석 화면 진입
    - Then `Asset.ContentIcon` + "이번 주 기록이 아직 없어요" + `display="block"` "기록하러 가기" 버튼 표시, 도넛 미표시
  - **AC-4 [U][P1]**: Scenario: 로딩 상태
    - When 분석 화면 마운트 직후
    - Then 차트/카드 자리에 TDS Skeleton 표시 후 실제 데이터로 대체
  - **AC-5 [U][P1]**: Scenario: 최다 지출 카테고리 피드백
    - Given 배달이 최다(50%)인 상태
    - Then "이번 주는 배달에 가장 많이 썼어요" 결정론적 피드백 문구를 카드 하단에 표시
  - **AC-6 [O][P2]**: Scenario: 요일별 추이
    - Where 7일 중 3일 이상 기록이 존재
    - Then 일자별 지출 `Sparkline`을 카드에 추가 표시
  - **Navigation state contract**:
    - Incoming: `location.state = undefined`
    - Outgoing: `navigate('/record')` (state 없음)

---

### F7. 절약 시뮬레이션 (리워드 광고 게이팅)
- **Description**: 최근 소비 패턴을 바탕으로 "배달 30% 줄이면 월 X원 절약" 시뮬레이션 결과를 제공하되, 리워드 광고 시청 완료 후에만 결과를 공개한다. 결과는 결정론적 계산이며 하루 단위로 재열람 가능하다.
- **Data**: MealRecord (읽기), MonthlyBudget (읽기), AppFlags
- **API**: 없음
- **Requirements**:
  - **AC-1 [E][P0]**: Scenario: 리워드 광고 후 결과 공개
    - Given 시뮬레이션 화면에서 "절약 금액 보기" 버튼 탭
    - When `<TossRewardAd>` 광고 시청 완료
    - Then `data-testid="saving-result"` Card에 절약 가능액이 CountUp SummaryHero로 표시되고 `mbp_flags_v1.lastSimulationDate="2026-08-02"` 저장
  - **AC-2 [U][P0]**: Scenario: 절약액 계산 규칙
    - Given 최근 30일 환산 배달 지출 300,000원
    - Then `예상절약 = round(배달지출 × 0.3) = 90,000원`으로 계산되어 표시
  - **AC-3 [S][P1]**: Scenario: 광고 시청 전 게이트
    - While 광고 미시청 상태
    - When 시뮬레이션 화면 진입
    - Then 결과는 블러 처리 + "광고 보고 결과 확인하기" 버튼만 노출, 절약 금액 숫자 비노출
  - **AC-4 [W][P1]**: Scenario: 리워드 광고 로드 실패
    - Given `TossRewardAd`가 광고 로드/노출에 실패
    - When 결과 보기 시도
    - Then "잠시 후 다시 시도해주세요" Toast 표시, 결과 비공개 유지, 앱 크래시 없음
  - **AC-5 [S][P1]**: Scenario: 데이터 부족
    - While 배달 카테고리 기록이 0건인 상태
    - When 시뮬레이션 화면 진입
    - Then "배달 기록이 있어야 절약 시뮬레이션을 볼 수 있어요" 빈 상태 표시, 광고 버튼 비활성
  - **AC-6 [E][P2]**: Scenario: 당일 재열람 스킵
    - Given `mbp_flags_v1.lastSimulationDate`가 오늘과 동일
    - When 시뮬레이션 화면 진입
    - Then 광고 없이 바로 결과 카드 표시
  - **Navigation state contract**:
    - Incoming: `location.state = undefined`
    - Outgoing: 없음 (탭/모달 내 완결)

---

### F8. 예산 초과 인앱 경고 (In-app Over-budget Alert)
- **Description**: 이번 달 누적 지출이 예산 대비 위험 구간에 진입하면 홈 상단에 인앱 경고 배너를 표시한다. (푸시 알림은 MVP 범위 외 — 인앱 배너로 대체.)
- **Data**: MonthlyBudget (읽기), MealRecord (읽기)
- **API**: 없음
- **Requirements**:
  - **AC-1 [S][P0]**: Scenario: 초과 임박 경고
    - While 누적 지출이 월예산의 90% 이상 100% 미만인 상태
    - When 홈 진입
    - Then `data-testid="over-alert"` TDS Callout/Card(tone=warning)에 "예산의 90%를 썼어요. 남은 예산 X원" 표시
  - **AC-2 [S][P0]**: Scenario: 초과 경고
    - While 누적 지출이 월예산 100%를 초과한 상태
    - When 홈 진입
    - Then 경고 배너에 "예산을 A원 초과했어요"(tone=critical) 표시
  - **AC-3 [S][P1]**: Scenario: 정상 구간 미표시
    - While 누적 지출이 월예산의 90% 미만인 상태
    - When 홈 진입
    - Then 경고 배너를 렌더하지 않음(DOM에 `over-alert` 없음)
  - **AC-4 [E][P1]**: Scenario: 경고에서 예산 재설정 이동
    - When 경고 배너의 "예산 조정" 버튼 탭
    - Then `navigate('/budget')` 실행
  - **AC-5 [W][P1]**: Scenario: 예산 0 방어
    - Given 예산이 미설정(0) 상태
    - When 홈 진입
    - Then 나눗셈 오류/`Infinity` 없이 경고 배너를 표시하지 않음

---

## Screen Definitions

### S1. 홈 대시보드 — `/`
- **TDS 컴포넌트**: `ScreenScaffold`(Top: "MealBudget"), `SummaryHero`(허용금액, CountUp), `Card`(지표), 진행률 `Progress`, `Badge`(페이스), `Button`(display="block": 식사 기록/체크인/예산설정), `Callout`(F8 경고), `AdSlot`(배너), `Skeleton`(로딩), `Asset.ContentIcon`(빈 상태), `Toast`, `BottomSheet`(체크인 결과), `FloatingTabBar`.
- **상태**: 로딩=Skeleton, 빈=예산 미설정 유도, 에러=손상 데이터 시 안전 기본값(예산 없음 취급).
- **터치**: 모든 버튼/Chip ≥ 44px. 배너는 카드-기록섹션 사이.
- **레이아웃 AC**: F3-AC1(`allowance-hero`), F3-AC2(`budget-card`), F8-AC1(`over-alert`).
- **Navigation**: Incoming `undefined` / Outgoing `navigate('/budget')`, `navigate('/record')`.

### S2. 예산 설정 — `/budget`
- **TDS 컴포넌트**: `ScreenScaffold`(Top: "예산 설정", 뒤로가기), `TextField`(금액, inputMode="numeric"), `Paragraph.Text`(안내/에러), `SubmitFooter` + `Button`("저장", display="block"), `Toast`.
- **상태**: 로딩=기존 예산 조회 중 Skeleton, 빈=신규 입력(플레이스홀더), 에러=검증 에러 텍스트.
- **터치**: 저장 버튼 하단 고정, 키보드 위 유지.
- **Navigation**: Incoming `undefined` / Outgoing `navigate('/')`.

### S3. 식사 기록 — `/record`
- **TDS 컴포넌트**: `ScreenScaffold`(Top: "식사 기록"), `Chip`(끼니 4 / 카테고리 3), `TextField`(금액·메모), `Paragraph.Text`(에러), `SubmitFooter`+`Button`("기록 저장"), `AlertDialog`(용량 초과), `Toast`.
- **상태**: 로딩=없음(즉시 폼), 빈=초기 폼, 에러=필드 에러/저장 실패 AlertDialog.
- **터치**: Chip·버튼 ≥ 44px, numeric 키패드.
- **Navigation**: Incoming `{ defaultMealType?: MealType } | undefined` / Outgoing `navigate('/', { state:{ recorded:true } })`.

### S4. 주간 분석 — `/stats`
- **TDS 컴포넌트**: `ScreenScaffold`(Top: "주간 분석"), `Card`(`stats-card`), 도넛 차트(SVG, `var(--tds-color-*)` 팔레트), `MiniBar`, `Sparkline`, `Paragraph.Text`(피드백), `Skeleton`, `Asset.ContentIcon`+`Button`(빈 상태), `FloatingTabBar`.
- **상태**: 로딩=Skeleton, 빈=기록 없음 유도, 에러=안전 빈 상태.
- **레이아웃 AC**: F6-AC2(`stats-card`).
- **Navigation**: Incoming `undefined` / Outgoing `navigate('/record')`.

### S5. 절약 시뮬레이션 — `/simulation`
- **TDS 컴포넌트**: `ScreenScaffold`(Top: "절약 시뮬레이션"), `TossRewardAd`(결과 게이트), `Card`(`saving-result`), `SummaryHero`(CountUp 절약액), `Button`("광고 보고 결과 확인하기", display="block"), `Toast`, `Asset.ContentIcon`(데이터 부족).
- **상태**: 로딩=Skeleton, 빈=배달 기록 없음, 에러=광고 실패 Toast(결과 유지 블러).
- **레이아웃 AC**: F7-AC1(`saving-result`), F7-AC3(블러 게이트).
- **Navigation**: Incoming `undefined` / Outgoing 없음.

> 라우팅: `/simulation`은 분석 화면의 "절약 시뮬레이션 보기" 버튼 또는 별도 진입점으로 연결. FloatingTabBar 탭: 홈(`/`) · 기록(`/record`) · 분석(`/stats`).

---

## API Contract
외부 API 호출 없음 (전 기능 localStorage 로컬 처리). 향후 다기기 동기화가 필요하면 별도 Railway API 서버를 신설하며, 그때 에러 응답은 `{ error: string }` 통일 형태를 따른다.

---

## Toss 검수 통과 ACs (전역)
- **G-1 [W][P0]**: `window.location.href`/`window.open`으로 외부 URL 이동 시도 코드가 존재하지 않음(외부 도메인 이탈 0).
- **G-2 [U][P0]**: 프로덕션 빌드에서 `console.error` 출력 0개.
- **G-3 [U][P1]**: 외부 분석 SDK(GA/Amplitude 등) 미탑재 — 외부 로깅 0.
- **G-4 [W][P1]**: "앱 설치/다운로드" 유도 문구·배너·링크 없음.
- **G-5 [W][P0]**: HEX 색상 하드코딩 없음 — 전부 TDS 컴포넌트/`var(--tds-color-*)` 사용, 다크모드 정상.
- **G-6 [U][P1]**: Android 7+ / iOS 16+ 호환 — 최신 전용 API 미사용(`crypto.randomUUID` 폴백 포함).
- **G-7 [U][P0]**: `grantPromotionReward` 미사용(프로모션 캠페인 없음). 향후 사용 시 `amount ≤ 5000` 검증 필수.

---

## Assumptions
- **A-1**: 본 앱은 생성형 AI를 사용하지 않는다. 허용금액/배지/피드백/절약 시뮬레이션은 모두 결정론적 산술 규칙이므로 생성형 AI 고지 의무(사전 고지·결과 라벨) 대상이 아니다. 만약 향후 LLM 기반 피드백을 도입하면 AI 고지 ACs를 추가한다.
- **A-2**: PRD의 "예산 초과 경고 푸시(토스 인앱 알림)"는 MVP에서 **인앱 경고 배너(F8)** 로 구현한다 (푸시 알림은 MVP 범위 외).
- **A-3**: "이상적 페이스" 배지 기준은 경과일 비례 예산(선형)으로 단순화한다.
- **A-4**: 하루 끼니 슬롯은 아침/점심/저녁 3개 기준으로 허용 금액을 분배하며, 간식(snack)은 지출 집계에는 포함되나 슬롯 분배에는 포함하지 않는다.
- **A-5**: 예산·기록은 월별로 독립 관리하며 월 경계 시 자동으로 새 달 예산 미설정 상태가 된다.
- **A-6**: 리워드 시뮬레이션의 "최근 30일 환산 배달 지출"은 보유 기록 기간이 30일 미만이면 보유 기간 합계를 그대로 사용한다.

## Open Questions
- **Q-1**: 배지 판정의 `ahead/ontrack/over` 임계치(±10%)를 유지할지, 사용자 조정 가능하게 할지?
- **Q-2**: 절약 시뮬레이션의 절약률(현재 배달 30% 가정)을 고정할지 사용자가 슬라이더로 조정하게 할지?
- **Q-3**: 오래된 기록 자동 정리(예: 12개월 초과 삭제) 정책을 넣을지, 사용자 수동 관리로 둘지?
- **Q-4**: FloatingTabBar에 "절약 시뮬레이션"을 4번째 탭으로 노출할지, 분석 화면 내 진입점으로만 둘지?