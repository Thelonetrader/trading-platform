import React, { useEffect, useRef } from 'react';

export default function CommandBar({ open, onClose, onSubmit, message }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(560px, 92vw)',
          background: 'var(--tp-bg-panel)',
          border: '1px solid var(--tp-border)',
          borderRadius: 12,
          padding: 16,
          boxShadow: '0 24px 48px rgba(0,0,0,0.45)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 11, color: 'var(--tp-text-faint)', marginBottom: 8, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Command
        </div>
        <input
          ref={inputRef}
          placeholder="Symbol, buy AAPL 10, go watchlist, help"
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter') {
              onSubmit(e.target.value);
              e.target.value = '';
            }
          }}
          style={{
            width: '100%',
            background: 'var(--tp-bg-input)',
            border: '1px solid #334155',
            borderRadius: 8,
            color: 'var(--tp-text-strong)',
            fontSize: 15,
            padding: '12px 14px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {message && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--tp-text-secondary)' }}>{message}</div>
        )}
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--tp-text-dim)' }}>
          Esc close · Enter run · try <code style={{ color: '#6366f1' }}>help</code>
        </div>
      </div>
    </div>
  );
}
