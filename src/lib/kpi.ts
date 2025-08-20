export type Trend = 'up' | 'down' | 'neutral';

export function calculateTrend(current: number, previous: number): { change: number; trend: Trend } {
  const diff = current - previous;
  const change = previous !== 0 ? diff / previous : 0;
  let trend: Trend = 'neutral';
  if (change > 0) {
    trend = 'up';
  } else if (change < 0) {
    trend = 'down';
  }
  return { change, trend };
}

export function formatChange(change: number): string {
  const percent = (change * 100).toFixed(1);
  const sign = change > 0 ? '+' : '';
  return `${sign}${percent}%`;
}
