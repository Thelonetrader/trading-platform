import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMarketData, watchlistTickersForNews } from './hooks/useMarketData';
import { readJson } from './utils/storageStats';

function sentimentColor(label) {
  if (label === 'Bullish') return '#22c55e';
  if (label === 'Bearish') return '#ef4444';
  return '#94a3b8';
}

export default function News({ onOpenTerminal }) {
  const { hasFmpKey, fetchNews, fetchEarningsCalendar, isElectron } = useMarketData();
  const [scope, setScope] = useState('watchlist');
  const [ticker, setTicker] = useState('');
  const [items, setItems] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('all');

  const watchTickers = useMemo(() => watchlistTickersForNews(), []);

  const tickers = useMemo(() => {
    if (scope === 'single') return ticker.trim() ? [ticker.trim().toUpperCase()] : [];
    if (scope === 'watchlist') return watchTickers;
    const pf = readJson('portfolio', [])
      .map((h) => (h.ticker || '').toUpperCase())
      .filter(Boolean);
    return [...new Set([...watchTickers, ...pf])];
  }, [scope, ticker, watchTickers]);

  const load = useCallback(async () => {
    if (!hasFmpKey) {
      setError('Add your Financial Modeling Prep API key in Settings → Market data');
      setItems([]);
      setEarnings([]);
      return;
    }
    if (!tickers.length) {
      setError('No tickers — add watchlist names or enter a symbol');
      setItems([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [newsRes, earnRes] = await Promise.all([
        fetchNews({ tickers, limit: 60 }),
        fetchEarningsCalendar({}),
      ]);
      if (newsRes.error && !newsRes.items?.length) setError(newsRes.error);
      else setError('');
      setItems(newsRes.items || []);
      const earnSet = new Set(tickers);
      setEarnings((earnRes.items || []).filter((e) => earnSet.has(e.symbol)));
    } catch (e) {
      setError(e.message || 'Failed to load news');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [hasFmpKey, tickers, fetchNews, fetchEarningsCalendar]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (sentimentFilter === 'all') return items;
    return items.filter((i) => i.sentiment === sentimentFilter);
  }, [items, sentimentFilter]);

  const summary = useMemo(() => {
    const counts = { Bullish: 0, Bearish: 0, Neutral: 0 };
    for (const i of items) counts[i.sentiment] = (counts[i.sentiment] || 0) + 1;
    return counts;
  }, [items]);

  const inputStyle = {
    background: '#060b16',
    border: '1px solid #1a2035',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 13,
    padding: '8px 12px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>
          Phase 2 · FMP
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc' }}>News & sentiment</div>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 8, maxWidth: 560, lineHeight: 1.5 }}>
          Headlines from Financial Modeling Prep with lexicon-based sentiment (bullish / bearish / neutral). Requires a
          free or paid{' '}
          <a href="https://site.financialmodelingprep.com/developer/docs" style={{ color: '#818cf8' }}>
            FMP API key
          </a>{' '}
          in Settings.
        </p>
        {!isElectron && (
          <p style={{ fontSize: 12, color: '#f59e0b', marginTop: 8 }}>Run the Electron app to fetch live news.</p>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'flex-end',
          marginBottom: 20,
          background: '#0a0f1e',
          border: '1px solid #1a2035',
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>Universe</div>
          <select style={{ ...inputStyle, width: 'auto', minWidth: 160 }} value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="watchlist">Watchlist</option>
            <option value="combined">Watchlist + portfolio</option>
            <option value="single">Single ticker</option>
          </select>
        </div>
        {scope === 'single' && (
          <div style={{ flex: '1 1 120px', maxWidth: 140 }}>
            <div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>Ticker</div>
            <input style={inputStyle} value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="AAPL" />
          </div>
        )}
        <div>
          <div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>Sentiment</div>
          <select
            style={{ ...inputStyle, width: 'auto' }}
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="Bullish">Bullish</option>
            <option value="Neutral">Neutral</option>
            <option value="Bearish">Bearish</option>
          </select>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: '#6366f1',
            color: '#fff',
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {items.length > 0 && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 13, color: '#94a3b8' }}>
          <span>
            <span style={{ color: '#22c55e', fontWeight: 700 }}>{summary.Bullish}</span> bullish
          </span>
          <span>
            <span style={{ color: '#94a3b8', fontWeight: 700 }}>{summary.Neutral}</span> neutral
          </span>
          <span>
            <span style={{ color: '#ef4444', fontWeight: 700 }}>{summary.Bearish}</span> bearish
          </span>
        </div>
      )}

      {error && <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>{error}</div>}

      {earnings.length > 0 && (
        <div style={{ background: '#0a0f1e', border: '1px solid #1a2035', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 12 }}>Upcoming earnings (universe)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {earnings.slice(0, 12).map((e) => (
              <div key={`${e.symbol}-${e.date}`} style={{ display: 'flex', gap: 12, fontSize: 13, color: '#cbd5e1' }}>
                <span style={{ fontWeight: 700, color: '#818cf8', width: 56 }}>{e.symbol}</span>
                <span style={{ color: '#64748b', width: 100 }}>{e.date}</span>
                <span>EPS est. {e.epsEstimate ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((item) => (
          <article
            key={item.id}
            style={{
              background: '#0a0f1e',
              border: '1px solid #1a2035',
              borderRadius: 10,
              padding: '14px 18px',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 8 }}>
              {item.ticker && (
                <button
                  type="button"
                  onClick={() => onOpenTerminal?.(item.ticker)}
                  style={{
                    border: 'none',
                    background: '#6366f120',
                    color: '#818cf8',
                    fontWeight: 700,
                    fontSize: 12,
                    padding: '2px 8px',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  {item.ticker}
                </button>
              )}
              <span style={{ fontSize: 11, fontWeight: 600, color: sentimentColor(item.sentiment) }}>{item.sentiment}</span>
              <span style={{ fontSize: 11, color: '#475569' }}>{item.publishedAt}</span>
              {item.site && <span style={{ fontSize: 11, color: '#334155' }}>{item.site}</span>}
            </div>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', textDecoration: 'none', lineHeight: 1.4 }}
            >
              {item.title}
            </a>
            {item.text && (
              <p style={{ margin: '10px 0 0', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                {item.text.length > 280 ? `${item.text.slice(0, 280)}…` : item.text}
              </p>
            )}
          </article>
        ))}
        {!loading && !filtered.length && !error && (
          <div style={{ textAlign: 'center', color: '#475569', padding: 40 }}>No headlines for this filter.</div>
        )}
      </div>
    </div>
  );
}
