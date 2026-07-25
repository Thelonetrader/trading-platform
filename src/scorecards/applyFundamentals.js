import { SECTORS } from './model';

/** Clamp IB ratio values into scorecard slider ranges (skips select metrics). */
export function applyFundamentalsToSector(sectorId, currentValues, metrics) {
  const sector = SECTORS[sectorId];
  if (!sector || !metrics) return currentValues;

  const next = { ...currentValues };
  for (const m of sector.metrics) {
    if (m.type === 'select') continue;
    const raw = metrics[m.id];
    if (raw == null || Number.isNaN(Number(raw))) continue;
    let v = Number(raw);
    v = Math.min(m.max, Math.max(m.min, v));
    const decimals = m.step != null && m.step < 1 ? 2 : m.step < 0.1 ? 2 : 1;
    next[m.id] = parseFloat(v.toFixed(decimals));
  }
  return next;
}

export function countAppliedMetrics(sectorId, metrics) {
  const sector = SECTORS[sectorId];
  if (!sector || !metrics) return 0;
  return sector.metrics.filter((m) => m.type !== 'select' && metrics[m.id] != null).length;
}
