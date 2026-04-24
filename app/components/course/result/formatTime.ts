export function formatTimeRange(timeStart: string, durationMin: number): string {
  const [h, m] = timeStart.split(':').map(Number);
  const endTotal = h * 60 + m + durationMin;
  const endH = Math.floor(endTotal / 60);
  const endM = endTotal % 60;
  return `${timeStart} ~ ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}
