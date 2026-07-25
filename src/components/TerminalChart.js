import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const DURATIONS = [
  { id: '3 M', label: '3M' },
  { id: '6 M', label: '6M' },
  { id: '1 Y', label: '1Y' },
  { id: '2 Y', label: '2Y' },
];

const BAR_SIZES = [
  { id: '1 day', label: 'Daily' },
  { id: '1 week', label: 'Weekly' },
];

function formatBarDate(time) {
  const s = String(time || '');
  if (s.length === 8 && /^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  return s;
}

function formatBarDateTime(time, barSize) {
  const s = String(time || '');
  if (/^\d{8}$/.test(s)) {
    const d = new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T16:00:00`);
    if (!Number.isNaN(d.getTime())) {
      if (barSize === '1 week') {
        return d.toLocaleString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
      return d.toLocaleString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  if (/^\d+$/.test(s) && s.length >= 10) {
    const d = new Date(Number(s) * 1000);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }
  return formatBarDate(time);
}

function formatVolume(vol) {
  const v = Number(vol);
  if (!Number.isFinite(v) || v <= 0) return '—';
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(Math.round(v));
}

function CandleChart({ bars, width, height, barSize = '1 day' }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const pad = { top: 8, right: 8, bottom: 22, left: 48 };
  const volStripH = 36;
  const priceH = height - volStripH - pad.bottom;
  const innerW = Math.max(1, width - pad.left - pad.right);
  const innerH = Math.max(1, priceH - pad.top);

  const { minL, maxH, slots, slotW, maxVol } = useMemo(() => {
    if (!bars.length) return { minL: 0, maxH: 1, slots: [], slotW: 1, maxVol: 0 };
    let minL = Infinity;
    let maxH = -Infinity;
    for (const b of bars) {
      minL = Math.min(minL, b.low);
      maxH = Math.max(maxH, b.high);
    }
    const padY = (maxH - minL) * 0.05 || 1;
    minL -= padY;
    maxH += padY;
    const n = bars.length;
    const slotW = innerW / n;
    let maxVol = 0;
    for (const b of bars) maxVol = Math.max(maxVol, Number(b.volume) || 0);
    const slots = bars.map((b, i) => {
      const y = (v) => pad.top + innerH - ((v - minL) / (maxH - minL)) * innerH;
      const cx = pad.left + i * slotW + slotW / 2;
      const bodyW = Math.max(2, slotW * 0.55);
      const up = b.close >= b.open;
      const top = y(Math.max(b.open, b.close));
      const bot = y(Math.min(b.open, b.close));
      const bodyH = Math.max(1, bot - top);
      return {
        cx,
        bodyW,
        top,
        bodyH,
        wickTop: y(b.high),
        wickBot: y(b.low),
        up,
        b,
      };
    });
    return { minL, maxH, slots, slotW, maxVol };
  }, [bars, innerW, innerH, pad.top]);

  const volTop = priceH + 4;
  const volInnerH = volStripH - 8;

  const handleMouseMove = (e) => {
    if (!slots.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < pad.left || x > width - pad.right) {
      setHoverIndex(null);
      return;
    }
    const i = Math.floor((x - pad.left) / slotW);
    setHoverIndex(Math.max(0, Math.min(slots.length - 1, i)));
  };

  const hover = hoverIndex != null ? slots[hoverIndex] : null;
  const hoverBar = hover?.b;

  if (!bars.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 13 }}>
        No bars returned
      </div>
    );
  }

  const yTicks = [minL, (minL + maxH) / 2, maxH];

  const tooltipLeft =
    hover && hoverIndex != null
      ? Math.min(width - 200, Math.max(pad.left, hover.cx - 100))
      : pad.left;

  return (
    <div style={{ position: 'relative' }}>
      {hoverBar && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: tooltipLeft,
            zIndex: 2,
            pointerEvents: 'none',
            background: '#0a0f1ee6',
            border: '1px solid #334155',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 11,
            color: '#e2e8f0',
            lineHeight: 1.55,
            minWidth: 168,
            boxShadow: '0 8px 24px #00000060',
          }}
        >
          <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
            {formatBarDateTime(hoverBar.time, barSize)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 10px', color: '#94a3b8' }}>
            <span>O</span>
            <span style={{ color: '#f1f5f9', fontVariantNumeric: 'tabular-nums' }}>{hoverBar.open.toFixed(2)}</span>
            <span>H</span>
            <span style={{ color: '#22c55e', fontVariantNumeric: 'tabular-nums' }}>{hoverBar.high.toFixed(2)}</span>
            <span>L</span>
            <span style={{ color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}>{hoverBar.low.toFixed(2)}</span>
            <span>C</span>
            <span style={{ color: hover.up ? '#22c55e' : '#ef4444', fontVariantNumeric: 'tabular-nums' }}>
              {hoverBar.close.toFixed(2)}
            </span>
            <span>Vol</span>
            <span style={{ color: '#818cf8', fontVariantNumeric: 'tabular-nums' }}>{formatVolume(hoverBar.volume)}</span>
          </div>
        </div>
      )}
      <svg
        width={width}
        height={height}
        role="img"
        aria-label="Price chart"
        style={{ display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
      {yTicks.map((v, i) => {
        const y = pad.top + innerH - ((v - minL) / (maxH - minL)) * innerH;
        return (
          <g key={i}>
            <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#1a2035" strokeWidth={1} />
            <text x={pad.left - 6} y={y + 4} textAnchor="end" fill="#475569" fontSize={10}>
              {v.toFixed(2)}
            </text>
          </g>
        );
      })}
      {slots.map((s, i) => {
        const color = s.up ? '#22c55e' : '#ef4444';
        const dimmed = hoverIndex != null && hoverIndex !== i;
        const opacity = dimmed ? 0.35 : 1;
        return (
          <g key={i} opacity={opacity}>
            <line x1={s.cx} x2={s.cx} y1={s.wickTop} y2={s.wickBot} stroke={color} strokeWidth={1} />
            <rect x={s.cx - s.bodyW / 2} y={s.top} width={s.bodyW} height={s.bodyH} fill={color} />
          </g>
        );
      })}
      {hover && (
        <line
          x1={hover.cx}
          x2={hover.cx}
          y1={pad.top}
          y2={priceH}
          stroke="#6366f1"
          strokeWidth={1}
          strokeDasharray="4 3"
          pointerEvents="none"
        />
      )}
      {maxVol > 0 &&
        slots.map((s, i) => {
          const v = Number(s.b.volume) || 0;
          const h = maxVol > 0 ? (v / maxVol) * volInnerH : 0;
          const dimmed = hoverIndex != null && hoverIndex !== i;
          return (
            <rect
              key={`vol-${i}`}
              x={s.cx - s.bodyW / 2}
              y={volTop + volInnerH - h}
              width={s.bodyW}
              height={Math.max(h, v > 0 ? 1 : 0)}
              fill={s.up ? '#22c55e' : '#ef4444'}
              opacity={dimmed ? 0.25 : 0.55}
              pointerEvents="none"
            />
          );
        })}
      <line x1={pad.left} x2={width - pad.right} y1={priceH} y2={priceH} stroke="#1a2035" strokeWidth={1} />
      <text x={pad.left - 6} y={volTop + volInnerH / 2 + 3} textAnchor="end" fill="#475569" fontSize={9}>
        Vol
      </text>
      <rect
        x={pad.left}
        y={pad.top}
        width={innerW}
        height={height - pad.top - 4}
        fill="transparent"
      />
      {slots.length > 0 && (
        <text x={pad.left} y={height - 4} fill="#64748b" fontSize={10}>
          {formatBarDate(slots[0].b.time)}
        </text>
      )}
      {slots.length > 1 && (
        <text x={width - pad.right} y={height - 4} textAnchor="end" fill="#64748b" fontSize={10}>
          {formatBarDate(slots[slots.length - 1].b.time)}
        </text>
      )}
      </svg>
    </div>
  );
}

export default function TerminalChart({
  symbol,
  exchange,
  currency,
  connection,
  fetchHistoricalBars,
}) {
  const [duration, setDuration] = useState('1 Y');
  const [barSize, setBarSize] = useState('1 day');
  const [bars, setBars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [width, setWidth] = useState(600);
  const containerRef = useRef(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width));
    });
    ro.observe(node);
    setWidth(Math.floor(node.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, [symbol]);

  const load = useCallback(async () => {
    if (!symbol || !fetchHistoricalBars) return;
    if (connection?.status !== 'connected') {
      setError('Connect IB in Settings for historical bars');
      setBars([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetchHistoricalBars(
        { ticker: symbol, exchange: exchange || 'SMART', currency: currency || 'USD' },
        { duration, barSize },
      );
      if (res.error) {
        setError(res.error);
        setBars([]);
      } else {
        setBars(res.bars || []);
        if (!res.bars?.length) setError('No historical data — check symbol and IB market data');
      }
    } catch (e) {
      setError(e.message || 'Historical request failed');
      setBars([]);
    } finally {
      setLoading(false);
    }
  }, [symbol, exchange, currency, connection?.status, fetchHistoricalBars, duration, barSize]);

  useEffect(() => {
    load();
  }, [load]);

  const btnStyle = (active) => ({
    padding: '4px 10px',
    borderRadius: 6,
    border: `1px solid ${active ? '#6366f1' : '#1a2035'}`,
    background: active ? '#6366f118' : 'transparent',
    color: active ? '#818cf8' : '#64748b',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  });

  return (
    <div
      ref={containerRef}
      style={{
        background: '#060b16',
        border: '1px solid #1a2035',
        borderRadius: 10,
        padding: '12px 12px 8px',
        minHeight: 280,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
          Historical
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {DURATIONS.map((d) => (
            <button key={d.id} type="button" style={btnStyle(duration === d.id)} onClick={() => setDuration(d.id)}>
              {d.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {BAR_SIZES.map((b) => (
            <button key={b.id} type="button" style={btnStyle(barSize === b.id)} onClick={() => setBarSize(b.id)}>
              {b.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={load} disabled={loading} style={{ ...btnStyle(false), marginLeft: 'auto' }}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>
      {error && !loading && (
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{error}</div>
      )}
      {loading && bars.length === 0 ? (
        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
          Loading bars from IB…
        </div>
      ) : (
        <CandleChart bars={bars} width={width} height={280} barSize={barSize} />
      )}
    </div>
  );
}
