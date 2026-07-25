import React, { useMemo } from 'react';

function downsample(points, maxPoints = 320) {
  if (!points?.length || points.length <= maxPoints) return points || [];
  const step = Math.ceil(points.length / maxPoints);
  const out = [];
  for (let i = 0; i < points.length; i += step) out.push(points[i]);
  if (out[out.length - 1] !== points[points.length - 1]) {
    out.push(points[points.length - 1]);
  }
  return out;
}

export default function BacktestEquityChart({
  equityCurve = [],
  buyHoldCurve = [],
  walkForwardCurve = [],
  initialCapital,
  height = 200,
  symbol = '',
}) {
  const { strategyPath, benchPath, wfPath, minY, maxY, finalStr, finalBh, finalWf } = useMemo(() => {
    const strat = downsample(equityCurve);
    const bench = downsample(buyHoldCurve);
    const wf = downsample(walkForwardCurve);
    const all = [...strat, ...bench, ...wf];
    if (!all.length) {
      return {
        strategyPath: '',
        benchPath: '',
        minY: 0,
        maxY: 1,
        finalStr: initialCapital,
        finalBh: initialCapital,
        finalWf: initialCapital,
        wfPath: '',
      };
    }
    let min = Infinity;
    let max = -Infinity;
    for (const p of all) {
      min = Math.min(min, p.equity);
      max = Math.max(max, p.equity);
    }
    const pad = (max - min) * 0.06 || max * 0.02 || 1;
    min -= pad;
    max += pad;
    const w = 640;
    const h = height - 28;

    const toPath = (pts) => {
      if (pts.length < 2) return '';
      return pts
        .map((p, i) => {
          const x = (i / (pts.length - 1)) * w;
          const y = h - ((p.equity - min) / (max - min)) * h;
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
    };

    return {
      strategyPath: toPath(strat),
      benchPath: toPath(bench),
      wfPath: toPath(wf),
      minY: min,
      maxY: max,
      finalStr: strat.length ? strat[strat.length - 1].equity : initialCapital,
      finalBh: bench.length ? bench[bench.length - 1].equity : initialCapital,
      finalWf: wf.length ? wf[wf.length - 1].equity : null,
    };
  }, [buyHoldCurve, equityCurve, walkForwardCurve, height, initialCapital]);

  if (!equityCurve.length) {
    return (
      <div style={{ fontSize: 12, color: '#64748b', padding: 16 }}>
        No equity curve — run backtest with enough bars and trades.
      </div>
    );
  }

  const w = 640;
  const h = height - 28;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
          {symbol ? `${symbol} · ` : ''}Equity curve
        </span>
        <span style={{ fontSize: 11, color: '#64748b' }}>
          <span style={{ color: '#2dd4bf' }}>● Strategy</span>
          {' · '}
          <span style={{ color: '#94a3b8' }}>● Buy &amp; hold</span>
          {walkForwardCurve.length > 0 && (
            <>
              {' · '}
              <span style={{ color: '#a78bfa' }}>● Walk-forward OOS</span>
            </>
          )}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        width="100%"
        height={height}
        style={{ display: 'block', background: '#060b16', borderRadius: 8 }}
        preserveAspectRatio="none"
      >
        <line x1="0" y1={h} x2={w} y2={h} stroke="#1a2035" strokeWidth="1" />
        {benchPath && (
          <path d={benchPath} fill="none" stroke="#475569" strokeWidth="1.5" opacity="0.85" />
        )}
        {wfPath && (
          <path d={wfPath} fill="none" stroke="#a78bfa" strokeWidth="2" strokeDasharray="4 3" />
        )}
        {strategyPath && (
          <path d={strategyPath} fill="none" stroke="#2dd4bf" strokeWidth="2" />
        )}
        <text x="8" y="14" fill="#64748b" fontSize="10" fontFamily="ui-monospace, monospace">
          {maxY.toFixed(0)}
        </text>
        <text x="8" y={h - 4} fill="#64748b" fontSize="10" fontFamily="ui-monospace, monospace">
          {minY.toFixed(0)}
        </text>
      </svg>
      <div
        style={{
          display: 'flex',
          gap: 20,
          marginTop: 8,
          fontSize: 12,
          fontFamily: 'ui-monospace, monospace',
        }}
      >
        <span style={{ color: '#2dd4bf' }}>Final strategy ${finalStr?.toFixed?.(0) ?? finalStr}</span>
        <span style={{ color: '#94a3b8' }}>Final B&amp;H ${finalBh?.toFixed?.(0) ?? finalBh}</span>
        {finalWf != null && walkForwardCurve.length > 0 && (
          <span style={{ color: '#a78bfa' }}>WF OOS ${finalWf?.toFixed?.(0) ?? finalWf}</span>
        )}
      </div>
    </div>
  );
}
