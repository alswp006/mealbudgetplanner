/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

export type Record = { id: string; date: string; amountKrw: number };

export type Budget = { id: string; month: string; limitKrw: number };

export type RouteState = 'home' | 'budget' | 'record' | 'stats' | 'simulation';

export type saveRecordFn = (record: Record) => Promise<void>;

export type loadRecordsFn = (month?: string) => Promise<Record[]>;

export type deleteRecordFn = (id: string) => Promise<void>;

export type saveBudgetFn = (budget: Budget) => Promise<void>;

export type loadBudgetFn = (month: string) => Promise<Budget | null>;

export type formatAmountKrwFn = (amount: number) => string;

export type calculateMonthlySpentFn = (records: Record[]) => number;

export type calculateRemainingFn = (limit: number, spent: number) => number;

export type isOverBudgetFn = (spent: number, limit: number) => boolean;

export type useRecordsFn = () => { records: Record[]; addRecord: (r: Record) => Promise<void>; deleteRecord: (id: string) => Promise<void> };

export type useBudgetFn = () => { budget: Budget | null; setBudget: (b: Budget) => Promise<void> };

export type useAppStateFn = () => { currentRoute: RouteState; navigate: (route: RouteState) => void };

export type RewardType = 'unlock-simulation' | 'bonus-points';

export type isRewardUnlockedFn = (type: RewardType) => boolean;

export type grantRewardFn = (type: RewardType) => Promise<void>;
