import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getListOptionStyle } from '../theme/formStyles';
import { ComboInputShell, comboListboxStyle, withComboInputStyle } from './ComboField';

/**
 * Single-select typeahead: opens on focus, filter options by typing label.
 * @param {{ id: string, label: string }[]} options
 * @param {string} value — selected option id
 * @param {(id: string) => void} onChange
 */
export default function OptionCombo({
  label,
  labelStyle,
  inputStyle,
  value,
  onChange,
  options = [],
  placeholder = 'Choose…',
  gridColumn,
  disabled = false,
}) {
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);

  const selected = useMemo(
    () => (options || []).find((o) => String(o.id) === String(value)),
    [options, value],
  );

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    const base = (options || []).filter((o) => o && o.label);
    const list = q ? base.filter((o) => String(o.label).toLowerCase().includes(q)) : base;
    return list.slice(0, 48);
  }, [options, q]);

  useEffect(() => {
    setActiveIdx(0);
  }, [q, filtered.length]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (opt) => {
    if (!opt) return;
    onChange(opt.id);
    setQuery('');
    setOpen(false);
  };

  const openList = () => {
    if (disabled) return;
    setOpen(true);
  };

  const beginBrowse = () => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
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
    if (e.key === 'Enter' && open && filtered[activeIdx]) {
      e.preventDefault();
      pick(filtered[activeIdx]);
    }
  };

  const showList = open && !disabled && filtered.length > 0;
  const displayValue = open ? query : selected?.label || '';
  const displayPlaceholder =
    open && !query && selected?.label ? selected.label : placeholder || 'Choose…';

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', gridColumn: gridColumn || undefined }}
    >
      {label != null && labelStyle && <label style={labelStyle}>{label}</label>}
      <ComboInputShell
        open={open}
        disabled={disabled}
        onChevronClick={() => {
          if (disabled) return;
          if (open) {
            setOpen(false);
            setQuery('');
          } else {
            beginBrowse();
          }
        }}
      >
        <input
          style={withComboInputStyle(inputStyle, { disabled })}
          placeholder={displayPlaceholder}
          value={displayValue}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={beginBrowse}
          onClick={openList}
          onKeyDown={onKeyDown}
          autoComplete="off"
          aria-autocomplete="list"
        />
      </ComboInputShell>
      {showList && (
        <div
          role="listbox"
          style={comboListboxStyle({ maxHeight: 240 })}
          onMouseDown={(e) => e.preventDefault()}
        >
          {filtered.map((opt, idx) => (
            <button
              key={String(opt.id)}
              type="button"
              role="option"
              aria-selected={String(opt.id) === String(value) || idx === activeIdx}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(opt);
              }}
              onMouseEnter={() => setActiveIdx(idx)}
              style={getListOptionStyle({
                active: idx === activeIdx,
                selected: String(opt.id) === String(value) && idx !== activeIdx,
              })}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      {open && !disabled && q && filtered.length === 0 && (
        <div
          style={comboListboxStyle({
            maxHeight: 'none',
            overflowY: 'visible',
            padding: '10px 12px',
            fontSize: 12,
            color: 'var(--tp-text-muted)',
          })}
          onMouseDown={(e) => e.preventDefault()}
        >
          No matches
        </div>
      )}
    </div>
  );
}
