import React from 'react';
import BacktestEquityChart from './BacktestEquityChart';
import {
  BACKTEST_BAR_OPTIONS,
  DEFAULT_BACKTEST_PREFS,
  saveBacktestPrefs,
} from '../utils/backtestConfig';
import { walkForwardPresetOptions } from '../utils/walkForwardBacktest';

function confidenceColor(score) {
  if (score >= 4) return '#22c55e';
  if (score >= 2.5) return '#eab308';
  return '#f97316';
}

export default function BacktestResultsPanel({
  prefs,
  onPrefsChange,
  backtestSummaries,
  backtestTrades,
  backtestAggregate,
  backtestMeta,
  backtestBarSize = '1 day',
  selectedSymbol,
  onSelectSymbol,
  onOpenTerminal,
  onExportCsv,
  inputStyle,
  labelStyle,
}) {
  const selected = backtestSummaries.find((s) => s.symbol === selectedSymbol);

  const updatePref = (key, value) => {
    const next = { ...prefs, [key]: value };
    onPrefsChange(next);
    saveBacktestPrefs(next);
  };

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tp-text-strong)', marginBottom: 8 }}>
        Strategy backtest lab
      </div>
      <p style={{ fontSize: 12, color: 'var(--tp-text-muted)', marginBottom: 14, maxWidth: 720, lineHeight: 1.5 }}>
        Signals are computed at each bar close using only past data. Fills default to the{' '}
        <strong style={{ color: 'var(--tp-text-secondary)' }}>next bar open</strong> with slippage and commission.
        Out-of-sample (OOS) metrics use the last portion of history so you can spot overfitting before
        trusting a strategy. With <strong style={{ color: 'var(--tp-text-secondary)' }}>walk-forward</strong> enabled, rolling
        train/test windows compound capital across folds — the strongest check before live use.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
          background: 'var(--tp-bg-panel)',
          border: '1px solid var(--tp-border)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div>
          <label style={labelStyle}>History (backtest)</label>
          <select
            style={inputStyle}
            value={prefs.backtestDurationKey}
            onChange={(e) => updatePref('backtestDurationKey', e.target.value)}
          >
            {BACKTEST_BAR_OPTIONS.map((b) => (
              <option key={b.durationKey || b.duration} value={b.durationKey || b.duration}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Fill model</label>
          <select
            style={inputStyle}
            value={prefs.fillModel}
            onChange={(e) => updatePref('fillModel', e.target.value)}
          >
            <option value="next_open">Next bar open (realistic)</option>
            <option value="bar_close">Same bar close (optimistic)</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Starting capital</label>
          <input
            style={inputStyle}
            type="number"
            min={1000}
            step={1000}
            value={prefs.initialCapital}
            onChange={(e) => updatePref('initialCapital', Number(e.target.value))}
          />
        </div>
        <div>
          <label style={labelStyle}>Deploy % of cash</label>
          <input
            style={inputStyle}
            type="number"
            min={10}
            max={100}
            value={prefs.positionPct}
            onChange={(e) => updatePref('positionPct', Number(e.target.value))}
          />
        </div>
        <div>
          <label style={labelStyle}>Commission (bps/side)</label>
          <input
            style={inputStyle}
            type="number"
            min={0}
            step={1}
            value={prefs.commissionBps}
            onChange={(e) => updatePref('commissionBps', Number(e.target.value))}
          />
        </div>
        <div>
          <label style={labelStyle}>Slippage (bps/side)</label>
          <input
            style={inputStyle}
            type="number"
            min={0}
            step={1}
            value={prefs.slippageBps}
            onChange={(e) => updatePref('slippageBps', Number(e.target.value))}
          />
        </div>
        <div>
          <label style={labelStyle}>Stop loss % (0=off)</label>
          <input
            style={inputStyle}
            type="number"
            min={0}
            step={0.5}
            value={prefs.stopLossPct}
            onChange={(e) => updatePref('stopLossPct', Number(e.target.value))}
          />
        </div>
        <div>
          <label style={labelStyle}>Take profit % (0=off)</label>
          <input
            style={inputStyle}
            type="number"
            min={0}
            step={0.5}
            value={prefs.takeProfitPct}
            onChange={(e) => updatePref('takeProfitPct', Number(e.target.value))}
          />
        </div>
        <div>
          <label style={labelStyle}>Max hold (bars, 0=off)</label>
          <input
            style={inputStyle}
            type="number"
            min={0}
            step={1}
            value={prefs.maxHoldBars}
            onChange={(e) => updatePref('maxHoldBars', Number(e.target.value))}
          />
        </div>
        <div>
          <label style={labelStyle}>OOS holdout %</label>
          <input
            style={inputStyle}
            type="number"
            min={10}
            max={50}
            value={prefs.oosSplitPct}
            onChange={(e) => updatePref('oosSplitPct', Number(e.target.value))}
          />
        </div>
        <div>
          <label style={labelStyle}>Min signal strength</label>
          <select
            style={inputStyle}
            value={prefs.minStrength}
            onChange={(e) => updatePref('minStrength', Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>
        </div>
        <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--tp-border)', paddingTop: 12 }}>
          <label
            style={{
              ...labelStyle,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textTransform: 'none',
              letterSpacing: 0,
              color: 'var(--tp-text-secondary)',
              fontSize: 13,
            }}
          >
            <input
              type="checkbox"
              checked={prefs.walkForwardEnabled !== false}
              onChange={(e) => updatePref('walkForwardEnabled', e.target.checked)}
            />
            Walk-forward rolling windows (recommended)
          </label>
        </div>
        {prefs.walkForwardEnabled !== false && (
          <>
            <div>
              <label style={labelStyle}>WF window preset</label>
              <select
                style={inputStyle}
                value={prefs.wfPreset}
                onChange={(e) => updatePref('wfPreset', e.target.value)}
              >
                {walkForwardPresetOptions(backtestBarSize).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {prefs.wfPreset === 'custom' && (
              <>
                <div>
                  <label style={labelStyle}>Train bars</label>
                  <input
                    style={inputStyle}
                    type="number"
                    min={55}
                    value={prefs.wfTrainBars}
                    onChange={(e) => updatePref('wfTrainBars', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Test bars</label>
                  <input
                    style={inputStyle}
                    type="number"
                    min={5}
                    value={prefs.wfTestBars}
                    onChange={(e) => updatePref('wfTestBars', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Step bars</label>
                  <input
                    style={inputStyle}
                    type="number"
                    min={1}
                    value={prefs.wfStepBars}
                    onChange={(e) => updatePref('wfStepBars', Number(e.target.value))}
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>

      {backtestAggregate && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
            marginBottom: 16,
            padding: '14px 16px',
            background: '#042f2e55',
            border: '1px solid #115e5955',
            borderRadius: 10,
            fontSize: 12,
            color: '#99f6e4',
          }}
        >
          <div>
            <div style={{ color: 'var(--tp-text-muted)', fontSize: 10, textTransform: 'uppercase' }}>Symbols</div>
            <strong>{backtestAggregate.numSymbols}</strong>
          </div>
          <div>
            <div style={{ color: 'var(--tp-text-muted)', fontSize: 10, textTransform: 'uppercase' }}>Avg return</div>
            <strong
              style={{
                color: backtestAggregate.avgReturnPct >= 0 ? '#22c55e' : '#ef4444',
              }}
            >
              {backtestAggregate.avgReturnPct >= 0 ? '+' : ''}
              {backtestAggregate.avgReturnPct.toFixed(2)}%
            </strong>
          </div>
          <div>
            <div style={{ color: 'var(--tp-text-muted)', fontSize: 10, textTransform: 'uppercase' }}>Avg CAGR</div>
            <strong>{backtestAggregate.avgCagrPct.toFixed(2)}%</strong>
          </div>
          <div>
            <div style={{ color: 'var(--tp-text-muted)', fontSize: 10, textTransform: 'uppercase' }}>Avg Sharpe</div>
            <strong>{backtestAggregate.avgSharpe.toFixed(2)}</strong>
          </div>
          <div>
            <div style={{ color: 'var(--tp-text-muted)', fontSize: 10, textTransform: 'uppercase' }}>Beat B&amp;H</div>
            <strong>{backtestAggregate.pctBeatBuyHold.toFixed(0)}%</strong>
          </div>
          <div>
            <div style={{ color: 'var(--tp-text-muted)', fontSize: 10, textTransform: 'uppercase' }}>Avg confidence</div>
            <strong>{backtestAggregate.avgConfidence.toFixed(1)}/5</strong>
          </div>
          <div>
            <div style={{ color: 'var(--tp-text-muted)', fontSize: 10, textTransform: 'uppercase' }}>Round-trips</div>
            <strong>{backtestAggregate.totalTrades}</strong>
          </div>
          {backtestAggregate.avgWfEfficiency != null && (
            <>
              <div>
                <div style={{ color: 'var(--tp-text-muted)', fontSize: 10, textTransform: 'uppercase' }}>WF +ve folds</div>
                <strong>{backtestAggregate.avgWfEfficiency.toFixed(0)}%</strong>
              </div>
              <div>
                <div style={{ color: 'var(--tp-text-muted)', fontSize: 10, textTransform: 'uppercase' }}>Avg WF OOS</div>
                <strong>{backtestAggregate.avgWfCompoundedReturn?.toFixed(2)}%</strong>
              </div>
            </>
          )}
        </div>
      )}

      {backtestMeta && (
        <p style={{ fontSize: 11, color: 'var(--tp-text-faint)', marginBottom: 12 }}>{backtestMeta}</p>
      )}

      {backtestSummaries.length > 0 && (
        <>
          <div style={{ overflow: 'auto', border: '1px solid var(--tp-border)', borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
              <thead>
                <tr style={{ background: 'var(--tp-bg-input)' }}>
                  {[
                    'Symbol',
                    'Conf.',
                    'Trades',
                    'Return%',
                    'CAGR%',
                    'Sharpe',
                    'Max DD%',
                    'PF',
                    'vs B&H',
                    'WF OOS%',
                    'WF +ve',
                    'Win%',
                    '',
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '10px 10px',
                        fontSize: 10,
                        color: 'var(--tp-text-muted)',
                        textTransform: 'uppercase',
                        borderBottom: '1px solid var(--tp-border)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {backtestSummaries.map((row) => {
                  const st = row.stats;
                  const oos = row.oosStats;
                  const wf = row.walkForward;
                  const conf = row.confidence?.score ?? 0;
                  const active = selectedSymbol === row.symbol;
                  return (
                    <tr
                      key={row.symbol}
                      onClick={() => onSelectSymbol?.(row.symbol)}
                      style={{
                        borderBottom: '1px solid #0f1424',
                        background: active ? '#0f172a' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <td style={{ padding: '10px 10px', fontWeight: 700, color: 'var(--tp-text-strong)' }}>
                        {row.symbol}
                      </td>
                      <td
                        style={{
                          padding: '10px 10px',
                          fontWeight: 800,
                          color: confidenceColor(conf),
                        }}
                      >
                        {st ? conf.toFixed(1) : '—'}
                      </td>
                      <td style={{ padding: '10px 10px', color: 'var(--tp-text-secondary)' }}>
                        {st ? st.numTrades : '—'}
                      </td>
                      <td
                        style={{
                          padding: '10px 10px',
                          fontFamily: 'ui-monospace, monospace',
                          color:
                            st == null
                              ? '#475569'
                              : st.totalReturnPct >= 0
                                ? '#22c55e'
                                : '#ef4444',
                        }}
                      >
                        {st
                          ? `${st.totalReturnPct >= 0 ? '+' : ''}${st.totalReturnPct.toFixed(2)}%`
                          : row.error || '—'}
                      </td>
                      <td style={{ padding: '10px 10px', fontFamily: 'ui-monospace, monospace' }}>
                        {st ? `${st.cagrPct.toFixed(2)}%` : '—'}
                      </td>
                      <td style={{ padding: '10px 10px', fontFamily: 'ui-monospace, monospace' }}>
                        {st ? st.sharpe.toFixed(2) : '—'}
                      </td>
                      <td style={{ padding: '10px 10px', fontFamily: 'ui-monospace, monospace', color: '#f59e0b' }}>
                        {st ? `${st.maxDrawdownPct.toFixed(1)}%` : '—'}
                      </td>
                      <td style={{ padding: '10px 10px', fontFamily: 'ui-monospace, monospace' }}>
                        {st ? (st.profitFactor > 100 ? '∞' : st.profitFactor.toFixed(2)) : '—'}
                      </td>
                      <td
                        style={{
                          padding: '10px 10px',
                          fontFamily: 'ui-monospace, monospace',
                          color:
                            st?.alphaVsHoldPct == null
                              ? '#475569'
                              : st.alphaVsHoldPct >= 0
                                ? '#22c55e'
                                : '#ef4444',
                        }}
                      >
                        {st?.alphaVsHoldPct != null
                          ? `${st.alphaVsHoldPct >= 0 ? '+' : ''}${st.alphaVsHoldPct.toFixed(2)}%`
                          : '—'}
                      </td>
                      <td style={{ padding: '10px 10px', fontFamily: 'ui-monospace, monospace' }}>
                        {wf?.numFolds
                          ? `${wf.compoundedReturnPct >= 0 ? '+' : ''}${wf.compoundedReturnPct.toFixed(2)}%`
                          : oos
                            ? `${oos.totalReturnPct >= 0 ? '+' : ''}${oos.totalReturnPct.toFixed(2)}%`
                            : '—'}
                      </td>
                      <td style={{ padding: '10px 10px', fontFamily: 'ui-monospace, monospace', color: '#a78bfa' }}>
                        {wf?.numFolds
                          ? `${wf.wfEfficiencyPct.toFixed(0)}% (${wf.numFolds})`
                          : '—'}
                      </td>
                      <td style={{ padding: '10px 10px', fontFamily: 'ui-monospace, monospace' }}>
                        {st ? `${st.winRatePct.toFixed(0)}%` : '—'}
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenTerminal?.(row.symbol);
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            border: 'none',
                            background: '#0d9488',
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Chart
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selected?.stats && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                border: '1px solid var(--tp-border)',
                borderRadius: 12,
                background: 'var(--tp-bg-panel)',
              }}
            >
              <BacktestEquityChart
                symbol={selected.symbol}
                equityCurve={selected.equityCurve}
                buyHoldCurve={selected.buyHoldCurve}
                walkForwardCurve={selected.wfStitchedEquity || []}
                initialCapital={selected.stats.initialCapital}
              />
              {selected.confidence?.notes?.length > 0 && (
                <ul style={{ margin: '12px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--tp-text-secondary)' }}>
                  {selected.confidence.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: 10,
                  marginTop: 14,
                  fontSize: 11,
                  fontFamily: 'ui-monospace, monospace',
                  color: 'var(--tp-text-muted)',
                }}
              >
                <span>Expectancy ${selected.stats.expectancy.toFixed(2)}/trade</span>
                <span>Avg win ${selected.stats.avgWin.toFixed(2)}</span>
                <span>Avg loss ${selected.stats.avgLoss.toFixed(2)}</span>
                <span>Max loss streak {selected.stats.maxConsecutiveLosses}</span>
                <span>Exposure {selected.stats.exposurePct.toFixed(0)}%</span>
                <span>Sortino {selected.stats.sortino.toFixed(2)}</span>
                {selected.isStats && (
                  <span>
                    In-sample {selected.isStats.totalReturnPct.toFixed(2)}% ({selected.isStats.numTrades} tr)
                  </span>
                )}
                {selected.oosStats && !selected.walkForward?.numFolds && (
                  <span>
                    OOS {selected.oosStats.totalReturnPct.toFixed(2)}% ({selected.oosStats.numTrades} tr)
                  </span>
                )}
                {selected.walkForward?.numFolds > 0 && (
                  <span>
                    WF {selected.walkForward.numFolds} folds · compounded{' '}
                    {selected.walkForward.compoundedReturnPct.toFixed(2)}%
                  </span>
                )}
              </div>

              {selected.walkForward?.folds?.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 }}>
                    Walk-forward folds
                  </div>
                  <div style={{ overflow: 'auto', maxHeight: 220, border: '1px solid var(--tp-border)', borderRadius: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead>
                        <tr style={{ background: 'var(--tp-bg-input)' }}>
                          {['#', 'Test from', 'Test to', 'IS ret%', 'OOS ret%', 'OOS tr', 'End $'].map((h) => (
                            <th
                              key={h}
                              style={{
                                textAlign: 'left',
                                padding: '6px 8px',
                                color: 'var(--tp-text-muted)',
                                fontSize: 9,
                                textTransform: 'uppercase',
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selected.walkForward.folds.map((f) => (
                          <tr key={f.index} style={{ borderTop: '1px solid #0f1424' }}>
                            <td style={{ padding: '6px 8px', color: 'var(--tp-text-secondary)' }}>{f.index + 1}</td>
                            <td style={{ padding: '6px 8px', fontFamily: 'ui-monospace, monospace' }}>
                              {f.testFromTime || f.testFrom}
                            </td>
                            <td style={{ padding: '6px 8px', fontFamily: 'ui-monospace, monospace' }}>
                              {f.testToTime || f.testTo}
                            </td>
                            <td style={{ padding: '6px 8px', fontFamily: 'ui-monospace, monospace' }}>
                              {f.isStats?.totalReturnPct != null
                                ? `${f.isStats.totalReturnPct.toFixed(2)}%`
                                : '—'}
                            </td>
                            <td
                              style={{
                                padding: '6px 8px',
                                fontFamily: 'ui-monospace, monospace',
                                color: (f.oosStats?.totalReturnPct ?? 0) >= 0 ? '#22c55e' : '#ef4444',
                              }}
                            >
                              {f.oosStats?.totalReturnPct != null
                                ? `${f.oosStats.totalReturnPct.toFixed(2)}%`
                                : '—'}
                            </td>
                            <td style={{ padding: '6px 8px' }}>{f.oosTradesCount}</td>
                            <td style={{ padding: '6px 8px', fontFamily: 'ui-monospace, monospace' }}>
                              {f.endCapital?.toFixed?.(0) ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              type="button"
              onClick={onExportCsv}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #334155',
                background: 'var(--tp-bg-sidebar)',
                color: 'var(--tp-text)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Export backtest CSV
            </button>
            {backtestTrades.length > 0 && (
              <span style={{ fontSize: 11, color: 'var(--tp-text-muted)' }}>
                {backtestTrades.length} trade rows (summary + trades files)
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export { DEFAULT_BACKTEST_PREFS };
