// 단일 데이터 배럴 — 모든 페이지/컴포넌트는 데이터 접근 시 오직 이 모듈만 import한다.
// (직접 @/lib/store·@/lib/storage·@/lib/calc·@/lib/types 참조 금지 — packet heal-2-02 계약)

// 반응형 스토어(Provider + 훅) — 트리 최상위 1곳(App)에서만 마운트한다.
export { AppDataProvider, useAppData } from "@/lib/store";

// 순수 데이터 함수(예산/기록/체크인/플래그 + 파생 계산)
export * from "./store";

// 페이지 파생 계산에 쓰이는 유틸(카테고리 비중, 소비 페이스 배지)
export { getSpentByCategory, calcPaceBadge } from "@/lib/calc";

export type {
  Budget,
  MealRecord,
  CheckinLog,
  AppFlags,
  MealSlot,
  MealCategory,
  SaveResult,
  SimulateRequest,
  SimulateResponse,
} from "./types";
