import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { RESEARCH_DATA_IMPORTED_EVENT } from './utils/dataBackup';
import FilterCombo from './components/FilterCombo';
import MultiFilterCombo from './components/MultiFilterCombo';
import { buildWatchlistFilterSuggestions } from './utils/screenerFilterSuggestions';
import { parseTags } from './utils/customRank';
import { dispatchWatchlistChanged } from './utils/liveSubscribe';
import { displayChangePct, displayPrice, quoteForSymbol } from './utils/quoteDisplay';
import { applyResolvedToWatchlistForm } from './utils/watchlistAutoFill';
import { resolveSymbolForTerminal } from './utils/resolveSymbolContract';
import { formatSectorDisplay } from './utils/sectorDisplay';

function Watchlist({ quotes = {}, onSelectSymbol }) {
  const loadStocks = () => {
    const saved = localStorage.getItem('watchlist');
    return saved ? JSON.parse(saved) : [];
  };
  const [stocks, setStocks] = useState(loadStocks);
  const [showForm, setShowForm] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupHint, setLookupHint] = useState('');
  const [form, setForm] = useState({
    ticker: '',
    name: '',
    sector: '',
    buyPrice: '',
    notes: '',
    priority: 'Medium',
    exchange: 'SMART',
    currency: 'USD',
    primaryExch: '',
    listingExchange: '',
    tags: '',
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAdd = async () => {
    if (!form.ticker) return;
    setLookupBusy(true);
    try {
      const resolved = await resolveSymbolForTerminal(form.ticker);
      const enriched = applyResolvedToWatchlistForm(form, resolved);
      const newStocks = [
        { ...enriched, id: Date.now(), addedDate: new Date().toISOString().split('T')[0] },
        ...stocks.filter((s) => (s.ticker || '').toUpperCase() !== enriched.ticker.toUpperCase()),
      ];
      setStocks(newStocks);
      localStorage.setItem('watchlist', JSON.stringify(newStocks));
      dispatchWatchlistChanged();
      setForm({
        ticker: '',
        name: '',
        sector: '',
        buyPrice: '',
        notes: '',
        priority: 'Medium',
        exchange: 'SMART',
        currency: 'USD',
        primaryExch: '',
        listingExchange: '',
        tags: '',
      });
      setShowForm(false);
      setLookupHint('');
    } finally {
      setLookupBusy(false);
    }
  };

  const lookupTicker = useCallback(async (rawTicker) => {
    const t = (rawTicker || '').trim().toUpperCase();
    if (!t || t.length < 1) return;
    setLookupBusy(true);
    setLookupHint('');
    try {
      const resolved = await resolveSymbolForTerminal(t);
      setForm((prev) => applyResolvedToWatchlistForm({ ...prev, ticker: t }, resolved));
      setLookupHint(
        resolved.source === 'fmp'
          ? `Filled from FMP · ${resolved.exchange}/${resolved.currency}${resolved.listingExchange ? ` · ${resolved.listingExchange}` : ''}`
          : `Filled from ticker rules · ${resolved.exchange}/${resolved.currency}`,
      );
    } catch {
      setLookupHint('Lookup failed — check ticker or FMP key in Settings');
    } finally {
      setLookupBusy(false);
    }
  }, []);

  const handleDelete = (id) => {
    const newStocks = stocks.filter(s => s.id !== id);
    setStocks(newStocks);
    localStorage.setItem('watchlist', JSON.stringify(newStocks));
    dispatchWatchlistChanged();
  };

  const priorityColor = (p) => p === 'High' ? '#ef4444' : p === 'Medium' ? '#f59e0b' : '#22c55e';

  const inputStyle = {
    background: 'var(--tp-bg-input)',
    border: '1px solid var(--tp-border)',
    borderRadius: 8,
    color: 'var(--tp-text-title)',
    fontSize: 13,
    padding: '8px 12px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    fontSize: 11,
    color: 'var(--tp-text-faint)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 6,
    display: 'block',
  };

  useEffect(() => {
    const reload = () => setStocks(loadStocks());
    window.addEventListener(RESEARCH_DATA_IMPORTED_EVENT, reload);
    return () => window.removeEventListener(RESEARCH_DATA_IMPORTED_EVENT, reload);
  }, []);

  const filterSuggestions = useMemo(() => buildWatchlistFilterSuggestions(stocks), [stocks]);

  const tagList = useMemo(() => parseTags(form.tags), [form.tags]);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--tp-text-dim)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>
            Stocks to Watch
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--tp-text-strong)', letterSpacing: '-0.02em' }}>
            Watchlist
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          padding: '10px 20px',
          background: '#6366f1',
          border: 'none',
          borderRadius: 8,
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}>
          {showForm ? '✕ Cancel' : '+ Add Stock'}
        </button>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 12,
        marginBottom: 24,
      }}>
        {[
          { label: 'Watching', value: stocks.length },
          { label: 'High Priority', value: stocks.filter(s => s.priority === 'High').length, color: '#ef4444' },
          { label: 'Medium Priority', value: stocks.filter(s => s.priority === 'Medium').length, color: '#f59e0b' },
          { label: 'Low Priority', value: stocks.filter(s => s.priority === 'Low').length, color: '#22c55e' },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'var(--tp-bg-panel)',
            border: '1px solid var(--tp-border)',
            borderRadius: 10,
            padding: '16px 18px',
          }}>
            <div style={{ fontSize: 11, color: 'var(--tp-text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color || '#f1f5f9' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Add Stock Form */}
      {showForm && (
        <div style={{
          background: 'var(--tp-bg-panel)',
          border: '1px solid var(--tp-border)',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tp-text-title)', marginBottom: 20 }}>Add Stock to Watchlist</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 16 }}>
            <FilterCombo
              label="Ticker"
              labelStyle={labelStyle}
              inputStyle={inputStyle}
              placeholder="e.g. ULVR.L"
              value={form.ticker}
              onChange={(v) => handleChange('ticker', v.toUpperCase())}
              onBlur={() => lookupTicker(form.ticker)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  lookupTicker(form.ticker);
                }
              }}
              options={filterSuggestions.tickers}
              emptyLabel="Enter new ticker"
            />
            <FilterCombo
              label="Company name"
              labelStyle={labelStyle}
              inputStyle={inputStyle}
              placeholder="e.g. Unilever"
              value={form.name}
              onChange={(v) => handleChange('name', v)}
              options={filterSuggestions.names}
            />
            <FilterCombo
              label="Sector"
              labelStyle={labelStyle}
              inputStyle={inputStyle}
              placeholder="Pick or type sector"
              value={form.sector}
              onChange={(v) => handleChange('sector', v)}
              options={filterSuggestions.sectors}
              emptyLabel="Clear sector"
            />
            <div>
              <label style={labelStyle}>Target buy price</label>
              <input type="number" placeholder="Auto from FMP if empty" value={form.buyPrice} onChange={e => handleChange('buyPrice', e.target.value)} style={inputStyle} />
            </div>
            <FilterCombo
              label="Exchange (IB)"
              labelStyle={labelStyle}
              inputStyle={inputStyle}
              placeholder="SMART or LSE"
              value={form.exchange}
              onChange={(v) => handleChange('exchange', v.toUpperCase())}
              options={filterSuggestions.exchanges}
            />
            <FilterCombo
              label="Currency"
              labelStyle={labelStyle}
              inputStyle={inputStyle}
              placeholder="USD / GBP"
              value={form.currency}
              onChange={(v) => handleChange('currency', v.toUpperCase())}
              options={filterSuggestions.currencies}
            />
            <div>
              <label style={labelStyle}>Priority</label>
              <select value={form.priority} onChange={e => handleChange('priority', e.target.value)} style={inputStyle}>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
            <MultiFilterCombo
              label="Tags"
              labelStyle={labelStyle}
              inputStyle={inputStyle}
              placeholder="thesis, dividend…"
              selected={tagList}
              onChange={(arr) => handleChange('tags', arr.join(', '))}
              options={filterSuggestions.tags}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Notes</label>
            <textarea
              placeholder="Why are you watching this stock? What would make you buy?"
              value={form.notes}
              onChange={e => handleChange('notes', e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          {(lookupHint || lookupBusy) && (
            <p style={{ margin: '0 0 12px', fontSize: 12, color: lookupBusy ? '#64748b' : '#818cf8' }}>
              {lookupBusy ? 'Looking up symbol…' : lookupHint}
            </p>
          )}
          <button
            type="button"
            onClick={handleAdd}
            disabled={lookupBusy || !form.ticker}
            style={{
            padding: '10px 24px',
            background: '#6366f1',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: lookupBusy || !form.ticker ? 'not-allowed' : 'pointer',
            opacity: lookupBusy || !form.ticker ? 0.6 : 1,
          }}>
            Add to Watchlist
          </button>
        </div>
      )}

      {/* Watchlist */}
      {stocks.length === 0 ? (
        <div style={{
          background: 'var(--tp-bg-panel)',
          border: '1px solid var(--tp-border)',
          borderRadius: 12,
          padding: 48,
          textAlign: 'center',
          color: 'var(--tp-text-dim)',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>◉</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--tp-text-faint)', marginBottom: 6 }}>No stocks on your watchlist</div>
          <div style={{ fontSize: 13 }}>Click "Add Stock" to start watching</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stocks.map(stock => {
            const sym = (stock.ticker || '').toUpperCase();
            const q = quoteForSymbol(quotes, sym);
            const px = displayPrice(q);
            const chg = displayChangePct(q);
            return (
            <div key={stock.id} style={{
              background: 'var(--tp-bg-panel)',
              border: '1px solid var(--tp-border)',
              borderRadius: 12,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flex: 1 }}>
                {/* Priority indicator */}
                <div style={{
                  width: 4,
                  alignSelf: 'stretch',
                  borderRadius: 2,
                  background: priorityColor(stock.priority),
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--tp-text-title)' }}>{stock.ticker}</span>
                    {stock.name && <span style={{ fontSize: 13, color: 'var(--tp-text-faint)' }}>{stock.name}</span>}
                    {stock.sector && (
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 4,
                        background: 'var(--tp-bg-active)', color: 'var(--tp-text-muted)', fontWeight: 500,
                      }}>{formatSectorDisplay(stock.sector)}</span>
                    )}
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                      background: `${priorityColor(stock.priority)}20`,
                      color: priorityColor(stock.priority),
                    }}>{stock.priority}</span>
                    {stock.tags && String(stock.tags).trim() && (
                      <span style={{ fontSize: 11, color: '#818cf8' }}>
                        {String(stock.tags).split(/[,;]+/).map((t) => t.trim()).filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 20, marginBottom: stock.notes ? 8 : 0 }}>
                    {stock.buyPrice && (
                      <div style={{ fontSize: 12, color: 'var(--tp-text-faint)' }}>
                        Target: <span style={{ color: '#22c55e', fontWeight: 600 }}>£{stock.buyPrice}</span>
                      </div>
                    )}
                    {px != null && (
                      <div style={{ fontSize: 12, color: 'var(--tp-text-secondary)' }}>
                        Last: <span style={{ color: 'var(--tp-text-title)', fontWeight: 600 }}>{px.toFixed(2)}</span>
                        {chg != null && (
                          <span style={{ marginLeft: 8, color: chg >= 0 ? '#22c55e' : '#ef4444' }}>
                            {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: 'var(--tp-text-dim)' }}>Added: {stock.addedDate}</div>
                  </div>
                  {stock.notes && (
                    <div style={{ fontSize: 12, color: 'var(--tp-text-faint)', lineHeight: 1.5 }}>{stock.notes}</div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                {onSelectSymbol && (
                  <button type="button" onClick={() => onSelectSymbol(sym)} style={{
                    padding: '4px 10px', borderRadius: 5, border: '1px solid #334155',
                    background: 'transparent', color: '#6366f1', fontSize: 11,
                    cursor: 'pointer', fontWeight: 600,
                  }}>Terminal</button>
                )}
              <button onClick={() => handleDelete(stock.id)} style={{
                padding: '4px 10px', borderRadius: 5, border: '1px solid var(--tp-border)',
                background: 'transparent', color: '#ef4444', fontSize: 11,
                cursor: 'pointer', fontWeight: 600, flexShrink: 0,
              }}>Remove</button>
              </div>
            </div>
          );})}
        </div>
      )}
    </div>
  );
}

export default Watchlist;