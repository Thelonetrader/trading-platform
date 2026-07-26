import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getAccentChipStyle, getListOptionStyle } from '../theme/formStyles';
import { ComboInputShell, comboListboxStyle, withComboInputStyle } from './ComboField';

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
 * Multi-select typeahead: picked values show as removable chips; filters use OR across chips.
 */
export default function MultiFilterCombo({
  label,
  labelStyle,
  inputStyle,
  selected = [],
  onChange,
  options = [],
  placeholder = 'Add…',
  allowCustom = true,
  maxVisible = 48,
}) {
  const wrapRef = useRef(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const picked = useMemo(() => new Set(selected.map((s) => s.toLowerCase())), [selected]);

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    const base = (options || []).filter((o) => o && !picked.has(String(o).toLowerCase()));
    const list = q ? base.filter((o) => String(o).toLowerCase().includes(q)) : base;
    return list.slice(0, maxVisible);
  }, [options, q, picked, maxVisible]);

  useEffect(() => {
    setActiveIdx(0);
  }, [q, filtered.length]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const addValue = (raw) => {
    const val = String(raw || '').trim();
    if (!val) return;
    if (picked.has(val.toLowerCase())) {
      setQuery('');
      return;
    }
    onChange([...selected, val]);
    setQuery('');
    setOpen(false);
  };

  const removeValue = (val) => {
    onChange(selected.filter((s) => s !== val));
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (open && filtered[activeIdx]) {
        addValue(filtered[activeIdx]);
      } else if (allowCustom && query.trim()) {
        addValue(query);
      }
    }
    if (e.key === 'Backspace' && !query && selected.length) {
      removeValue(selected[selected.length - 1]);
    }
  };

  const showList = open && (filtered.length > 0 || (allowCustom && q));

  const openList = () => setOpen(true);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {label != null && labelStyle && <label style={labelStyle}>{label}</label>}
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {selected.map((s) => (
            <Chip key={s} label={s} onRemove={() => removeValue(s)} />
          ))}
        </div>
      )}
      <ComboInputShell
        open={open}
        onChevronClick={() => {
          if (open) setOpen(false);
          else openList();
        }}
      >
        <input
          style={withComboInputStyle(inputStyle)}
          placeholder={selected.length ? 'Add another…' : placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
          }}
          onClick={openList}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />
      </ComboInputShell>
      {showList && (
        <div
          role="listbox"
          style={comboListboxStyle()}
          onMouseDown={(e) => e.preventDefault()}
        >
          {filtered.map((item, idx) => (
            <button
              key={item}
              type="button"
              role="option"
              aria-selected={idx === activeIdx}
              onMouseDown={(e) => {
                e.preventDefault();
                addValue(item);
              }}
              onMouseEnter={() => setActiveIdx(idx)}
              style={getListOptionStyle({ active: idx === activeIdx })}
            >
              {item}
            </button>
          ))}
          {allowCustom && q && !filtered.some((f) => f.toLowerCase() === q) && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                addValue(query);
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                border: 'none',
                borderTop: filtered.length ? '1px solid var(--tp-border)' : undefined,
                background: 'transparent',
                color: 'var(--tp-accent-muted)',
                fontSize: 12,
                cursor: 'default',
              }}
            >
              Add “{query.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
