export function normalizeTicker(sym) {
  return (sym || '').trim().toUpperCase();
}

export function quoteForSymbol(quotes, sym) {
  if (!quotes || !sym) return undefined;
  return quotes[normalizeTicker(sym)];
}

/** Best available price for display when IB last is missing. */
export function displayPrice(q) {
  if (!q) return null;
  const last = validPrice(q.last);
  if (last != null) return last;
  const bid = validPrice(q.bid);
  const ask = validPrice(q.ask);
  if (bid != null && ask != null) return (bid + ask) / 2;
  if (bid != null) return bid;
  if (ask != null) return ask;
  return validPrice(q.close);
}

export function displayChangePct(q) {
  if (!q) return null;
  if (q.changePct != null && Number.isFinite(q.changePct)) return q.changePct;
  const last = displayPrice(q);
  const close = validPrice(q.close);
  if (last != null && close != null && close !== 0) {
    return ((last - close) / close) * 100;
  }
  return null;
}

function validPrice(n) {
  if (n == null || Number.isNaN(Number(n))) return null;
  const v = Number(n);
  if (v <= 0) return null;
  return v;
}

export function hasAnyQuoteData(q) {
  return displayPrice(q) != null;
}
