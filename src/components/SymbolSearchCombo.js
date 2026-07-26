import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getAccentChipStyle, getListOptionStyle } from '../theme/formStyles';
import { ComboInputShell, comboListboxStyle, withComboInputStyle } from './ComboField';

function formatPickLabel(pick) {
  const ticker = (pick?.ticker || pick?.symbol || '').trim().toUpperCase();
  const name = (pick?.name || '').trim();
  if (!ticker) return name || '';
  if (!name) return ticker;
  return `${ticker} — ${name}`;
}

function Chip({ label, onRemove }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px 4px 10px',
        borderRadius: 6,
        ...getAccentChipStyle(),
        fontSize: 12,
        fontWeight: 500,
        maxWidth: '100%',
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <button
        type="button"
        aria-label={`Remove ${label}`}
        onClick={onRemove}
        style={{
          border: 'none',
          background: 'transparent',
          color: 'var(--tp-text-secondary)',
          cursor: 'pointer',
          padding: 0,
          lineHeight: 1,
          fontSize: 14,
        }}
      >
        ×
      </button>
    </span>
  );
}

/**
 * Async symbol typeahead: suggestions only after minChars; shows ticker + company name.
 * @param {{ ticker: string, name?: string }[]} selected
 * @param {(picks: { ticker: string, name?: string }[]) => void} onChange
 * @param {(query: string) => Promise<{ items?: { symbol: string, name?: string, exchange?: string }[], error?: string }>} searchSymbols
 */
export default function SymbolSearchCombo({
  label,
  labelStyle,
  inputStyle,
  selected = [],
  onChange,
  searchSymbols,
  placeholder = 'Type ticker or company name…',
  minChars = 2,
  debounceMs = 280,
  hint,
  disabled = false,
}) {
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);
  const reqIdRef = useRef(0);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [results, setResults] = useState([]);

  const pickedTickers = useMemo(
    () => new Set(selected.map((p) => (p.ticker || '').toUpperCase())),
    [selected],
  );

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (q.length < minChars || disabled || !searchSymbols) {
      setResults([]);
      setLoading(false);
      setSearchError('');
      return undefined;
    }

    setLoading(true);
    setSearchError('');
    const reqId = ++reqIdRef.current;

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchSymbols(q);
        if (reqId !== reqIdRef.current) return;
        if (res?.error) setSearchError(res.error);
        const items = (res?.items || [])
          .filter((it) => it?.symbol && !pickedTickers.has(it.symbol.toUpperCase()))
          .map((it) => ({
            ticker: it.symbol.toUpperCase(),
            name: it.name || '',
            exchange: it.exchange || '',
          }));
        setResults(items);
        setActiveIdx(0);
      } catch (e) {
        if (reqId === reqIdRef.current) {
          setResults([]);
          setSearchError(e.message || 'Search failed');
        }
      } finally {
        if (reqId === reqIdRef.current) setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, minChars, debounceMs, searchSymbols, disabled, pickedTickers]);

  const qLen = query.trim().length;
  const showList = open && qLen >= minChars && (loading || results.length > 0 || searchError);

  const addPick = (pick) => {
    const ticker = (pick.ticker || '').trim().toUpperCase();
    if (!ticker || pickedTickers.has(ticker)) {
      setQuery('');
      setOpen(false);
      return;
    }
    onChange([...selected, { ticker, name: pick.name || '' }]);
    setQuery('');
    setOpen(false);
    setResults([]);
  };

  const removePick = (ticker) => {
    onChange(selected.filter((p) => p.ticker !== ticker));
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown' && showList) {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
      return;
    }
    if (e.key === 'ArrowUp' && showList) {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter' && showList && results[activeIdx]) {
      e.preventDefault();
      addPick(results[activeIdx]);
      return;
    }
    if (e.key === 'Backspace' && !query && selected.length) {
      removePick(selected[selected.length - 1].ticker);
    }
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', gridColumn: '1 / -1' }}>
      {label != null && labelStyle && <label style={labelStyle}>{label}</label>}
      {hint && (
        <div style={{ fontSize: 11, color: 'var(--tp-text-muted)', marginBottom: 6, lineHeight: 1.4 }}>{hint}</div>
      )}
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {selected.map((p) => (
            <Chip key={p.ticker} label={formatPickLabel(p)} onRemove={() => removePick(p.ticker)} />
          ))}
        </div>
      )}
      <ComboInputShell
        open={open}
        disabled={disabled}
        onChevronClick={() => {
          if (disabled) return;
          setOpen((o) => !o);
        }}
      >
        <input
          style={withComboInputStyle(inputStyle, { disabled })}
          placeholder={placeholder}
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />
      </ComboInputShell>
      {qLen > 0 && qLen < minChars && (
        <div style={{ fontSize: 11, color: 'var(--tp-text-muted)', marginTop: 4 }}>
          Type at least {minChars} characters to search all markets
        </div>
      )}
      {showList && (
        <div
          role="listbox"
          style={comboListboxStyle({ maxHeight: 260 })}
          onMouseDown={(e) => e.preventDefault()}
        >
          {loading && (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--tp-text-muted)' }}>Searching…</div>
          )}
          {!loading && searchError && (
            <div style={{ padding: '10px 12px', fontSize: 12, color: '#f87171' }}>{searchError}</div>
          )}
          {!loading &&
            results.map((item, idx) => (
              <button
                key={`${item.ticker}-${idx}`}
                type="button"
                role="option"
                aria-selected={idx === activeIdx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  addPick(item);
                }}
                onMouseEnter={() => setActiveIdx(idx)}
                style={getListOptionStyle({ active: idx === activeIdx })}
              >
                <span style={{ fontWeight: 700, color: 'var(--tp-accent-on-soft)' }}>{item.ticker}</span>
                {item.name ? (
                  <span style={{ color: 'var(--tp-text-secondary)' }}> — {item.name}</span>
                ) : null}
                {item.exchange ? (
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--tp-text-muted)', marginTop: 2 }}>
                    {item.exchange}
                  </span>
                ) : null}
              </button>
            ))}
          {!loading && !searchError && results.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--tp-text-muted)' }}>No matches</div>
          )}
        </div>
      )}
    </div>
  );
}

export { formatPickLabel };
