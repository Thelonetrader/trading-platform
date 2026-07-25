import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getWatchlistSymbols } from '../utils/storageStats';

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
  getNews: async () => ({ items: [], error: 'Market data requires Electron' }),
  getEarningsCalendar: async () => ({ items: [], error: 'Market data requires Electron' }),
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

  const fetchNews = useCallback((opts) => api.getNews(opts), [api]);

  const fetchEarningsCalendar = useCallback((opts) => api.getEarningsCalendar(opts), [api]);

  const hasFmpKey = !!(config.fmpApiKey || '').trim();

  return {
    isElectron: api !== noopMarket,
    config,
    hasFmpKey,
    saveConfig,
    testFmp,
    fetchFundamentals,
    fetchNews,
    fetchEarningsCalendar,
  };
}

export function watchlistTickersForNews() {
  return getWatchlistSymbols().map((s) => s.ticker);
}
