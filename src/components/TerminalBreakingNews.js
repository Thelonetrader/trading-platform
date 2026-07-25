import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { watchlistTickersForNews } from '../hooks/useMarketData';
import {
  NEWS_FEED_PROVIDERS,
  formatHeadlineTime,
  normalizeHeadline,
  sortHeadlinesNewestFirst,
} from '../utils/newsFeed';

function sentimentColor(label) {
  if (label === 'Bullish') return '#22c55e';
  if (label === 'Bearish') return '#ef4444';
  return '#94a3b8';
}

const AUTO_REFRESH_MS = 5 * 60 * 1000;
const MAX_HEADLINES = 6;

/**
 * Terminal breaking-news rail. Uses fetchNews today (FMP); pass headlines + provider="live" later.
 */
export default function TerminalBreakingNews({
  symbol,
  fetchNews,
  hasFmpKey,
  isElectron = true,
  onOpenNews,
  onSymbolClick,
  headlines: externalHeadlines,
  feedProvider = NEWS_FEED_PROVIDERS.fmp,
  liveConnected = false,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const scopeLabel = symbol ? symbol : 'Watchlist';

  const tickers = useMemo(() => {
    if (externalHeadlines) return [];
    if (symbol) return [symbol.toUpperCase()];
    const wl = watchlistTickersForNews();
    return wl.length ? wl.slice(0, 10) : [];
  }, [symbol, externalHeadlines]);

  const load = useCallback(async () => {
    if (externalHeadlines) {
      setItems(
        sortHeadlinesNewestFirst(
          externalHeadlines.map((h) => normalizeHeadline(h, feedProvider)).filter(Boolean),
        ).slice(0, MAX_HEADLINES),
      );
      setError('');
      setLastUpdated(Date.now());
      return;
    }

    if (!hasFmpKey) {
      setItems([]);
      setError('');
      return;
    }
    if (!tickers.length) {
      setItems([]);
      setError('Add symbols to your watchlist or select a ticker.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetchNews({ tickers, limit: 40 });
      const normalized = sortHeadlinesNewestFirst(
        (res.items || []).map((row) => normalizeHeadline(row, NEWS_FEED_PROVIDERS.fmp)).filter(Boolean),
      );
      const scoped = symbol
        ? normalized.filter((h) => !h.ticker || h.ticker === symbol.toUpperCase())
        : normalized;
      const list = (scoped.length ? scoped : normalized).slice(0, MAX_HEADLINES);
      if (res.error && !list.length) setError(res.error);
      else if (!list.length) setError('No headlines for this scope.');
      else setError('');
      setItems(list);
      setLastUpdated(Date.now());
    } catch (e) {
      setError(e.message || 'News unavailable');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [externalHeadlines, feedProvider, fetchNews, hasFmpKey, symbol, tickers]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (externalHeadlines || !hasFmpKey) return undefined;
    const id = window.setInterval(load, AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [externalHeadlines, hasFmpKey, load]);

  const providerLabel =
    feedProvider === NEWS_FEED_PROVIDERS.live
      ? liveConnected
        ? 'Live'
        : 'Live (offline)'
      : 'FMP';

  return (
    <div
      style={{
        background: '#0a0f1e',
        border: '1px solid #1a2035',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '10px 14px',
          borderBottom: '1px solid #1a2035',
          background: 'linear-gradient(90deg, #1e1b4b22 0%, #0a0f1e 100%)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: feedProvider === NEWS_FEED_PROVIDERS.live && liveConnected ? '#ef4444' : '#6366f1',
              boxShadow:
                feedProvider === NEWS_FEED_PROVIDERS.live && liveConnected ? '0 0 8px #ef444488' : 'none',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 11, fontWeight: 800, color: '#c7d2fe', letterSpacing: '0.12em' }}>
            BREAKING NEWS
          </span>
          <span style={{ fontSize: 10, color: '#475569' }}>{scopeLabel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            title="Swap feedProvider to live when streaming headlines are wired"
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.08em',
              padding: '2px 6px',
              borderRadius: 4,
              border: '1px solid #1a2035',
              color: '#64748b',
            }}
          >
            {providerLabel}
          </span>
          <button type="button" onClick={load} disabled={loading} style={headerBtn}>
            {loading ? '…' : 'Refresh'}
          </button>
          {onOpenNews && (
            <button type="button" onClick={onOpenNews} style={headerBtn}>
              All news
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '10px 14px 12px', minHeight: 72 }}>
        {!isElectron && (
          <p style={{ margin: '0 0 8px', fontSize: 11, color: '#f59e0b' }}>Electron required for headline fetch.</p>
        )}
        {isElectron && !hasFmpKey && !externalHeadlines && (
          <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
            Add an FMP key in Settings to populate headlines. This panel accepts a live{' '}
            <code style={{ fontSize: 11, color: '#818cf8' }}>headlines</code> feed when you wire streaming data.
          </p>
        )}
        {error && !items.length && (
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{error}</p>
        )}
        {items.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((item) => (
              <li
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: '8px 12px',
                  alignItems: 'start',
                  fontSize: 12,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: '#060b16',
                  border: '1px solid #121826',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 52 }}>
                  {item.ticker ? (
                    <button
                      type="button"
                      onClick={() => onSymbolClick?.(item.ticker)}
                      style={{
                        border: 'none',
                        background: '#6366f125',
                        color: '#a5b4fc',
                        fontWeight: 800,
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 4,
                        cursor: onSymbolClick ? 'pointer' : 'default',
                        width: 'fit-content',
                      }}
                    >
                      {item.ticker}
                    </button>
                  ) : (
                    <span style={{ fontSize: 10, color: '#475569' }}>MKT</span>
                  )}
                  <span style={{ fontSize: 9, fontWeight: 700, color: sentimentColor(item.sentiment) }}>
                    {item.sentiment}
                  </span>
                </div>
                <div style={{ minWidth: 0 }}>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#e2e8f0',
                        fontWeight: 600,
                        textDecoration: 'none',
                        lineHeight: 1.45,
                        display: 'block',
                      }}
                    >
                      {item.title}
                    </a>
                  ) : (
                    <span style={{ color: '#e2e8f0', fontWeight: 600, lineHeight: 1.45 }}>{item.title}</span>
                  )}
                  {item.site && (
                    <span style={{ display: 'block', marginTop: 4, fontSize: 10, color: '#475569' }}>{item.site}</span>
                  )}
                </div>
                <span style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap' }}>
                  {formatHeadlineTime(item.publishedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {lastUpdated && items.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 10, color: '#334155' }}>
            Updated {new Date(lastUpdated).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            {!externalHeadlines && hasFmpKey ? ' · auto-refresh 5m' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

const headerBtn = {
  fontSize: 10,
  fontWeight: 600,
  padding: '4px 8px',
  borderRadius: 6,
  border: '1px solid #1a2035',
  background: '#060b16',
  color: '#818cf8',
  cursor: 'pointer',
};
