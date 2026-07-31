# SPEC — MealBudgetPlanner

## Common Principles
- **Platform**: 앱인토스 (Vite + React + TypeScript + TDS), React Router 클라이언트 라우팅, localStorage 영속화.
- **인증**: 토스 앱이 세션 자동 제공. 별도 로그인 함수 호출 없음. 유저 식별 필요 시 `getIsTossLoginIntegratedService()`로 확인.
- **UI 원칙**: 모든 화면은 `@toss/tds-mobile` 컴포넌트로만 구성. 하단 탭은 템플릿 제공 `src/components/FloatingTabBar` 사용. 색상은 `var(--tds-color-*)` 또는 TDS 컴포넌트만 사용(HEX 하드코딩 금지, 다크모드 지원).
- **여백**: TDS 내장 padding/margin 유지, 간격은 TDS `Spacing`(size prop 필수)만 사용.
- **터치 타깃**: 모든 인터랙티브 요소 ≥ 44px.
- **광고**: 배너 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`, 리워드 게이트 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`. 콘텐츠와 겹치지 않게 섹션 사이/결과 뒤에만 배치.
- **AI 고지**: 절약 시뮬레이션(F6)은 규칙 기반 + AI 코멘트 생성이므로 생성형 AI 고지 의무 적용.
- **금액 단위**: 원(KRW), 정수. 통화 포맷 `12,000원`.
- **날짜**: `YYYY-MM-DD` (로컬 타임존). 끼니: `breakfast | lunch | dinner`.
- **에러 처리**: localStorage 실패/파싱 오류 시 앱 크래시 없이 TDS Toast로 안내. 프로덕션 빌드에서 `console.error` 0개.
- **외부 이탈 금지**: `window.location.href`/`window.open`으로 외부 URL 이동 금지. 외부 분석 솔루션(GA/Amplitude) 사용 금지.

---

## Data Models

### Budget — 월 식비 예산
| field | type | constraints |
|---|---|---|
| month | `string` | `YYYY-MM`, PK |
| totalBudget | `number` | 정수, 1 ~ 10,000,000 |
| createdAt | `string` | ISO8601 |
| updatedAt | `string` | ISO8601 |

```ts
interface Budget {
  month: string;        // "2026-08"
  totalBudget: number;  // 500000
  createdAt: string;
  updatedAt: string;
}
```

### MealRecord — 식사 기록
| field | type | constraints |
|---|---|---|
| id | `string` | `crypto.randomUUID()`, PK |
| date | `string` | `YYYY-MM-DD` |
| slot | `MealSlot` | `breakfast \| lunch \| dinner` |
| category | `MealCategory` | `delivery \| dining_out \| home_cooked` |
| amount | `number` | 정수, 1 ~ 1,000,000 |
| memo | `string` | 0 ~ 50자 |
| createdAt | `string` | ISO8601 |

```ts
type MealSlot = 'breakfast' | 'lunch' | 'dinner';
type MealCategory = 'delivery' | 'dining_out' | 'home_cooked';

interface MealRecord {
  id: string;
  date: string;         // "2026-08-01"
  slot: MealSlot;
  category: MealCategory;
  amount: number;       // 12000
  memo: string;         // "점심 배달"
  createdAt: string;
}
```

### CheckinLog — 일일 체크인 기록
```ts
interface CheckinLog {
  date: string;         // "2026-08-01"
  paceBadge: 'ahead' | 'ontrack' | 'over'; // 지급된 배지
  grantedAt: string;    // ISO8601
}
```

### AppFlags — 1회성 플래그
```ts
interface AppFlags {
  aiNoticeAcknowledged: boolean; // AI 사전 고지 확인 여부
}
```

### localStorage 키 / 크기 추정
| key | shape | 추정 크기 |
|---|---|---|
| `mbp.budgets` | `Record<string, Budget>` (월별) | 월당 ~120B × 24개월 ≈ 3KB |
| `mbp.meals` | `MealRecord[]` | 레코드당 ~180B × 90끼/월 × 12개월 ≈ 195KB |
| `mbp.checkins` | `Record<string, CheckinLog>` (날짜별) | 날짜당 ~80B × 365 ≈ 29KB |
| `mbp.flags` | `AppFlags` | ~40B |

