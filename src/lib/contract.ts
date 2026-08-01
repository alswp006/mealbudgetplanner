/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

/** 거래 기록 엔티티, 모든 페이지에서 참조 (구현: 패킷 0001) */
export type Transaction = { id: string; date: string; amountKrw: number };

/** 예산 설정, 모든 페이지에서 참조 (구현: 패킷 0001) */
export type Budget = { monthlyLimitKrw: number };

/** 라우팅 상태 타입, App.tsx + 페이지 간 전달 (구현: 패킷 0001) */
export type RouteState = 'home' | 'budget' | 'record' | 'stats' | 'simulation';

/** 금액 표시 (₩12,300 형식), 모든 페이지에서 사용 (구현: 패킷 0003) */
export type formatAmountFn = (amount: number) => string;

/** 날짜 포맷 (8월 2일), 거래 목록 표시 (구현: 패킷 0003) */
export type formatDateFn = (date: string) => string;

/** 남은 예산 계산, HomePage + 통계 페이지 (구현: 패킷 0003) */
export type calculateRemainingFn = (spent: number, limit: number) => number;

/** 초과 여부 체크, OverBudgetAlert 컴포넌트 (구현: 패킷 0003) */
export type isOverBudgetFn = (spent: number, limit: number) => boolean;

/** 예산 상태 훅, 0005/0006/0010에서 사용 (구현: 패킷 0004) */
export type useBudgetStoreFn = () => { budget: Budget | null; setBudget(budget: Budget): void };

/** 거래 목록 상태 훅, 0008/0009/홈대시 컴포넌트에서 사용 (구현: 패킷 0004) */
export type useTransactionStoreFn = () => { transactions: Transaction[]; addTransaction(transaction: Transaction): void; removeTransaction(id: string): void };
