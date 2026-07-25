export function parseCommand(input) {
  const trimmed = (input || '').trim();
  if (!trimmed) return { type: 'noop' };

  const lower = trimmed.toLowerCase();

  if (lower === 'help' || lower === '?') {
    return { type: 'help' };
  }

  const navMatch = lower.match(
    /^go\s+(dashboard|terminal|watchlist|portfolio|journal|scorecard|scorecard-library|screener|alerts|settings)$/,
  );
  if (navMatch) {
    const page = navMatch[1] === 'scorecard' ? 'scorecard' : navMatch[1];
    return { type: 'nav', page };
  }

  const watchMatch = trimmed.match(/^watch\s+([A-Za-z0-9.]+)$/i);
  if (watchMatch) {
    return { type: 'watch', symbol: watchMatch[1].toUpperCase() };
  }

  const buyMatch = trimmed.match(/^buy\s+([A-Za-z0-9.]+)\s+(\d+)$/i);
  if (buyMatch) {
    return {
      type: 'order',
      side: 'BUY',
      symbol: buyMatch[1].toUpperCase(),
      qty: parseInt(buyMatch[2], 10),
    };
  }

  const sellMatch = trimmed.match(/^sell\s+([A-Za-z0-9.]+)\s+(\d+)$/i);
  if (sellMatch) {
    return {
      type: 'order',
      side: 'SELL',
      symbol: sellMatch[1].toUpperCase(),
      qty: parseInt(sellMatch[2], 10),
    };
  }

  if (/^[A-Za-z0-9.]{1,12}$/.test(trimmed)) {
    return { type: 'symbol', symbol: trimmed.toUpperCase() };
  }

  return { type: 'unknown', raw: trimmed };
}