**총합 추정 < 250KB** (5MB 한도 대비 5% 미만). 오래된 데이터는 F1에서 13개월 초과분 정리.

---

## Feature List

### F1. 데이터 레이어 & 저장소
- **Description**: 예산·식사·체크인 데이터를 localStorage에 읽고 쓰는 저장 계층과 파생 계산 유틸(월 소비 합계, 카테고리별 합계, 남은 예산)을 제공한다. 모든 상위 기능이 이 계층을 통해서만 데이터에 접근하며, 저장 실패와 파싱 오류를 방어한다.
- **Data**: Budget, MealRecord, CheckinLog, AppFlags
- **API**: 없음 (내부 로컬 저장소)
- **Requirements**:
- AC-1 [U][P0]: Scenario: 식사 저장 후 재조회
  Given `mbp.meals`가 비어있을 때
  When `addMeal({ date: "2026-08-01", slot: "lunch", category: "delivery", amount: 12000, memo: "점심" })` 호출
  Then `mbp.meals`에 `id`가 부여된 레코드 1건이 저장되고, `getMealsByMonth("2026-08")`가 해당 1건을 반환한다
- AC-2 [U][P0]: Scenario: 월 소비 합계 계산
  Given `2026-08`에 amount 12000, 8000, 5000 레코드 3건이 있을 때
  When `getMonthSpent("2026-08")` 호출
  Then `25000`을 반환한다
- AC-3 [E][P0]: Scenario: 예산 저장/수정
  Given `mbp.budgets`가 비어있을 때
  When `setBudget("2026-08", 500000)` 호출 후 다시 `setBudget("2026-08", 600000)` 호출
  Then `getBudget("2026-08").totalBudget === 600000` 이고 `updatedAt`이 `createdAt` 이후 값이다
- AC-4 [W][P1]: Scenario: 파싱 손상 데이터 방어
  Given `localStorage["mbp.meals"]`에 `"{invalid json"` 문자열이 저장되어 있을 때
  When `getMealsByMonth("2026-08")` 호출
  Then 빈 배열 `[]`을 반환하고 `console.error`를 출력하지 않는다
- AC-5 [W][P1]: Scenario: 저장 용량 초과
  Given `localStorage.setItem`이 `QuotaExceededError`를 던지는 상황일 때
  When `addMeal(...)` 호출
  Then `{ ok: false, reason: "quota" }`를 반환하고 예외를 상위로 던지지 않는다
- AC-6 [E][P2]: Scenario: 오래된 데이터 정리
  Given 현재 월 기준 13개월 이전 레코드가 존재할 때
  When 앱 초기화 시 `pruneOldData()` 실행
  Then 13개월 초과 레코드는 `mbp.meals`에서 제거된다
- AC-7 [U][P1]: Scenario: 초기 빈 상태
  Given 모든 키가 없는 최초 실행일 때
  When `getBudget("2026-08")` 호출
  Then `null`을 반환한다(예외 없음)

---

### F2. 월 예산 설정 & 끼니별 허용 금액 계산
- **Description**: 사용자가 이번 달 식비 예산을 입력하면 남은 일수와 남은 끼니 수 기준으로 "오늘 이 끼니까지 쓸 수 있는 금액"을 자동 계산해 보여준다. 계산은 (남은 예산 ÷ 남은 끼니 수)로 하며 이미 기록한 오늘 식사는 차감한다.
- **Data**: Budget, MealRecord
- **API**: 없음
- **Requirements**:
- AC-1 [E][P0]: Scenario: 예산 최초 설정
  Given `2026-08` 예산이 없을 때
  When 예산 입력 폼에 `500000` 입력 후 저장
  Then `setBudget("2026-08", 500000)` 저장되고 "예산이 저장되었어요" 토스트 표시, 홈으로 이동한다
