import React, { useState } from 'react';

/** Keeps the default arrow cursor on dropdown fields (not the text I-beam). */
export const COMBO_FIELD_CURSOR = 'default';

export const COMBO_INPUT_PADDING_RIGHT = 40;

export function withComboInputStyle(inputStyle, { disabled } = {}) {
  return {
    ...inputStyle,
    cursor: disabled ? 'not-allowed' : COMBO_FIELD_CURSOR,
    paddingRight: COMBO_INPUT_PADDING_RIGHT,
  };
}

function ChevronAffordance({ open = false, disabled = false, onClick, ariaLabel = 'Open menu' }) {
  const [hover, setHover] = useState(false);
  const active = hover || open;

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={ariaLabel}
      aria-expanded={open}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.(e);
      }}
      style={{
        position: 'absolute',
        right: 4,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 28,
        padding: 0,
        border: active ? '1px solid var(--tp-accent-border)' : '1px solid transparent',
        borderRadius: 6,
        background: active ? 'var(--tp-accent-soft)' : 'transparent',
        color: active ? 'var(--tp-accent)' : 'var(--tp-text-secondary)',
        fontSize: 14,
        fontWeight: 800,
        lineHeight: 1,
        cursor: disabled ? 'not-allowed' : 'default',
        opacity: disabled ? 0.45 : 1,
        transition: 'background 0.12s ease, color 0.12s ease, border-color 0.12s ease',
      }}
    >
      {open ? '▴' : '▾'}
    </button>
  );
}

/** Wraps a combo text input with a hoverable chevron on the right. */
export function ComboInputShell({ children, open = false, disabled = false, onChevronClick }) {
  return (
    <div style={{ position: 'relative' }}>
      {children}
      <ChevronAffordance
        open={open}
        disabled={disabled}
        onClick={onChevronClick}
        ariaLabel={open ? 'Close menu' : 'Open menu'}
      />
    </div>
  );
}

const selectReset = {
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
};

/** Native select with matching chevron (screener sort, rating, etc.). */
export function SelectWithChevron({ style, disabled, children, ...rest }) {
  const selectRef = React.useRef(null);

  const openSelect = () => {
    const el = selectRef.current;
    if (!el || disabled) return;
    el.focus();
    try {
      el.showPicker?.();
    } catch {
      el.click();
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <select
        ref={selectRef}
        {...rest}
        disabled={disabled}
        style={{
          ...style,
          ...selectReset,
          ...withComboInputStyle(style || {}, { disabled }),
        }}
      >
        {children}
      </select>
      <ChevronAffordance disabled={disabled} onClick={openSelect} ariaLabel="Open list" />
    </div>
  );
}

/** Dropdown list panel — default cursor over options, not text selection I-beam. */
export function comboListboxStyle(overrides = {}) {
  return {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '100%',
    marginTop: 4,
    maxHeight: 220,
    overflowY: 'auto',
    background: 'var(--tp-bg-panel)',
    border: '1px solid var(--tp-border)',
    borderRadius: 8,
    boxShadow: 'var(--tp-shadow-dropdown)',
    zIndex: 40,
    cursor: COMBO_FIELD_CURSOR,
    userSelect: 'none',
    ...overrides,
  };
}
