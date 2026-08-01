export function formatKRW(amount: number): string {
  const clamped = Math.max(Math.floor(amount), 0);
  return `${new Intl.NumberFormat('ko-KR').format(clamped)}원`;
}