- AC-2 [U][P0]: Scenario: 끼니별 허용 금액 계산
  Given 예산 500000, 이번 달 남은 일수 10일, 오늘 남은 끼니 2끼(점심·저녁), 이번 달 총 남은 끼니 29끼, 이번 달 지출 350000일 때
  When 홈 화면 진입
  Then 남은 예산 `150000`을 남은 끼니 `29`로 나눈 `5,172원`을 "오늘 저녁까지 5,172원" 형태로 표시한다(1원 단위 내림)
- AC-3 [W][P1]: Scenario: 0원 예산 거부
  Given 예산 입력 폼일 때
  When `0` 입력 후 저장
  Then 에러 메시지 "예산을 1원 이상 입력해주세요" 표시, 저장되지 않는다
- AC-4 [W][P1]: Scenario: 최대값 초과 거부
  Given 예산 입력 폼일 때
  When `10000001` 입력 후 저장
  Then 에러 메시지 "최대 10,000,000원까지 설정할 수 있어요" 표시, 저장되지 않는다
- AC-5 [S][P1]: Scenario: 예산 미설정 빈 상태
  Given 이번 달 예산이 `null`일 때
  When 홈 화면 진입
  Then Asset.ContentIcon 빈 상태와 "이번 달 식비 예산을 설정해보세요" 문구, "예산 설정" 버튼을 표시한다
- AC-6 [W][P1]: Scenario: 남은 끼니 0 방어
  Given 남은 끼니 수가 0일 때(월말 마지막 끼니 이후)
  When 홈 화면 진입
  Then 0으로 나누지 않고 "이번 달 식사가 모두 끝났어요"를 표시한다(NaN/Infinity 미표시)
- AC-7 [S][P1]: Scenario: 예산 초과 인앱 경고
  Given 이번 달 지출이 예산의 100%를 초과했을 때
  When 홈 화면 진입
  Then 예산 카드에 `var(--tds-color-*)` 경고 색 배지 "예산 초과"와 초과 금액을 표시한다

---

### F3. 식사 기록 입력
- **Description**: 금액·끼니·카테고리(배달/외식/직접조리)·메모를 3탭 이내로 입력해 저장한다. 저장 즉시 홈의 남은 금액과 목록에 반영된다.
- **Data**: MealRecord
- **API**: 없음
- **Requirements**:
- AC-1 [E][P0]: Scenario: 식사 기록 성공
  Given 토스 로그인 유저가 기록 폼에 있을 때
  When `{ date: "2026-08-01", slot: "dinner", category: "delivery", amount: 15000, memo: "치킨" }` 제출
  Then `addMeal`으로 저장되고 "기록했어요" 토스트 표시, 홈 목록 최상단에 새 항목이 추가된다
- AC-2 [W][P1]: Scenario: 빈 금액 거부
  Given 기록 폼일 때
  When `{ category: "delivery", amount: 0, memo: "" }` 제출
  Then 에러 메시지 "금액을 입력해주세요" 표시, 저장되지 않는다
- AC-3 [W][P1]: Scenario: 카테고리 미선택 거부
  Given 기록 폼에서 금액 12000만 입력하고 카테고리 미선택일 때
  When 제출
  Then 에러 메시지 "카테고리를 선택해주세요" 표시, 저장되지 않는다
- AC-4 [W][P1]: Scenario: 메모 길이 초과
  Given 기록 폼일 때
  When 메모에 51자 입력
  Then 50자에서 입력이 잘리고 "최대 50자" 헬퍼 텍스트를 표시한다
- AC-5 [E][P1]: Scenario: 기록 삭제
  Given 목록에 레코드 1건이 있을 때
  When 항목 스와이프/삭제 후 AlertDialog "삭제할까요?"에서 확인
  Then 해당 레코드가 `mbp.meals`에서 제거되고 목록에서 사라진다
- AC-6 [S][P1]: Scenario: 목록 빈 상태
  Given 오늘 기록이 0건일 때
  When 홈 목록 영역 렌더
  Then Asset.ContentIcon과 "오늘 첫 식사를 기록해보세요" 문구를 표시한다
