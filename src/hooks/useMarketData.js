import { useCallback, useEffect, useMemo, useState } from 'react';
import { getWatchlistSymbols } from '../utils/storageStats';
import { resolveSymbolHeuristic } from '../utils/resolveSymbolContract';

const noopMarket = {
  getConfig: async () => ({ fmpApiKey: '', cacheTtlMinutes: 60 }),
  setConfig: async (p) => p,
  testFmp: async () => ({ ok: false, error: 'Use Electron app' }),
  getFundamentals: async () => ({
    metrics: {},
    fieldCount: 0,
    sources: [],
    error: 'Market data requires Electron',
  }),
  resolveSymbol: async (ticker) => resolveSymbolHeuristic(ticker),
  getNews: async () => ({ items: [], error: 'Market data requires Electron' }),
  getEarningsCalendar: async () => ({ items: [], error: 'Market data requires Electron' }),
  getScreenerSnapshots: async () => ({ snapshots: {}, count: 0, error: 'Market data requires Electron' }),
  searchSymbols: async () => ({ items: [], error: 'Market data requires Electron' }),
  companyScreener: async () => ({ items: [], count: 0, error: 'Market data requires Electron' }),
};

export function useMarketData() {
  const api = useMemo(() => (typeof window !== 'undefined' && window.marketData) || noopMarket, []);
  const [config, setConfig] = useState({ fmpApiKey: '', cacheTtlMinutes: 60 });

  useEffect(() => {
    api.getConfig().then(setConfig).catch(() => {});
  }, [api]);

  const saveConfig = useCallback(
    async (patch) => {
      const next = await api.setConfig(patch);
      setConfig(next);
      return next;
    },
    [api],
  );

  const testFmp = useCallback(() => api.testFmp(), [api]);

  const fetchFundamentals = useCallback((entry) => api.getFundamentals(entry), [api]);

  const resolveSymbol = useCallback((ticker) => api.resolveSymbol(ticker), [api]);

  const fetchNews = useCallback((opts) => api.getNews(opts), [api]);

  const fetchEarningsCalendar = useCallback((opts) => api.getEarningsCalendar(opts), [api]);

  const fetchScreenerSnapshots = useCallback((tickers) => api.getScreenerSnapshots(tickers), [api]);

  const searchSymbols = useCallback((query, opts) => api.searchSymbols(query, opts), [api]);

  const fetchCompanyScreener = useCallback((params) => api.companyScreener(params), [api]);

  const hasFmpKey = !!(config.fmpApiKey || '').trim();

  return {
    isElectron: api !== noopMarket,
    config,
    hasFmpKey,
    saveConfig,
    testFmp,
    fetchFundamentals,
    resolveSymbol,
    fetchNews,
    fetchEarningsCalendar,
    fetchScreenerSnapshots,
    searchSymbols,
    fetchCompanyScreener,
  };
}

export function watchlistTickersForNews() {
  return getWatchlistSymbols().map((s) => s.ticker);
}
