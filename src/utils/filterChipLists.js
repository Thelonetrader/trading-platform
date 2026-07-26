/** Normalize multi-select filter fields (arrays + legacy single strings). */

export function normalizeSymbolPicks(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  const seen = new Set();
  for (const entry of value) {
    if (!entry) continue;
    const ticker =
      typeof entry === 'string'
        ? entry.trim().toUpperCase()
        : (entry.ticker || entry.symbol || '').trim().toUpperCase();
    if (!ticker || seen.has(ticker)) continue;
    seen.add(ticker);
    const name = typeof entry === 'object' ? String(entry.name || '').trim() : '';
    out.push({ ticker, name });
  }
  return out;
}

export function normalizeFilterList(value, legacyString) {
  if (Array.isArray(value)) {
    return value.map((s) => String(s).trim()).filter(Boolean);
  }
  if (legacyString != null && String(legacyString).trim()) {
    return [String(legacyString).trim()];
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }
  return [];
}

export function matchesAnyContains(haystack, needles, { lower = true } = {}) {
  const list = normalizeFilterList(needles);
  if (!list.length) return true;
  const text = lower ? String(haystack || '').toLowerCase() : String(haystack || '');
  return list.some((n) => {
    const q = lower ? n.toLowerCase() : n;
    return text.includes(q);
  });
}

export function matchesAnyTag(tags, needles) {
  const list = normalizeFilterList(needles);
  if (!list.length) return true;
  const tagList = (tags || []).map((t) => String(t).toLowerCase());
  return list.some((n) => tagList.some((t) => t.includes(n.toLowerCase())));
}

export function migrateScreenerMultiFilters(filters) {
  if (!filters || typeof filters !== 'object') return filters;
  const next = { ...filters };

  next.sectorMatches = normalizeFilterList(next.sectorMatches, next.sectorQuery);
  next.industryMatches = normalizeFilterList(next.industryMatches, next.industryQuery);
  next.exchangeMatches = normalizeFilterList(next.exchangeMatches, next.exchangeQuery);
  next.tagMatches = normalizeFilterList(next.tagMatches, next.tagQuery);
  next.searchTerms = normalizeFilterList(next.searchTerms, next.search);
  next.symbolPicks = normalizeSymbolPicks(next.symbolPicks);

  const currencyList = normalizeFilterList(next.currencyFilters);
  if (!currencyList.length && next.currencyFilter && next.currencyFilter !== 'any') {
    next.currencyFilters = [next.currencyFilter];
  } else {
    next.currencyFilters = currencyList;
  }

  delete next.sectorQuery;
  delete next.industryQuery;
  delete next.exchangeQuery;
  delete next.tagQuery;
  delete next.search;

  for (const key of [
    'fundamentalChipIds',
    'dayChangeChipIds',
    'mktCapBandIds',
    'priceBandIds',
    'betaBandIds',
    'ratingMatches',
    'sectorMatches',
    'industryMatches',
    'exchangeMatches',
    'tagMatches',
    'searchTerms',
    'symbolPicks',
    'currencyFilters',
  ]) {
    if (!Array.isArray(next[key])) next[key] = [];
  }

  next.symbolPicks = normalizeSymbolPicks(next.symbolPicks);

  next.priorityFilter = {
    High: true,
    Medium: true,
    Low: true,
    ...(next.priorityFilter && typeof next.priorityFilter === 'object' ? next.priorityFilter : {}),
  };

  const validTabs = new Set(['presets', 'universe', 'fundamentals', 'size', 'research']);
  const setupTab = String(next.setupTab ?? 'presets').trim();
  next.setupTab = validTabs.has(setupTab) ? setupTab : 'presets';

  if (typeof next.activeProPresetId !== 'string') next.activeProPresetId = '';

  return next;
}