- AC-7 [U][P2]: Scenario: 긴 목록 스크롤
  Given 한 달 레코드가 90건 이상일 때
  When 전체 기록 목록 화면 진입
  Then 리스트는 세로 스크롤로 렌더되며 60fps 유지를 위해 30건 단위 점진 렌더(무한 스크롤)를 적용한다

---

### F4. 일일 체크인 & 페이스 배지
- **Description**: 오늘 식사를 1건 이상 기록하면 하루 1회 체크인이 가능하고, 배너 광고 노출 후 "이번 달 페이스" 배지(여유/양호/초과)를 지급한다. 배지는 현재 소비 페이스가 예산 대비 어느 구간인지 나타낸다.
- **Data**: CheckinLog, MealRecord, Budget
- **API**: 없음
- **Requirements**:
- AC-1 [E][P0]: Scenario: 체크인 성공 및 배지 지급
  Given 오늘 식사 기록이 1건 이상이고 오늘 체크인 이력이 없을 때
  When "오늘 체크인" 버튼 탭 → 배너 광고 노출 후
  Then 소비 페이스에 따라 `ahead|ontrack|over` 배지를 계산해 `mbp.checkins["2026-08-01"]`에 저장하고 배지 애니메이션을 표시한다
- AC-2 [S][P0]: Scenario: 하루 1회 제한
  Given 오늘 이미 체크인한 상태일 때
  When 홈 진입
  Then 체크인 버튼은 비활성 상태로 "오늘 체크인 완료"를 표시하고 재지급되지 않는다
- AC-3 [W][P1]: Scenario: 기록 없이 체크인 차단
  Given 오늘 식사 기록이 0건일 때
  When "오늘 체크인" 버튼 탭
  Then 에러 토스트 "먼저 오늘 식사를 기록해주세요" 표시, 체크인되지 않는다
- AC-4 [U][P0]: Scenario: 페이스 배지 산정
  Given 예산 500000, 오늘이 이번 달 15일차(총 31일), 현재 지출 200000일 때
  When 배지 계산
  Then 예상 소비 페이스(200000 / (15/31) ≈ 413333 < 500000)이므로 `ahead` 배지를 부여한다
- AC-5 [W][P1]: Scenario: 광고 로드 실패 시 지급
  Given 배너 광고 로드가 실패한 상황일 때
  When 체크인 진행
  Then 광고 실패와 무관하게 배지는 정상 지급되고 "광고를 불러오지 못했어요" 토스트만 표시한다(체크인 성공)
- AC-6 [S][P1]: Scenario: 체크인 로딩 상태
  Given 체크인 버튼 탭 직후 처리 중일 때
  When 배지 계산/저장 진행
  Then 버튼은 로딩 스피너 표시 및 중복 탭 방지를 위해 비활성화된다

---

### F5. 주간 소비 패턴 분석 (리워드 광고 게이팅)
- **Description**: 최근 7일간 배달/외식/직접조리 지출 비율을 도넛 시각화와 수치로 보여준다. 결과 화면 진입 전 리워드 광고를 시청해야 분석 결과가 공개된다.
- **Data**: MealRecord
- **API**: 없음
- **Requirements**:
- AC-1 [E][P0]: Scenario: 결과 보기 전 리워드 광고
  Given 사용자가 분석 탭에서 "주간 분석 보기" 버튼 탭
  When `TossRewardAd` 광고 시청 완료
  Then 최근 7일 카테고리 비율 도넛과 합계가 표시된다
- AC-2 [U][P0]: Scenario: 카테고리 비율 계산
  Given 최근 7일 지출이 배달 60000, 외식 30000, 직접조리 10000일 때
  When 분석 결과 렌더
  Then 배달 `60%`, 외식 `30%`, 직접조리 `10%`로 표시하고 총합 `100000원`을 강조 타이포로 표시한다
