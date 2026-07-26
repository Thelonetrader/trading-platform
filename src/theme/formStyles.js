/** Shared form + panel styles using CSS theme variables. */

export function getLabelStyle() {
  return {
    fontSize: 11,
    color: 'var(--tp-text-faint)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 6,
    display: 'block',
  };
}

export function getInputStyle() {
  return {
    background: 'var(--tp-bg-input)',
    border: '1px solid var(--tp-border)',
    borderRadius: 8,
    color: 'var(--tp-text-strong)',
    fontSize: 13,
    padding: '8px 12px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  };
}

export function getPanelStyle() {
  return {
    background: 'var(--tp-bg-panel)',
    border: '1px solid var(--tp-border)',
    borderRadius: 12,
  };
}

/** Segmented tabs (Screener / Chart Scanner setup). */
export function getSegmentTabStyle(active) {
  return {
    padding: '8px 14px',
    borderRadius: 8,
    border: active ? '1px solid var(--tp-accent-border)' : '1px solid var(--tp-border)',
    background: active ? 'var(--tp-accent-soft)' : 'var(--tp-bg-input)',
    color: active ? 'var(--tp-accent-on-soft)' : 'var(--tp-text-muted)',
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    cursor: 'pointer',
  };
}

/** Dropdown / typeahead list row. */
export function getListOptionStyle({ active = false, selected = false, muted = false } = {}) {
  return {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '8px 12px',
    border: 'none',
    background: active
      ? 'var(--tp-list-active-bg)'
      : selected
        ? 'var(--tp-accent-soft)'
        : 'transparent',
    color: muted ? 'var(--tp-text-muted)' : active ? 'var(--tp-text-strong)' : 'var(--tp-text)',
    fontSize: 13,
    cursor: 'default',
    fontStyle: muted ? 'italic' : undefined,
  };
}

export function getAccentChipStyle() {
  return {
    background: 'var(--tp-accent-soft)',
    border: '1px solid var(--tp-accent-border)',
    color: 'var(--tp-accent-on-soft)',
  };
}
