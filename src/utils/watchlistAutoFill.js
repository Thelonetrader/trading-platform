import { dispatchWatchlistChanged } from './liveSubscribe';
import { readJson, writeJson } from './storageStats';
import { resolveSymbolForTerminal } from './resolveSymbolContract';
import { formatSectorDisplay } from './sectorDisplay';

const WATCHLIST_KEY = 'watchlist';

export function isPlaceholderWatchlistContract(entry) {
  const ex = (entry?.exchange || 'SMART').toUpperCase();
  const ccy = (entry?.currency || 'USD').toUpperCase();
  return ex === 'SMART' && ccy === 'USD' && !entry?.primaryExch;
}

function mapSectorForWatchlist(fmpSector) {
  return formatSectorDisplay(fmpSector);
}

/** Merge FMP/heuristic resolve into a watchlist row without wiping user edits. */
export function enrichWatchlistEntry(entry, resolved) {
  if (!resolved?.symbol) return entry;
  const next = { ...entry };
  next.ticker = String(resolved.symbol).toUpperCase();

  if (resolved.companyName && !(entry.name || '').trim()) {
    next.name = resolved.companyName;
  }

  const shouldUpdateContract =
    isPlaceholderWatchlistContract(entry) ||
    !entry.exchange ||
    !entry.currency ||
    (resolved.exchange && resolved.exchange !== 'SMART') ||
    (resolved.currency && resolved.currency !== 'USD');

  if (shouldUpdateContract) {
    next.exchange = resolved.exchange || entry.exchange || 'SMART';
    next.currency = resolved.currency || entry.currency || 'USD';
  }

  if (resolved.primaryExch) next.primaryExch = resolved.primaryExch;
  if (resolved.listingExchange) next.listingExchange = resolved.listingExchange;

  const sector = mapSectorForWatchlist(resolved.sector);
  if (sector && !(entry.sector || '').trim()) {
    next.sector = sector;
  }

  if (resolved.price != null && !(entry.buyPrice || '').toString().trim()) {
    next.buyPrice = String(Number(resolved.price).toFixed(2));
  }

  return next;
}

export function patchWatchlistFromResolved(resolved, { addIfMissing = false, priority = 'Medium' } = {}) {
  if (!resolved?.symbol) return { updated: false, list: readJson(WATCHLIST_KEY, []) };

  const upper = String(resolved.symbol).toUpperCase();
  const list = readJson(WATCHLIST_KEY, []);
  const idx = list.findIndex((x) => (x.ticker || '').trim().toUpperCase() === upper);

  if (idx >= 0) {
    list[idx] = enrichWatchlistEntry(list[idx], resolved);
    writeJson(WATCHLIST_KEY, list);
    dispatchWatchlistChanged();
    return { updated: true, list, entry: list[idx] };
  }

  if (!addIfMissing) return { updated: false, list };

  const entry = enrichWatchlistEntry(
    {
      id: Date.now(),
      ticker: upper,
      name: '',
      sector: '',
      buyPrice: '',
      notes: '',
      priority,
      exchange: 'SMART',
      currency: 'USD',
      tags: '',
      addedDate: new Date().toISOString().split('T')[0],
    },
    resolved,
  );
  list.unshift(entry);
  writeJson(WATCHLIST_KEY, list);
  dispatchWatchlistChanged();
  return { updated: true, list, entry, created: true };
}

export async function resolveAndPatchWatchlist(ticker, options) {
  const resolved = await resolveSymbolForTerminal(ticker);
  const result = patchWatchlistFromResolved(resolved, options);
  return { resolved, ...result };
}

/** On app load: fix legacy SMART/USD rows using FMP (rate-limited). */
export async function reconcilePlaceholderWatchlistEntries({ limit = 10 } = {}) {
  const list = readJson(WATCHLIST_KEY, []);
  const targets = list.filter(isPlaceholderWatchlistContract).slice(0, limit);
  if (!targets.length) return { reconciled: 0 };

  let reconciled = 0;
  let current = [...list];

  for (const row of targets) {
    const resolved = await resolveSymbolForTerminal(row.ticker);
    const idx = current.findIndex((x) => x.id === row.id);
    if (idx < 0) continue;
    const next = enrichWatchlistEntry(current[idx], resolved);
    if (JSON.stringify(next) !== JSON.stringify(current[idx])) {
      current[idx] = next;
      reconciled += 1;
    }
  }

  if (reconciled > 0) {
    writeJson(WATCHLIST_KEY, current);
    dispatchWatchlistChanged();
  }

  return { reconciled };
}

export function applyResolvedToWatchlistForm(form, resolved) {
  return enrichWatchlistEntry(
    {
      ...form,
      ticker: resolved.symbol || form.ticker,
    },
    resolved,
  );
}