- AC-3 [W][P1]: Scenario: 광고 미완료 시 미공개
  Given 사용자가 리워드 광고를 중간에 닫았을 때
  When 광고 종료 콜백 수신
  Then 결과는 공개되지 않고 "광고를 끝까지 봐야 결과를 볼 수 있어요" 토스트와 재시도 버튼을 표시한다
- AC-4 [S][P1]: Scenario: 데이터 부족 빈 상태
  Given 최근 7일 기록이 0건일 때
  When 분석 화면 진입
  Then 광고 없이 Asset.ContentIcon과 "분석할 식사 기록이 아직 없어요" 문구를 표시한다
- AC-5 [S][P1]: Scenario: 분석 로딩 상태
  Given 광고 시청 완료 직후 집계 중일 때
  When 결과 계산 진행
  Then 도넛 영역에 TDS 스켈레톤/로딩 인디케이터를 표시한다
- AC-6 [U][P1]: Scenario: 결과 레이아웃 계약
  Given 분석 결과가 표시될 때
  Then Result 화면은 `data-testid="donut-card"` Card 1개와 `data-testid="category-legend"` 범례를 가지며 총액을 t2 타이포로 강조한다

---

### F6. 월간 식비 절약 시뮬레이션 (AI + 리워드 광고)
- **Description**: 최근 소비 패턴을 기반으로 배달 비중을 줄였을 때의 월간 절약 가능 금액을 규칙 기반으로 계산하고, 생성형 AI 코멘트로 실천 팁을 제공한다. 결과 공개 전 리워드 광고 시청이 필요하며 AI 고지 의무를 준수한다.
- **Data**: MealRecord, Budget, AppFlags
- **API**: `POST /simulate` (외부 API 서버, 아래 API Contract 참조)
- **Requirements**:
- AC-1 [E][P0]: Scenario: AI 서비스 첫 이용 고지
  Given 사용자가 시뮬레이션 기능을 처음 사용할 때
  When 시뮬레이션 진입
  Then "이 서비스는 생성형 AI를 활용합니다" 안내 다이얼로그가 1회 표시되고, 확인 탭 시 `mbp.flags.aiNoticeAcknowledged = true`로 저장된다
- AC-2 [E][P0]: Scenario: 리워드 광고 후 결과 공개
  Given AI 고지를 확인한 사용자가 "절약액 보기" 버튼 탭
  When `TossRewardAd` 광고 시청 완료
  Then `POST /simulate` 응답의 `monthlySaving`이 SummaryHero(CountUp)로 표시된다
- AC-3 [U][P0]: Scenario: AI 결과물 라벨 표시
  Given AI 절약 시뮬레이션 결과가 화면에 표시될 때
  Then 결과 카드 상단 또는 하단에 "AI가 생성한 결과입니다" 배지가 표시된다
- AC-4 [W][P1]: Scenario: API 오류 처리
  Given `POST /simulate`가 `500 { error: "internal_error" }`를 반환할 때
  When 결과 요청
  Then "결과를 불러오지 못했어요. 다시 시도해주세요" 토스트와 재시도 버튼을 표시하고 앱은 크래시하지 않는다
- AC-5 [W][P1]: Scenario: 네트워크/CORS 오류
  Given 네트워크 오프라인 또는 요청 실패일 때
  When 결과 요청
  Then "네트워크 연결을 확인해주세요" 토스트를 표시하고, 외부 도메인은 CORS 허용된 API 서버로만 호출한다(콘솔 에러 0개)
- AC-6 [S][P1]: Scenario: 결과 로딩 상태
  Given 광고 시청 완료 후 API 응답 대기 중일 때
  When 요청 진행
  Then 결과 카드 자리에 TDS 로딩 인디케이터를 표시하고 버튼 재탭을 차단한다
- AC-7 [S][P1]: Scenario: 데이터 부족 안내
  Given 최근 30일 기록이 5건 미만일 때
  When 시뮬레이션 진입
  Then "정확한 분석을 위해 식사를 5번 이상 기록해주세요" 안내를 표시하고 광고/요청을 진행하지 않는다
