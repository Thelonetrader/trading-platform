import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getListOptionStyle } from '../theme/formStyles';
import { ComboInputShell, SelectWithChevron, comboListboxStyle, withComboInputStyle } from './ComboField';

/**
 * Text filter with typeahead dropdown (still allows free-text "contains" values).
 */
export default function FilterCombo({
  label,
  labelStyle,
  inputStyle,
  value,
  onChange,
  onPick,
  onBlur,
  onKeyDown: onKeyDownProp,
  options = [],
  placeholder = '',
  emptyLabel = 'Any — clear filter',
  maxVisible = 48,
}) {
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  /** Typing buffer while dropdown is open (value stays until pick/blur). */
  const [draft, setDraft] = useState('');

  const filterSource = open ? draft : (value ?? '');
  const q = String(filterSource || '').trim().toLowerCase();

  const filtered = useMemo(() => {
    const base = (options || []).filter(Boolean);
    const list = q ? base.filter((o) => String(o).toLowerCase().includes(q)) : base;
    return list.slice(0, maxVisible);
  }, [options, q, maxVisible]);

  useEffect(() => {
    setActiveIdx(0);
  }, [q, filtered.length]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) closeList();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (next) => {
    const val = next === '' ? '' : next;
    if (val && onPick) {
      onPick(val);
    } else {
      onChange(val);
    }
    setDraft('');
    setOpen(false);
  };

  const openList = () => setOpen(true);

  const beginBrowse = () => {
    setOpen(true);
    setDraft('');
  };

  const closeList = () => {
    setOpen(false);
    setDraft('');
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      onKeyDownProp?.(e);
      return;
    }
    if (e.key === 'Escape') {
      closeList();
      onKeyDownProp?.(e);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter' && open) {
      e.preventDefault();
      if (activeIdx === 0) pick('');
      else if (filtered[activeIdx - 1]) pick(filtered[activeIdx - 1]);
      return;
    }
    onKeyDownProp?.(e);
  };

  const showList = open && (filtered.length > 0 || q === '');

  const listItems = [{ key: '__any', label: emptyLabel, value: '' }, ...filtered.map((o) => ({ key: o, label: o, value: o }))];

  const pickOption = (itemValue) => (e) => {
    e.preventDefault();
    pick(itemValue);
  };

  const displayPlaceholder =
    open && draft === '' && (value ?? '') !== '' ? String(value) : placeholder;

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {label != null && labelStyle && <label style={labelStyle}>{label}</label>}
      <ComboInputShell
        open={open}
        onChevronClick={() => {
          if (open) closeList();
          else beginBrowse();
        }}
      >
        <input
          style={withComboInputStyle(inputStyle)}
          placeholder={displayPlaceholder}
          value={open ? draft : (value ?? '')}
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            onChange(next);
            setOpen(true);
          }}
          onFocus={beginBrowse}
          onClick={openList}
          onBlur={(e) => {
            if (wrapRef.current?.contains(e.relatedTarget)) return;
            closeList();
            onBlur?.(e);
          }}
          onKeyDown={onKeyDown}
          autoComplete="off"
          aria-autocomplete="list"
        />
      </ComboInputShell>
      {showList && (
        <div
          role="listbox"
          style={comboListboxStyle()}
          onMouseDown={(e) => e.preventDefault()}
        >
          {listItems.map((item, idx) => {
            const active = idx === activeIdx;
            return (
              <button
                key={item.key}
                type="button"
                role="option"
                aria-selected={active}
                onMouseDown={pickOption(item.value)}
                onMouseEnter={() => setActiveIdx(idx)}
                style={getListOptionStyle({ active, muted: item.value === '' })}
              >
                {item.label}
              </button>
            );
          })}
          {q && filtered.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--tp-text-muted)' }}>
              No matches — press Enter to use “{draft || value}” as contains filter
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Native select for preset bundles (market cap band, beta, etc.). */
export function FilterPresetSelect({ label, labelStyle, inputStyle, value, onChange, presets }) {
  return (
    <div>
      {label != null && labelStyle && <label style={labelStyle}>{label}</label>}
      <SelectWithChevron style={inputStyle} value={value || ''} onChange={(e) => onChange(e.target.value)}>
        {(presets || []).map((p) => (
          <option key={p.id || p.label} value={p.id}>
            {p.label}
          </option>
        ))}
      </SelectWithChevron>
    </div>
  );
}
