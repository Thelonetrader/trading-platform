const POSITIVE = [
  'beat',
  'beats',
  'surge',
  'soar',
  'jump',
  'rally',
  'upgrade',
  'upgraded',
  'bullish',
  'record',
  'growth',
  'strong',
  'profit',
  ' gains',
  'gain ',
  'outperform',
  'buy rating',
  'raises',
  'raised',
  'positive',
];

const NEGATIVE = [
  'miss',
  'misses',
  'fall',
  'falls',
  'drop',
  'plunge',
  'slump',
  'downgrade',
  'downgraded',
  'bearish',
  'loss',
  'losses',
  'cut',
  'cuts',
  'warning',
  'lawsuit',
  'investigation',
  'decline',
  'weak',
  'underperform',
  'sell rating',
  'negative',
  'layoff',
  'layoffs',
];

/** @returns {{ score: number, label: 'Bullish'|'Bearish'|'Neutral' }} score -1..1 */
function scoreSentiment(text) {
  const t = (text || '').toLowerCase();
  if (!t.trim()) return { score: 0, label: 'Neutral' };

  let pos = 0;
  let neg = 0;
  for (const w of POSITIVE) if (t.includes(w)) pos += 1;
  for (const w of NEGATIVE) if (t.includes(w)) neg += 1;

  const raw = pos - neg;
  if (raw >= 2) return { score: Math.min(1, raw / 6), label: 'Bullish' };
  if (raw <= -2) return { score: Math.max(-1, raw / 6), label: 'Bearish' };
  if (raw === 1) return { score: 0.25, label: 'Neutral' };
  if (raw === -1) return { score: -0.25, label: 'Neutral' };
  return { score: 0, label: 'Neutral' };
}

module.exports = { scoreSentiment };