- AC-8 [U][P1]: Scenario: 결과 레이아웃 계약
  Given 시뮬레이션 결과가 표시될 때
  Then Result 화면은 `data-testid="saving-hero"` SummaryHero와 `data-testid="ai-tip-card"` Card, "AI가 생성한 결과입니다" 배지를 가진다

---

### F7. 홈 대시보드 & 네비게이션
- **Description**: 앱 진입 화면으로 오늘 남은 허용 금액, 이번 달 예산 진행률, 오늘 기록 목록, 체크인 버튼을 한 화면에 모아 보여준다. 하단 FloatingTabBar로 홈/기록/분석 화면을 전환한다.
- **Data**: Budget, MealRecord, CheckinLog
- **API**: 없음
- **Requirements**:
- AC-1 [U][P0]: Scenario: 대시보드 핵심 지표 표시
  Given 예산과 오늘 기록이 있을 때
  When 홈 진입
  Then "오늘 남은 허용 금액", "이번 달 예산 진행률(%)", "오늘 기록 목록"을 각각 Card로 묶어 표시한다
- AC-2 [E][P0]: Scenario: 기록 화면 이동
  Given 홈 화면일 때
  When "식사 기록" 버튼 탭
  Then `navigate('/record')`로 이동한다
- AC-3 [U][P1]: Scenario: 진행률 시각화
  Given 예산 500000, 지출 350000일 때
  When 홈 렌더
  Then 진행률 `70%`를 MiniBar/게이지로 표시하고 남은 금액 `150000원`을 t3 타이포로 표시한다
- AC-4 [S][P1]: Scenario: 최초 진입 로딩
  Given localStorage 읽기 진행 중일 때
  When 홈 마운트
  Then 각 Card 자리에 TDS 스켈레톤을 표시한다
- AC-5 [S][P1]: Scenario: 완전 초기 상태
  Given 예산·기록이 모두 없을 때
  When 홈 진입
  Then 예산 설정 유도 빈 상태만 표시하고 진행률/목록 Card는 렌더하지 않는다
- AC-6 [W][P0]: Scenario: 외부 도메인 이탈 금지
  Given 앱 내 모든 버튼/링크일 때
  When 탭
  Then `window.location.href`/`window.open`으로 외부 URL 이동을 하지 않고 앱 내 라우팅만 수행한다
- AC-7 [U][P1]: Scenario: 대시보드 레이아웃 계약
  Given 홈 화면이 표시될 때
  Then 홈은 ScreenScaffold로 감싸고 `data-testid="budget-card"`, `data-testid="today-list"` 요소를 가지며 1차 액션 버튼은 하단 고정(SubmitFooter 또는 display="block")으로 배치한다

---

## Screen Definitions

### S1. 홈 대시보드 — `/`
- **TDS 컴포넌트**: ScreenScaffold, Top(타이틀), Card(예산/진행률/오늘목록), Paragraph.Text, Chip(페이스 배지), Button(체크인·기록 이동, display="block"), ListRow(오늘 기록), MiniBar(진행률), Spacing, Toast
- **광고**: 없음(체크인 시 배너는 F4 흐름). 콘텐츠 사이 배너는 배치하지 않음.
- **상태**: Loading = Card 스켈레톤 / Empty = 예산 미설정 유도(Asset.ContentIcon) / Error = 데이터 파싱 실패 시 "데이터를 불러오지 못했어요" Toast
- **터치**: 체크인·기록 버튼 높이 ≥ 48px, ListRow 항목 ≥ 44px
- **Navigation 계약**:
  - Outgoing: 식사 기록 버튼 → `navigate('/record')`; 예산 설정 → `navigate('/budget')`; 전체 기록 → `navigate('/records')`; 분석 탭 → `navigate('/analysis')`
  - Incoming: `location.state = null`
- **Layout 계약**: ScreenScaffold 골격, 3개 Card 위계(예산 t3 강조 / 진행률 MiniBar / 오늘 목록 ListRow), 1차 액션 하단 고정. `data-testid="budget-card"`, `data-testid="today-list"`

