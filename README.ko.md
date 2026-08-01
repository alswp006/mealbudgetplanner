🇰🇷 [English](./README.md)

# MealBudgetPlanner

앱인토스(App-in-Toss) (Vite + React + TDS) 기반 식비 관리 앱입니다. 한 달 식비 예산을 입력하면 끼니별 허용 금액과 소비 패턴 피드백을 매일 제공합니다. 월급날 세운 식비 예산도 월말에는 항상 초과하게 됩니다. 배달앱 내역은 여러 곳에 흩어져 있고, 한 끼에 얼마를 써야 예산 내에 있는지 실시간으로 알기 어렵습니다.

## 기술 스택

- React 18.0.0
- TypeScript
- Vitest

## 라우트

| 경로 | 설명 |
|------|-------------|
| `/BudgetPage` | 예산 페이지 |
| `/Home` | 홈 |
| `/RecordPage` | 기록 페이지 |
| `/SimulationPage` | 시뮬레이션 페이지 |
| `/StatsPage` | 통계 페이지 |

## 시작하기

```bash
pnpm install
pnpm dev
```

## 개발

```bash
pnpm typecheck    # 타입 검사
pnpm test         # 테스트 실행
pnpm build        # 프로덕션 빌드
```

## 설계 문서

`.ai-factory/` 디렉토리에서 전체 설계 산출물을 확인하세요:
- `prd.md` — 제품 요구사항 문서
- `spec.md` — 기술 명세서
- `task.md` — 에픽/작업 분류

---
Built with [AI Factory](https://github.com/alswp006/ai-factory) · Last synced: 2026-08-01
