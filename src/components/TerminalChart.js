import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isChartPopoutWindow } from '../ChartPopoutApp';

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

const PRICE_SCALE_W = 72;

function formatPriceLabel(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 10000) return n.toFixed(0);
  if (Math.abs(n) >= 1000) return n.toFixed(1);
  if (Math.abs(n) >= 100) return n.toFixed(2);
  if (Math.abs(n) >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

/** Evenly spaced “nice” price ticks between min and max. */
function nicePriceTicks(min, max, targetCount = 7) {
  const lo = Number(min);
  const hi = Number(max);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return [lo, hi];
  const range = hi - lo;
  const rough = range / Math.max(2, targetCount - 1);
  const mag = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / mag;
  let step = mag;
  if (norm <= 1.5) step = mag;
  else if (norm <= 3.5) step = 2 * mag;
  else if (norm <= 7.5) step = 5 * mag;
  else step = 10 * mag;

  const ticks = [];
  let v = Math.ceil(lo / step) * step;
  while (v <= hi + step * 0.01) {
    ticks.push(v);
    v += step;
  }
  if (ticks.length < 2) return [lo, hi];
  return ticks;
}

function priceToY(v, minL, maxH, padTop, innerH) {
  return padTop + innerH - ((v - minL) / (maxH - minL)) * innerH;
}

function CandleChart({ bars, width, height, barSize = '1 day', onViewChange }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const [viewStart, setViewStart] = useState(0);
  const [viewEnd, setViewEnd] = useState(0);

  useEffect(() => {
    if (!bars.length) {
      setViewStart(0);
      setViewEnd(0);
      return;
    }
    setViewStart(0);
    setViewEnd(bars.length - 1);
  }, [bars]);

  const visibleBars = useMemo(() => {
    if (!bars.length) return [];
    const s = Math.max(0, Math.min(viewStart, bars.length - 1));
    const e = Math.max(s, Math.min(viewEnd, bars.length - 1));
    return bars.slice(s, e + 1);
  }, [bars, viewStart, viewEnd]);

  const applyRange = useCallback(
    (start, end) => {
      if (!bars.length) return;
      const len = bars.length;
      const minSpan = Math.min(5, len);
      let s = Math.max(0, Math.min(start, len - 1));
      let e = Math.max(s, Math.min(end, len - 1));
      if (e - s + 1 < minSpan) {
        e = Math.min(len - 1, s + minSpan - 1);
        s = Math.max(0, e - minSpan + 1);
      }
      setViewStart(s);
      setViewEnd(e);
      onViewChange?.({ start: s, end: e, total: len });
    },
    [bars.length, onViewChange],
  );

  const zoomAt = useCallback(
    (factor, anchorIndex) => {
      if (!bars.length) return;
      const s = viewStart;
      const e = viewEnd;
      const span = e - s + 1;
      const center = anchorIndex ?? Math.floor((s + e) / 2);
      const newSpan = Math.max(
        Math.min(5, bars.length),
        Math.min(bars.length, Math.round(span * factor)),
      );
      let ns = Math.round(center - newSpan / 2);
      let ne = ns + newSpan - 1;
      if (ns < 0) {
        ne -= ns;
        ns = 0;
      }
      if (ne >= bars.length) {
        ns -= ne - bars.length + 1;
        ne = bars.length - 1;
      }
      applyRange(ns, ne);
    },
    [bars.length, viewStart, viewEnd, applyRange],
  );

  const panBy = useCallback(
    (barsDelta) => {
      if (!bars.length) return;
      let ns = viewStart + barsDelta;
      let ne = viewEnd + barsDelta;
      if (ns < 0) {
        ne -= ns;
        ns = 0;
      }
      if (ne >= bars.length) {
        ns -= ne - bars.length + 1;
        ne = bars.length - 1;
      }
      applyRange(ns, ne);
    },
    [bars.length, viewStart, viewEnd, applyRange],
  );

  const handleWheel = useCallback(
    (e) => {
      if (!bars.length) return;
      e.preventDefault();
      const anchor = hoverIndex != null ? viewStart + hoverIndex : undefined;
      if (e.deltaY < 0) zoomAt(0.72, anchor);
      else zoomAt(1.38, anchor);
    },
    [bars.length, hoverIndex, viewStart, zoomAt],
  );

  const pad = { top: 8, right: PRICE_SCALE_W, bottom: 22, left: 8 };
  const plotLeft = pad.left;
  const plotRight = width - pad.right;
  const volStripH = 36;
  const priceH = height - volStripH - pad.bottom;
  const innerW = Math.max(1, width - pad.left - pad.right);
  const innerH = Math.max(1, priceH - pad.top);

  const { minL, maxH, slots, slotW, maxVol } = useMemo(() => {
    if (!visibleBars.length) return { minL: 0, maxH: 1, slots: [], slotW: 1, maxVol: 0 };
    let minL = Infinity;
    let maxH = -Infinity;
    for (const b of visibleBars) {
      minL = Math.min(minL, b.low);
      maxH = Math.max(maxH, b.high);
    }
    const padY = (maxH - minL) * 0.05 || 1;
    minL -= padY;
    maxH += padY;
    const n = visibleBars.length;
    const slotW = innerW / n;
    let maxVol = 0;
    for (const b of visibleBars) maxVol = Math.max(maxVol, Number(b.volume) || 0);
    const slots = visibleBars.map((b, i) => {
      const y = (v) => priceToY(v, minL, maxH, pad.top, innerH);
      const cx = plotLeft + i * slotW + slotW / 2;
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
  }, [visibleBars, innerW, innerH, pad.top, plotLeft]);

  const canZoomIn = visibleBars.length > Math.min(5, bars.length);
  const canZoomOut = visibleBars.length < bars.length;
  const canPanLeft = viewStart > 0;
  const canPanRight = viewEnd < bars.length - 1;

  const volTop = priceH + 4;
  const volInnerH = volStripH - 8;

  const handleMouseMove = (e) => {
    if (!slots.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < plotLeft || x >= plotRight) {
      setHoverIndex(null);
      return;
    }
    const i = Math.floor((x - plotLeft) / slotW);
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

  if (!visibleBars.length) {
    return null;
  }

  const yTicks = nicePriceTicks(minL, maxH, 8);
  const hoverCloseY =
    hoverBar != null ? priceToY(hoverBar.close, minL, maxH, pad.top, innerH) : null;

  const tooltipLeft =
    hover && hoverIndex != null
      ? Math.min(width - 200, Math.max(plotLeft + 8, hover.cx - 100))
      : plotLeft;

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 6,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 10, color: '#475569' }}>
          {visibleBars.length} of {bars.length} bars · scroll to zoom
        </span>
        <button type="button" style={zoomBtn} disabled={!canPanLeft} onClick={() => panBy(-Math.max(1, Math.floor(visibleBars.length * 0.15)))}>
          ◀
        </button>
        <button type="button" style={zoomBtn} disabled={!canPanRight} onClick={() => panBy(Math.max(1, Math.floor(visibleBars.length * 0.15)))}>
          ▶
        </button>
        <button type="button" style={zoomBtn} disabled={!canZoomIn} onClick={() => zoomAt(0.72)}>
          −
        </button>
        <button type="button" style={zoomBtn} disabled={!canZoomOut} onClick={() => zoomAt(1.38)}>
          +
        </button>
        <button type="button" style={zoomBtn} onClick={() => applyRange(0, bars.length - 1)}>
          Reset
        </button>
      </div>
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
      <div onWheel={handleWheel} style={{ touchAction: 'none' }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label="Price chart"
        style={{ display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
      {/* Right price scale gutter */}
      <rect x={plotRight} y={0} width={width - plotRight} height={priceH} fill="#050912" />
      <line x1={plotRight + 0.5} x2={plotRight + 0.5} y1={pad.top} y2={priceH} stroke="#334155" strokeWidth={1} />

      {yTicks.map((v) => {
        const y = priceToY(v, minL, maxH, pad.top, innerH);
        return (
          <g key={v}>
            <line x1={plotLeft} x2={plotRight} y1={y} y2={y} stroke="#1a2035" strokeWidth={1} />
            <text
              x={width - 8}
              y={y + 4}
              textAnchor="end"
              fill="#94a3b8"
              fontSize={10}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            >
              {formatPriceLabel(v)}
            </text>
          </g>
        );
      })}

      {hoverCloseY != null && hoverBar && (
        <g pointerEvents="none">
          <line
            x1={plotLeft}
            x2={plotRight}
            y1={hoverCloseY}
            y2={hoverCloseY}
            stroke="#6366f1"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.85}
          />
          <rect
            x={plotRight + 4}
            y={hoverCloseY - 9}
            width={pad.right - 8}
            height={18}
            rx={3}
            fill="#6366f1"
          />
          <text
            x={width - 8}
            y={hoverCloseY + 4}
            textAnchor="end"
            fill="#f8fafc"
            fontSize={10}
            fontWeight={700}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          >
            {formatPriceLabel(hoverBar.close)}
          </text>
        </g>
      )}

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
      <line x1={plotLeft} x2={plotRight} y1={priceH} y2={priceH} stroke="#334155" strokeWidth={1} />
      <rect x={plotRight} y={priceH} width={width - plotRight} height={height - priceH} fill="#050912" />
      <text x={width - 8} y={volTop + volInnerH / 2 + 3} textAnchor="end" fill="#64748b" fontSize={9}>
        Vol
      </text>
      <rect
        x={plotLeft}
        y={pad.top}
        width={innerW}
        height={height - pad.top - 4}
        fill="transparent"
      />
      {slots.length > 0 && (
        <text x={plotLeft} y={height - 4} fill="#64748b" fontSize={10}>
          {formatBarDate(slots[0].b.time)}
        </text>
      )}
      {slots.length > 1 && (
        <text x={plotRight - 4} y={height - 4} textAnchor="end" fill="#64748b" fontSize={10}>
          {formatBarDate(slots[slots.length - 1].b.time)}
        </text>
      )}
      </svg>
      </div>
    </div>
  );
}

const zoomBtn = {
  padding: '2px 8px',
  borderRadius: 5,
  border: '1px solid #1a2035',
  background: '#0a0f1e',
  color: '#818cf8',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
};

export default function TerminalChart({
  symbol,
  exchange,
  currency,
  primaryExch,
  connection,
  fetchHistoricalBars,
  initialDuration = '1 Y',
  initialBarSize = '1 day',
  expanded = false,
}) {
  const [duration, setDuration] = useState(initialDuration);
  const [barSize, setBarSize] = useState(initialBarSize);
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
        {
          ticker: symbol,
          exchange: exchange || 'SMART',
          currency: currency || 'USD',
          primaryExch: primaryExch || undefined,
        },
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
  }, [symbol, exchange, currency, primaryExch, connection?.status, fetchHistoricalBars, duration, barSize]);

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

  const chartHeight = expanded ? Math.max(400, typeof window !== 'undefined' ? window.innerHeight - 140 : 480) : 280;

  const popOut = () => {
    if (!symbol || typeof window === 'undefined' || !window.trading?.openChartWindow) return;
    window.trading.openChartWindow({
      symbol,
      exchange: exchange || 'SMART',
      currency: currency || 'USD',
      primaryExch: primaryExch || undefined,
      duration,
      barSize,
    });
  };

  return (
    <div
      ref={containerRef}
      style={{
        background: '#060b16',
        border: '1px solid #1a2035',
        borderRadius: 10,
        padding: '12px 12px 8px',
        minHeight: expanded ? chartHeight : 280,
        height: expanded ? '100%' : undefined,
        display: expanded ? 'flex' : undefined,
        flexDirection: expanded ? 'column' : undefined,
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
        {symbol && !expanded && !isChartPopoutWindow() && typeof window !== 'undefined' && window.trading?.openChartWindow && (
          <button type="button" onClick={popOut} style={btnStyle(false)} title="Open chart in new window">
            Pop out
          </button>
        )}
      </div>
      {error && !loading && (
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{error}</div>
      )}
      {loading && bars.length === 0 ? (
        <div style={{ height: chartHeight - 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', flex: expanded ? 1 : undefined }}>
          Loading bars from IB…
        </div>
      ) : (
        <div style={{ flex: expanded ? 1 : undefined, minHeight: chartHeight - 40 }}>
          <CandleChart bars={bars} width={width} height={chartHeight - 48} barSize={barSize} />
        </div>
      )}
    </div>
  );
}