### S2. 예산 설정 — `/budget`
- **TDS 컴포넌트**: ScreenScaffold, Top, TextField(숫자 키패드), Paragraph.Text(헬퍼/에러), Button(저장, SubmitFooter), Toast
- **상태**: Loading = 저장 중 버튼 스피너 / Empty = 최초 입력 안내 / Error = 검증 실패 헬퍼 텍스트
- **키보드**: TextField `inputMode="numeric"`, 키보드 상승 시 SubmitFooter 버튼이 가려지지 않도록 스크롤 보정
- **터치**: 저장 버튼 ≥ 48px
- **Navigation 계약**:
  - Outgoing: 저장 완료 → `navigate('/', { replace: true })`
  - Incoming: `location.state = { editMode?: boolean } | null`
- **Layout 계약**: 입력 1개 + 하단 고정 저장 버튼. 에러는 TextField 하단 헬퍼로 표시.

### S3. 식사 기록 입력 — `/record`
- **TDS 컴포넌트**: ScreenScaffold, Top, Tab 또는 Chip(끼니·카테고리 선택), TextField(금액·메모), Button(저장, SubmitFooter), Toast, AlertDialog(취소 확인)
- **상태**: Loading = 저장 중 스피너 / Empty = N/A(입력 화면) / Error = 필드별 검증 에러 텍스트
- **키보드**: 금액 TextField `inputMode="numeric"`, 메모 50자 카운터, 키보드 위 SubmitFooter 유지
- **터치**: Chip ≥ 44px, 저장 버튼 ≥ 48px
- **Navigation 계약**:
  - Outgoing: 저장 완료 → `navigate('/', { replace: true })`
  - Incoming: `location.state = { date?: string } | null` (기본값 오늘)
- **Layout 계약**: 끼니·카테고리 Chip 그룹 → 금액/메모 TextField → 하단 고정 저장.

### S4. 전체 기록 목록 — `/records`
- **TDS 컴포넌트**: ScreenScaffold, Top, ListRow(날짜·카테고리·금액), Chip(카테고리 필터), AlertDialog(삭제), Spacing
- **상태**: Loading = 리스트 스켈레톤 / Empty = "기록이 없어요"(Asset.ContentIcon) / Error = Toast
- **스크롤**: 30건 단위 무한 스크롤(90건+ 대응)
- **터치**: ListRow ≥ 44px
- **Navigation 계약**:
  - Outgoing: 뒤로 → `navigate(-1)`
  - Incoming: `location.state = null`
- **Layout 계약**: 상단 카테고리 Chip 필터 + 스크롤 리스트. `data-testid="records-list"`

### S5. 주간 분석 — `/analysis`
- **TDS 컴포넌트**: ScreenScaffold, Top, Button("주간 분석 보기", display="block"), Card(도넛), Paragraph.Text(범례/총액 t2), Spacing, Toast + 템플릿 `<TossRewardAd>`
- **광고**: 리워드 게이트로 결과 감쌈. 배너 없음.
- **상태**: Loading = 도넛 스켈레톤 / Empty = 기록 부족 안내(광고 미진행) / Error = "광고를 끝까지 봐야 결과를 볼 수 있어요" Toast + 재시도
- **터치**: 분석 보기 버튼 ≥ 48px
- **Navigation 계약**:
  - Outgoing: 없음(동일 화면 내 게이팅)
  - Incoming: `location.state = null`
- **Layout 계약**: 결과는 Card로 묶음, 총액 t2 강조. `data-testid="donut-card"`, `data-testid="category-legend"`

