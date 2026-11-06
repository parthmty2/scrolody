export function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(total / 3600);
  const minutes = String(Math.floor(total / 60) % 60);
  const remainder = String(total % 60).padStart(2, '0');
  return hours ? `${hours}:${minutes.padStart(2, '0')}:${remainder}` : `${minutes}:${remainder}`;
}
