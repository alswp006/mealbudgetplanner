🇺🇸 [한국어](./README.ko.md)

# MealBudgetPlanner

An App-in-Toss (Vite + React + TDS) meal budget management app. Enter your monthly meal budget and get daily allowances per meal and consumption pattern feedback. Even when you plan a budget on payday, you always overspend by month-end. Delivery app transactions are scattered, and you don't know in real-time how much you can spend per meal to stay within budget.

## Tech Stack

- React 18.0.0
- TypeScript
- Vitest

## Routes

| Path | Description |
|------|-------------|
| `/BudgetPage` | BudgetPage |
| `/Home` | Home |
| `/RecordPage` | RecordPage |
| `/SimulationPage` | SimulationPage |
| `/StatsPage` | StatsPage |

## Getting Started

```bash
pnpm install
pnpm dev
```

## Development

```bash
pnpm typecheck    # Type checking
pnpm test         # Run tests
pnpm build        # Production build
```

## Design Documents

See `.ai-factory/` directory for full design artifacts:
- `prd.md` — Product Requirements Document
- `spec.md` — Technical Specification
- `task.md` — Epic/Task Breakdown

---
Built with [AI Factory](https://github.com/alswp006/ai-factory) · Last synced: 2026-08-01
