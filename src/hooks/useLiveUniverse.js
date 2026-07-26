import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  liveUniverseToFmpQuery,
  mergeLiveUniverseTickers,
  normalizeLiveUniverse,
} from '../utils/liveUniverse';

/**
 * When universeId === 'live', fetches tickers from FMP company-screener.
 */
export function useLiveUniverseTickers({
  universeId,
  liveUniverse,
  symbolPickTickers = [],
  fetchCompanyScreener,
  hasFmpKey = false,
}) {
  const [state, setState] = useState({
    tickers: [],
    items: [],
    loading: false,
    error: '',
    updatedAt: null,
  });

  const cfgKey = useMemo(() => JSON.stringify(normalizeLiveUniverse(liveUniverse)), [liveUniverse]);

  const refresh = useCallback(async () => {
    if (universeId !== 'live') {
      setState({ tickers: [], items: [], loading: false, error: '', updatedAt: null });
      return;
    }
    if (!hasFmpKey || !fetchCompanyScreener) {
      setState({
        tickers: [],
        items: [],
        loading: false,
        error: 'Add FMP API key in Settings → Market data',
        updatedAt: null,
      });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const res = await fetchCompanyScreener(liveUniverseToFmpQuery(liveUniverse));
      if (res?.error) {
        setState({
          tickers: [],
          items: [],
          loading: false,
          error: res.error,
          updatedAt: null,
        });
        return;
      }
      const items = res?.items || [];
      const tickers = items.map((i) => i.symbol).filter(Boolean);
      setState({
        tickers,
        items,
        loading: false,
        error: '',
        updatedAt: Date.now(),
      });
    } catch (e) {
      setState({
        tickers: [],
        items: [],
        loading: false,
        error: e.message || 'Live universe refresh failed',
        updatedAt: null,
      });
    }
  }, [universeId, liveUniverse, fetchCompanyScreener, hasFmpKey]);

  useEffect(() => {
    if (universeId === 'live') refresh();
  }, [universeId, cfgKey, refresh]);

  const mergedTickers = useMemo(() => {
    if (universeId !== 'live') return null;
    return mergeLiveUniverseTickers(state.tickers, symbolPickTickers);
  }, [universeId, state.tickers, symbolPickTickers]);

  const nameByTicker = useMemo(() => {
    const map = {};
    for (const row of state.items) {
      if (row.symbol && row.name) map[row.symbol.toUpperCase()] = row.name;
    }
    for (const p of symbolPickTickers || []) {
      if (typeof p === 'object' && p.ticker && p.name) map[p.ticker.toUpperCase()] = p.name;
    }
    return map;
  }, [state.items, symbolPickTickers]);

  return {
    ...state,
    mergedTickers,
    nameByTicker,
    refresh,
  };
}
