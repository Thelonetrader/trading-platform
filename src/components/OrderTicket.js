import React, { useEffect, useMemo, useState } from 'react';
import { displayChangePct, displayPrice } from '../utils/quoteDisplay';

function fmtPrice(n, currency = 'USD') {
  if (n == null || Number.isNaN(Number(n)) || Number(n) <= 0) return '—';
  const v = Number(n);
  const sym = currency === 'USD' ? '$' : `${currency} `;
  return `${sym}${v.toFixed(v >= 100 ? 2 : v >= 1 ? 2 : 4)}`;
}

function fmtPct(pct) {
  if (pct == null || Number.isNaN(pct)) return '—';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function fmtSpread(bid, ask) {
  if (bid == null || ask == null || bid <= 0 || ask <= 0) return '—';
  return (ask - bid).toFixed(2);
}

function InfoRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, lineHeight: 1.5 }}>
      <span style={{ color: '#64748b', flexShrink: 0 }}>{label}</span>
      <span
        style={{
          color: value ? '#cbd5e1' : '#475569',
          textAlign: 'right',
          fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit',
          fontWeight: mono ? 600 : 500,
        }}
      >
        {value || '—'}
      </span>
    </div>
  );
}

function QuoteCell({ label, value, accent }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: accent || '#e2e8f0',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          marginTop: 2,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function OrderTicket({
  symbol,
  exchange,
  currency,
  quote,
  securityName,
  connection,
  settings,
  preset,
  onPlaced,
  fetchFundamentals,
}) {
  const [side, setSide] = useState(preset?.side || 'BUY');
  const [qty, setQty] = useState(preset?.qty ? String(preset.qty) : '');
  const [orderType, setOrderType] = useState('MKT');
  const [limitPrice, setLimitPrice] = useState('');
  const [tif, setTif] = useState('DAY');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [instrument, setInstrument] = useState(null);

  const routeExchange = (exchange || 'SMART').toUpperCase();
  const ccy = (currency || 'USD').toUpperCase();
  const mode = settings?.ib?.mode || 'paper';
  const accountId = (settings?.ib?.accountId || '').trim();
  const connected = connection.status === 'connected';
  const canTrade = connected && symbol;

  useEffect(() => {
    if (preset?.side) setSide(preset.side);
    if (preset?.qty != null) setQty(String(preset.qty));
  }, [preset]);

  useEffect(() => {
    setConfirm(false);
    setError(null);
  }, [symbol, routeExchange, ccy]);

  useEffect(() => {
    if (!symbol || !fetchFundamentals) {
      setInstrument(null);
      return;
    }
    let cancelled = false;
    fetchFundamentals({ ticker: symbol, exchange: routeExchange, currency: ccy })
      .then((res) => {
        if (!cancelled) setInstrument(res?.profile || null);
      })
      .catch(() => {
        if (!cancelled) setInstrument(null);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, routeExchange, ccy, fetchFundamentals]);

  const listingExchange = useMemo(() => {
    if (routeExchange !== 'SMART') return routeExchange;
    const fmp = instrument?.exchange;
    if (fmp) return String(fmp).toUpperCase();
    return null;
  }, [routeExchange, instrument]);

  const displayName = securityName || instrument?.companyName || null;
  const last = displayPrice(quote);
  const chg = displayChangePct(quote);
  const bid = quote?.bid > 0 ? quote.bid : null;
  const ask = quote?.ask > 0 ? quote.ask : null;
  const chgUp = chg != null && chg >= 0;

  const refPrice = useMemo(() => {
    if (orderType === 'LMT' && limitPrice) {
      const n = Number(limitPrice);
      if (Number.isFinite(n) && n > 0) return n;
    }
    if (side === 'BUY' && ask != null) return ask;
    if (side === 'SELL' && bid != null) return bid;
    return last;
  }, [orderType, limitPrice, side, bid, ask, last]);

  const estNotional = useMemo(() => {
    const q = Number(qty);
    if (!Number.isFinite(q) || q <= 0 || refPrice == null) return null;
    return q * refPrice;
  }, [qty, refPrice]);

  const orderTypeLabel = orderType === 'LMT' ? 'Limit' : 'Market';
  const tifLabel = tif === 'GTC' ? 'GTC' : 'Day';

  const submit = async () => {
    if (!canTrade || !qty) return;
    if (!confirm) {
      setConfirm(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await window.trading.placeOrder({
        symbol,
        exchange: routeExchange,
        currency: ccy,
        side,
        quantity: Number(qty),
        orderType,
        limitPrice: orderType === 'LMT' ? Number(limitPrice) : undefined,
        tif,
      });
      setConfirm(false);
      setQty('');
      if (onPlaced) onPlaced();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const setLimitFrom = (which) => {
    setOrderType('LMT');
    const v = which === 'bid' ? bid : which === 'ask' ? ask : last;
    if (v != null) setLimitPrice(String(Number(v).toFixed(2)));
  };

  const badgeColor = mode === 'live' ? '#ef4444' : '#6366f1';
  const connColor =
    connection.status === 'connected' ? '#22c55e' : connection.status === 'connecting' ? '#f59e0b' : '#64748b';

  return (
    <div
      style={{
        width: 312,
        flexShrink: 0,
        background: '#0a0f1e',
        border: '1px solid #1a2035',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid #1a2035',
          background: 'linear-gradient(180deg, #0f1629 0%, #0a0f1e 100%)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.14em' }}>
            ORDER TICKET
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.1em',
              padding: '3px 8px',
              borderRadius: 4,
              background: badgeColor,
              color: '#fff',
            }}
          >
            {mode.toUpperCase()}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11, color: '#64748b' }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: connColor,
              flexShrink: 0,
            }}
          />
          IB {connection.status}
          {connection.error ? ` · ${connection.error.slice(0, 40)}` : ''}
        </div>
      </div>

      <div style={{ padding: '14px 16px', borderBottom: '1px solid #1a2035', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#f8fafc', letterSpacing: '0.02em' }}>{symbol || '—'}</div>
        {displayName && (
          <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.35 }} title={displayName}>
            {displayName.length > 42 ? `${displayName.slice(0, 41)}…` : displayName}
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
          <Tag>STK</Tag>
          <Tag>{ccy}</Tag>
          {listingExchange && <Tag accent>Listed {listingExchange}</Tag>}
          <Tag muted>Route {routeExchange}</Tag>
        </div>
      </div>

      {symbol && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a2035', background: '#060b16' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <QuoteCell label="Last" value={fmtPrice(last, ccy)} accent={chgUp ? '#22c55e' : chg != null ? '#ef4444' : '#e2e8f0'} />
            <QuoteCell label="Bid" value={fmtPrice(bid, ccy)} />
            <QuoteCell label="Ask" value={fmtPrice(ask, ccy)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: chgUp ? '#22c55e' : '#ef4444' }}>{fmtPct(chg)}</span>
            <span style={{ color: '#64748b' }}>
              Spread {fmtSpread(bid, ask)}
              {quote?.close > 0 ? ` · Prior ${fmtPrice(quote.close, ccy)}` : ''}
            </span>
          </div>
          {!connected && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>Connect IB for live bid/ask.</div>
          )}
        </div>
      )}

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        <div
          style={{
            padding: 10,
            borderRadius: 8,
            background: '#060b16',
            border: '1px solid #1a2035',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <InfoRow label="Account" value={accountId || 'Default (managed)'} mono />
          <InfoRow label="Sec type" value="STK" />
          <InfoRow label="Currency" value={ccy} />
          <InfoRow label="Listing" value={listingExchange || (routeExchange !== 'SMART' ? routeExchange : 'Add FMP key or set Watchlist exchange')} />
          <InfoRow label="IB route" value={routeExchange} mono />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {['BUY', 'SELL'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSide(s);
                setConfirm(false);
              }}
              style={{
                flex: 1,
                padding: '9px 0',
                border: side === s ? 'none' : '1px solid #1a2035',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.06em',
                background: side === s ? (s === 'BUY' ? '#166534' : '#991b1b') : 'transparent',
                color: side === s ? '#fff' : '#64748b',
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <label style={labelStyle}>
          Quantity (shares)
          <input
            value={qty}
            onChange={(e) => {
              setQty(e.target.value.replace(/\D/g, ''));
              setConfirm(false);
            }}
            placeholder="0"
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          Order type
          <select
            value={orderType}
            onChange={(e) => {
              setOrderType(e.target.value);
              setConfirm(false);
            }}
            style={fieldStyle}
          >
            <option value="MKT">Market (MKT)</option>
            <option value="LMT">Limit (LMT)</option>
          </select>
        </label>

        {orderType === 'LMT' && (
          <div>
            <label style={labelStyle}>
              Limit price ({ccy})
              <input
                value={limitPrice}
                onChange={(e) => {
                  setLimitPrice(e.target.value);
                  setConfirm(false);
                }}
                placeholder={last != null ? String(last.toFixed(2)) : '0.00'}
                style={fieldStyle}
              />
            </label>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {[
                ['Bid', 'bid', bid],
                ['Mid', 'mid', last],
                ['Ask', 'ask', ask],
              ].map(([label, key, px]) => (
                <button
                  key={key}
                  type="button"
                  disabled={px == null}
                  onClick={() => setLimitFrom(key)}
                  style={{
                    ...chipBtn,
                    opacity: px == null ? 0.35 : 1,
                    cursor: px == null ? 'not-allowed' : 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <label style={labelStyle}>
          Time in force
          <select
            value={tif}
            onChange={(e) => {
              setTif(e.target.value);
              setConfirm(false);
            }}
            style={fieldStyle}
          >
            <option value="DAY">Day</option>
            <option value="GTC">Good till cancelled (GTC)</option>
          </select>
        </label>

        {estNotional != null && (
          <div style={{ fontSize: 11, color: '#64748b' }}>
            Est. notional{' '}
            <span style={{ color: '#e2e8f0', fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>
              {fmtPrice(estNotional, ccy)}
            </span>
            {refPrice != null && (
              <span style={{ color: '#475569' }}> @ {Number(refPrice).toFixed(2)}</span>
            )}
          </div>
        )}

        {confirm && symbol && (
          <div
            style={{
              padding: 10,
              borderRadius: 8,
              border: '1px solid #6366f1',
              background: '#6366f112',
              fontSize: 12,
              color: '#e2e8f0',
              lineHeight: 1.55,
            }}
          >
            <div style={{ fontSize: 10, color: '#818cf8', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>
              ORDER PREVIEW
            </div>
            {side} {qty} {symbol} · {orderTypeLabel}
            {orderType === 'LMT' && limitPrice ? ` @ ${limitPrice}` : ''} · {tifLabel}
            <br />
            {ccy} · Route {routeExchange}
            {listingExchange ? ` · Listed ${listingExchange}` : ''}
            {accountId ? ` · Acct ${accountId}` : ''}
          </div>
        )}

        {!connected && (
          <div style={{ fontSize: 12, color: '#f59e0b' }}>Connect IB Gateway in Settings to trade.</div>
        )}

        {error && <div style={{ fontSize: 12, color: '#ef4444' }}>{error}</div>}

        <button
          type="button"
          disabled={!canTrade || busy || !qty}
          onClick={submit}
          style={{
            padding: '11px 0',
            border: 'none',
            borderRadius: 8,
            background: confirm ? (side === 'SELL' ? '#991b1b' : '#166534') : '#6366f1',
            color: '#fff',
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: '0.04em',
            cursor: canTrade && qty ? 'pointer' : 'not-allowed',
            opacity: canTrade && qty ? 1 : 0.45,
            marginTop: 'auto',
          }}
        >
          {busy ? 'Sending…' : confirm ? `Confirm ${side}` : 'Review order'}
        </button>
        {confirm && (
          <button
            type="button"
            onClick={() => setConfirm(false)}
            style={{
              padding: '6px 0',
              border: 'none',
              background: 'transparent',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Back to edit
          </button>
        )}
      </div>
    </div>
  );
}

function Tag({ children, accent, muted }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.06em',
        padding: '3px 7px',
        borderRadius: 4,
        background: accent ? '#6366f122' : muted ? '#1a2035' : '#1e293b',
        color: accent ? '#a5b4fc' : muted ? '#64748b' : '#94a3b8',
        border: accent ? '1px solid #6366f144' : '1px solid #1a2035',
      }}
    >
      {children}
    </span>
  );
}

const labelStyle = { fontSize: 11, color: '#64748b', display: 'block' };

const fieldStyle = {
  display: 'block',
  width: '100%',
  marginTop: 4,
  background: '#060b16',
  border: '1px solid #1a2035',
  borderRadius: 8,
  color: '#f1f5f9',
  fontSize: 13,
  padding: '8px 10px',
  boxSizing: 'border-box',
};

const chipBtn = {
  flex: 1,
  padding: '5px 0',
  fontSize: 10,
  fontWeight: 600,
  borderRadius: 6,
  border: '1px solid #1a2035',
  background: '#0a0f1e',
  color: '#818cf8',
  cursor: 'pointer',
};
