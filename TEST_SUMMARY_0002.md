# Test Summary — packet-0002: localStorage 저장소 헬퍼 (TDD)

## Status
✅ **Tests Written**: 20 tests in `src/__tests__/packet-0002.test.ts` (453 LOC)  
🔴 **Expected Test Status**: All 20 tests FAIL (TDD — implementation not yet created)

---

## Acceptance Criteria Coverage

### AC-1: Key Missing → Empty Array
- ✓ `AC-1: 키 부재 시 getMeals() 빈 배열 반환`

### AC-2 (Happy Path): Valid Meal Save with Auto-Generated Fields
- ✓ `AC-2 (happy path): 유효한 MealRecord 저장 성공 및 배열 맨 앞에 추가`
- ✓ `AC-2 (happy path): 여러 기록 추가 시 최신순으로 배열 맨 앞에 추가`
- ✓ `추가: 메모가 40자를 초과하면 40자로 클램프되어 저장`
- ✓ `addMeal: id는 유효한 UUID 형식 (또는 polyfill)`

### AC-2 (Error Path): Corrupted JSON Recovery
- ✓ `AC-2 (error): 손상된 JSON 값 시 getBudget null 반환 + console.error 출력 없음`
- ✓ `AC-2 (error): 손상된 JSON 복구 후 키 리셋 (다음 조회 시 기본값 반환)`

### AC-3: QuotaExceededError Handling
- ✓ `AC-3: QuotaExceededError 시 addMeal {ok:false, reason:'QUOTA'} 반환`

### AC-4: Invalid Amount Rejection
- ✓ `AC-4: amount 0 시 addMeal {ok:false, reason:'INVALID_AMOUNT'} 반환`
- ✓ `AC-4: amount -500 (음수) 시 addMeal {ok:false, reason:'INVALID_AMOUNT'} 반환`
- ✓ `AC-4: amount 1000000 (상한 초과) 시 addMeal {ok:false, reason:'INVALID_AMOUNT'} 반환`
- ✓ `AC-4: 유효한 범위 경계 amount 1 ~ 999,999 저장 성공`

---

## Additional CRUD Functions Tested

### Budget Storage
- ✓ `getBudget: 키 부재 시 null 반환`
- ✓ `setBudget: 유효한 예산 저장 성공`

### Daily Check-ins
- ✓ `getCheckIns: 키 부재 시 빈 배열 반환`
- ✓ `addCheckIn: 유효한 체크인 저장 성공 및 createdAt 자동 생성`

### App Flags
- ✓ `getFlags: 키 부재 시 기본값 반환 (onboardingSeen: false, lastSimulationDate: '')`
- ✓ `setFlags: 유효한 플래그 저장 성공`

### Utility: safeParse
- ✓ `safeParse: 유효한 JSON 파싱 성공`
- ✓ `safeParse: 파싱 실패 시 fallback 반환 + 키 리셋`

---

## Test Quality Checklist

| Criterion | Status | Details |
|-----------|--------|---------|
| **Each AC ≥1 test** | ✅ | 4 main ACs + 16 additional coverage tests |
| **Happy path included** | ✅ | All CRUD functions tested with valid inputs |
| **Error cases included** | ✅ | QuotaExceededError, corrupted JSON, invalid amounts |
| **Boundary values tested** | ✅ | 0, -500, 1000000 (invalid); 1, 999999 (valid) |
| **Edge cases** | ✅ | 40-char memo clamp, JSON corruption recovery, UUID generation |
| **console.error spy** | ✅ | Corruption recovery verified without logging |
| **Concrete assertions** | ✅ | No meaningless `.toBeTruthy()` — specific values checked |
| **Business logic focused** | ✅ | Pure functions, no UI mocks needed |
| **localStorage isolation** | ✅ | vitest.setup.ts auto-clears before each test |

---

## Exports to Implement (src/lib/storage.ts)

### Primary CRUD Functions
```typescript
export function getMeals(): MealRecord[]
export function addMeal(input: Omit<MealRecord, 'id' | 'createdAt'>): WriteResult
export function getBudget(month: string): MonthlyBudget | null
export function setBudget(month: string, budget: MonthlyBudget): WriteResult
export function getCheckIns(): DailyCheckIn[]
export function addCheckIn(input: Omit<DailyCheckIn, 'createdAt'>): WriteResult
export function getFlags(): AppFlags
export function setFlags(flags: AppFlags): WriteResult
```

### Internal Utility
```typescript
function safeParse<T>(key: string, fallback: T): T
```

---

## Implementation Requirements (from Test Assertions)

### getMeals()
- Key `mbp_meals_v1`: `MealRecord[]`
- Missing key → return `[]`
- Latest records first (push to front, not append)

### addMeal(input)
- Auto-generate `id` via `crypto.randomUUID()` (with fallback for older browsers)
- Auto-generate `createdAt` as `Date.now()`
- Clamp `memo` to 40 chars max
- Validate `amount`: must be integer ≥1 and ≤999,999
  - Invalid amount → return `{ok: false, reason: 'INVALID_AMOUNT'}`
- Catch `QuotaExceededError` (localStorage full)
  - → return `{ok: false, reason: 'QUOTA'}`, do not throw
- Save to `mbp_meals_v1` at array front
- Success → return `{ok: true}`

### getBudget(month: string)
- Key: `mbp_budget_v1[month]` (stored as `Record<string, MonthlyBudget>`)
- Missing key → return `null`
- Corrupted JSON → parse error caught, key removed, return `null` (no console.error)

### setBudget(month, budget)
- Save to `mbp_budget_v1[month]`
- Catch `QuotaExceededError`
- Success → return `{ok: true}`

### getCheckIns()
- Key: `mbp_checkins_v1`: `DailyCheckIn[]`
- Missing key → return `[]`

### addCheckIn(input)
- Auto-generate `createdAt` as `Date.now()`
- Save to `mbp_checkins_v1` (probably latest first)
- Success → return `{ok: true}`

### getFlags()
- Key: `mbp_flags_v1`: `AppFlags`
- Missing key → return default `{onboardingSeen: false, lastSimulationDate: ''}`

### setFlags(flags)
- Save full `AppFlags` object to `mbp_flags_v1`
- Success → return `{ok: true}`

### safeParse<T>(key, fallback)
- Read key from localStorage
- Attempt `JSON.parse()`
- On success → return parsed value as `T`
- On error → `removeItem(key)` to clean up, return `fallback`
- No `console.error` logging

---

## Running the Tests

```bash
# Run all tests
npx vitest run src/__tests__/packet-0002.test.ts

# Watch mode (during development)
npx vitest src/__tests__/packet-0002.test.ts
```

All tests should **FAIL** until `src/lib/storage.ts` is implemented by the Coder.