### S6. 절약 시뮬레이션 — `/simulate`
- **TDS 컴포넌트**: ScreenScaffold, Top, AlertDialog(AI 사전 고지), Button("절약액 보기", display="block"), SummaryHero(CountUp), Card(AI 팁), Chip/Badge("AI가 생성한 결과입니다"), Toast + 템플릿 `<TossRewardAd>`
- **광고**: 리워드 게이트로 결과 감쌈. 결과 하단에 배너 `<AdSlot>` 1개(콘텐츠 겹침 없이 결과 아래).
- **상태**: Loading = 결과 카드 로딩 인디케이터(API 대기) / Empty = 기록 5건 미만 안내 / Error = API/네트워크 Toast + 재시도
- **터치**: 절약액 보기 버튼 ≥ 48px
- **Navigation 계약**:
  - Outgoing: 없음(동일 화면 내 게이팅)
  - Incoming: `location.state = null`
- **Layout 계약**: `data-testid="saving-hero"` SummaryHero + `data-testid="ai-tip-card"` Card + AI 배지. 절약액은 히어로 강조.

### 공통 네비게이션
- **FloatingTabBar**(템플릿): 홈 `/`, 분석 `/analysis`, 기록 `/records` 3탭. 탭 높이 ≥ 48px.

---

## API Contract

> 외부 API는 F6 절약 시뮬레이션의 AI 코멘트 생성에만 사용. 별도 Railway 배포 서버, CORS 허용 필수. 규칙 기반 절약액 계산은 클라이언트에서, AI 코멘트만 서버에서 생성.

### POST /simulate
**Request**
```ts
interface SimulateRequest {
  month: string;                    // "2026-08"
  totalBudget: number;              // 500000
  spentByCategory: {
    delivery: number;               // 200000
    dining_out: number;             // 120000
    home_cooked: number;            // 30000
  };
  recordCount: number;              // 최근 30일 기록 수, >= 5
}
```

**Response 200**
```ts
interface SimulateResponse {
  monthlySaving: number;            // 절약 가능 금액(원) 48000
  targetDeliveryRatio: number;      // 권장 배달 비중(%) 30
  aiComment: string;                // AI 생성 실천 팁 텍스트
  generatedByAI: true;              // 항상 true
}
```

**Errors** (통일 shape `{ error: string }`)
| code | error | 설명 |
|---|---|---|
| 400 | `"invalid_request"` | 필드 누락/타입 오류/`recordCount < 5` |
| 429 | `"rate_limited"` | 요청 과다 |
| 500 | `"internal_error"` | 서버/모델 오류 |

```ts
interface ApiError { error: string; }
```

---

## Assumptions
- 토스 세션이 자동 제공되어 별도 로그인 흐름은 없다. 유저별 데이터 격리는 기기 localStorage 범위로 한정한다(다기기 동기화 미지원).
- "월 남은 끼니 수"는 오늘 남은 끼니 + 남은 일수 × 3으로 계산하며, 하루 3끼(아침·점심·저녁)를 가정한다.
- 페이스 배지 구간: `ahead`(예상 페이스 < 예산 95%), `ontrack`(95~105%), `over`(> 105%).
- 절약액 규칙 기반 계산은 클라이언트에서 수행하고, 서버는 자연어 팁 문장만 생성한다.
- 광고/IAP/슬롯 ID는 앱인토스 콘솔에서 발급되어 env로 주입된다.
- 예산 초과 알림은 MVP에서 푸시가 아닌 홈 인앱 경고 배지(F2 AC-7)로 대체한다.

## Open Questions
- PRD의 "예산 초과 경고 푸시(토스 인앱 알림)"를 MVP 범위에 포함할지 — 현재는 인앱 배너로 대체. 푸시 필요 시 별도 스코프 확장 필요.
- AI 코멘트 생성 서버(외부 API)를 실제 배포할지, 아니면 MVP에서 AI 코멘트 없이 규칙 기반 절약액만 표시할지(후자면 F6의 AI 고지·`POST /simulate`·외부 API 계약 전부 제거 가능).
- 도넛차트를 TDS 미제공 시 커스텀 SVG로 구현할지, MiniBar 조합으로 대체할지.
- 프로모션 리워드(`grantPromotionReward`) 캠페인을 이 앱에 붙일지 여부 — 현재 스펙에는 미포함(붙일 경우 amount ≤ 5,000 검증 AC 추가 필요).