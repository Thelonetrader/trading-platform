import React, { useEffect, useMemo, useState } from 'react';
import { UNIVERSE_OPTIONS } from '../data/screenerIndexLists';
import OptionCombo from './OptionCombo';
import {
  SCAN_BAR_OPTIONS,
  SCAN_PRESETS,
  SCAN_SIZE_OPTIONS,
  applyScanPreset,
  formatScanEstimate,
  saveScannerPrefs,
  scanBarKey,
} from '../utils/chartScannerConfig';
import SymbolSearchCombo from './SymbolSearchCombo';
import LiveUniversePanel from './LiveUniversePanel';
import {
  SCAN_STRATEGIES,
  STRATEGY_CATEGORIES,
  strategiesForCategory,
} from '../utils/chartScannerEngine';
import { getAccentChipStyle, getSegmentTabStyle } from '../theme/formStyles';

const TABS = [
  { id: 'presets', label: 'Presets' },
  { id: 'setup', label: 'Scan setup' },
  { id: 'filters', label: 'Result filters' },
  { id: 'columns', label: 'Columns' },
];

const SIGNAL_FILTERS = [
  { id: 'action', label: 'Buy & sell only' },
  { id: 'all', label: 'All signals' },
  { id: 'buy', label: 'Buy only' },
  { id: 'sell', label: 'Sell only' },
];

const SORT_OPTIONS = [
  { id: 'strength', label: 'Signal strength' },
  { id: 'signal', label: 'Signal type' },
  { id: 'symbol', label: 'Symbol A–Z' },
  { id: 'change5', label: '5-bar change %' },
  { id: 'rsi', label: 'RSI (high → low)' },
  { id: 'volRatio', label: 'Volume ratio' },
  { id: 'pctSma50', label: '% vs SMA50' },
  { id: 'marketCap', label: 'Market cap' },
];

const TREND_FILTERS = [
  { id: 'any', label: 'Any vs SMA50' },
  { id: 'above_sma50', label: 'Price above SMA50' },
  { id: 'below_sma50', label: 'Price below SMA50' },
];

export default function ChartScannerSetup({
  prefs,
  onPrefsChange,
  universeCount,
  scanLimits,
  barOpt,
  inputStyle,
  labelStyle,
  searchSymbols,
  hasFmpKey = false,
  liveUniverse,
  onRefreshLiveUniverse,
}) {
  const [strategyCategory, setStrategyCategory] = useState(() => {
    const strat = SCAN_STRATEGIES.find((s) => s.id === prefs.strategyId);
    return strat?.category || 'all';
  });
  const [hoverPresetId, setHoverPresetId] = useState(null);
  const tab = prefs.setupTab || 'presets';

  const setTab = (id) => {
    if (typeof document !== 'undefined') {
      const el = document.activeElement;
      if (el && typeof el.blur === 'function') el.blur();
    }
    patch({ setupTab: id });
  };

  const patch = (partial) => {
    const next = { ...prefs, ...partial };
    if (
      prefs.activeScanPresetId &&
      partial.activeScanPresetId === undefined &&
      Object.keys(partial).some((k) => k !== 'setupTab')
    ) {
      next.activeScanPresetId = '';
    }
    onPrefsChange(next);
    saveScannerPrefs(next);
  };

  const applyPreset = (presetId) => {
    const preset = SCAN_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const strat = SCAN_STRATEGIES.find((s) => s.id === preset.strategyId);
    if (strat?.category) setStrategyCategory(strat.category);
    const next = applyScanPreset(prefs, presetId);
    onPrefsChange(next);
    saveScannerPrefs(next);
  };

  const clearActivePreset = () => {
    patch({ activeScanPresetId: '' });
  };

  const patchFilter = (key, value) => {
    patch({ filters: { ...prefs.filters, [key]: value } });
  };

  const patchColumn = (key, value) => {
    patch({ columns: { ...prefs.columns, [key]: value } });
  };

  const strategies = useMemo(
    () => strategiesForCategory(strategyCategory),
    [strategyCategory],
  );

  const strategyOptions = useMemo(
    () => strategies.map((s) => ({ id: s.id, label: s.label })),
    [strategies],
  );

  const barOptions = useMemo(
    () =>
      SCAN_BAR_OPTIONS.map((b) => ({
        id: scanBarKey(b.barSize, b.duration),
        label: b.label,
      })),
    [],
  );

  const universeOptions = useMemo(
    () => UNIVERSE_OPTIONS.map((u) => ({ id: u.id, label: u.label })),
    [],
  );

  const categoryOptions = useMemo(
    () => STRATEGY_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
    [],
  );

  useEffect(() => {
    if (strategies.some((s) => s.id === prefs.strategyId)) return;
    const strat = SCAN_STRATEGIES.find((s) => s.id === prefs.strategyId);
    if (strat && strategyCategory !== 'all' && strat.category !== strategyCategory) {
      setStrategyCategory(strat.category);
      return;
    }
    if (strategies[0]) {
      patch({ strategyId: strategies[0].id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keep strategy in sync when category changes
  }, [strategyCategory, strategies, prefs.strategyId]);

  const activePreset = prefs.activeScanPresetId
    ? SCAN_PRESETS.find((p) => p.id === prefs.activeScanPresetId)
    : null;

  const activeStrategy = SCAN_STRATEGIES.find((s) => s.id === prefs.strategyId);

  const tabBtn = (id, label) => (
    <button key={id} type="button" onClick={() => setTab(id)} style={getSegmentTabStyle(tab === id)}>
      {label}
    </button>
  );

  return (
    <div style={{ marginBottom: 16, position: 'relative', zIndex: 2 }}>
      {activePreset && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12,
            padding: '10px 14px',
            borderRadius: 10,
            background: 'var(--tp-accent-soft)',
            border: '1px solid var(--tp-accent-border)',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--tp-text-secondary)' }}>Active preset</span>
          <span
            style={{
              ...getAccentChipStyle(),
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {activePreset.label}
          </span>
          <button
            type="button"
            onClick={clearActivePreset}
            style={{
              marginLeft: 'auto',
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid var(--tp-border)',
              background: 'transparent',
              color: 'var(--tp-text-secondary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Clear preset highlight
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {TABS.map((t) => tabBtn(t.id, t.label))}
      </div>

      {tab === 'presets' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 12,
          }}
        >
          {SCAN_PRESETS.map((p) => {
            const isActive = prefs.activeScanPresetId === p.id;
            const hover = hoverPresetId === p.id;
            return (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              onMouseEnter={() => setHoverPresetId(p.id)}
              onMouseLeave={() => setHoverPresetId(null)}
              style={{
                textAlign: 'left',
                padding: '14px 16px',
                borderRadius: 10,
                border: isActive
                  ? '1px solid var(--tp-accent)'
                  : hover
                    ? '1px solid var(--tp-accent-border)'
                    : '1px solid var(--tp-border)',
                background: isActive
                  ? 'var(--tp-accent-soft)'
                  : hover
                    ? 'var(--tp-bg-hover)'
                    : 'var(--tp-bg-panel)',
                boxShadow: isActive ? '0 0 0 1px var(--tp-accent-border) inset' : undefined,
                cursor: 'pointer',
                color: 'var(--tp-text)',
              }}
            >
              {isActive && (
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--tp-accent-on-soft)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 6,
                  }}
                >
                  Active
                </span>
              )}
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{p.label}</div>
              <div style={{ fontSize: 11, color: 'var(--tp-text-muted)', lineHeight: 1.45 }}>{p.blurb}</div>
            </button>
            );
          })}
        </div>
      )}

      {tab === 'setup' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 14,
            background: 'var(--tp-bg-panel)',
            border: '1px solid var(--tp-border)',
            borderRadius: 12,
            padding: 18,
          }}
        >
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '10px 12px',
              borderRadius: 8,
              background: 'var(--tp-accent-soft)',
              border: '1px solid var(--tp-accent-border)',
              fontSize: 12,
              color: 'var(--tp-text-secondary)',
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: 'var(--tp-accent-on-soft)' }}>This run:</strong> up to{' '}
            <strong style={{ color: 'var(--tp-text)' }}>{scanLimits?.maxSymbols ?? barOpt.maxSymbols}</strong> symbols
            {universeCount > (scanLimits?.maxSymbols ?? 0) && (
              <span style={{ color: 'var(--tp-text-muted)' }}> (universe has {universeCount})</span>
            )}
            {' · '}
            {scanLimits?.sizeLabel || 'Auto'}
            {' · '}
            est. {formatScanEstimate(scanLimits?.estimateSec ?? 0)} IB history requests (sequential pacing)
          </div>

          <OptionCombo
            label="Scan size"
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            gridColumn="1 / -1"
            value={prefs.scanSize || 'auto'}
            onChange={(id) => patch({ scanSize: id })}
            options={SCAN_SIZE_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
          />

          <SymbolSearchCombo
            label="Add symbols to scan"
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            placeholder="Type ticker or company name…"
            hint="Optional — adds tickers beyond your universe list (FMP search, 2+ characters)."
            selected={prefs.symbolPicks || []}
            onChange={(v) => patch({ symbolPicks: v })}
            searchSymbols={searchSymbols}
            disabled={!hasFmpKey}
          />

          <OptionCombo
            label={`Universe source (${universeCount} symbols)`}
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            gridColumn="1 / -1"
            value={prefs.universeId}
            onChange={(id) => patch({ universeId: id })}
            options={universeOptions}
            placeholder="Pick universe…"
          />

          {prefs.universeId === 'live' && (
            <LiveUniversePanel
              liveUniverse={prefs.liveUniverse}
              onChange={(next) => patch({ liveUniverse: next })}
              onRefresh={onRefreshLiveUniverse}
              loading={liveUniverse?.loading}
              symbolCount={universeCount}
              updatedAt={liveUniverse?.updatedAt}
              error={liveUniverse?.error}
              hasFmpKey={hasFmpKey}
              inputStyle={inputStyle}
              labelStyle={labelStyle}
            />
          )}

          {prefs.universeId !== 'live' && (
            <>
          {prefs.universeId === 'custom' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <textarea
                style={{ ...inputStyle, minHeight: 64 }}
                placeholder="AAPL, MSFT, …"
                value={prefs.customUniverse}
                onChange={(e) => patch({ customUniverse: e.target.value.toUpperCase() })}
              />
            </div>
          )}
            </>
          )}
          <OptionCombo
            label="Strategy category"
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            value={strategyCategory}
            onChange={setStrategyCategory}
            options={categoryOptions}
          />
          <OptionCombo
            label={`Strategy (${strategies.length})`}
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            value={prefs.strategyId}
            onChange={(id) => patch({ strategyId: id })}
            options={strategyOptions}
            placeholder="Pick strategy…"
          />
          <OptionCombo
            label="Timeframe & history"
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            value={prefs.barKey}
            onChange={(id) => patch({ barKey: id })}
            options={barOptions}
          />
          <OptionCombo
            label="Signal view"
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            value={prefs.signalFilter}
            onChange={(id) => patch({ signalFilter: id })}
            options={SIGNAL_FILTERS.map((f) => ({ id: f.id, label: f.label }))}
          />
          <OptionCombo
            label="Sort results by"
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            value={prefs.sortBy}
            onChange={(id) => patch({ sortBy: id })}
            options={SORT_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
          />
          {activeStrategy && (
            <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--tp-text-muted)', lineHeight: 1.5 }}>
              {activeStrategy.description}
              <span style={{ color: 'var(--tp-text-faint)' }}> · Min {activeStrategy.minBars} bars</span>
            </div>
          )}
        </div>
      )}

      {tab === 'filters' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 14,
            background: 'var(--tp-bg-panel)',
            border: '1px solid var(--tp-border)',
            borderRadius: 12,
            padding: 18,
          }}
        >
          <p style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--tp-text-muted)', margin: 0 }}>
            Applied to the results table after each scan (does not change IB requests). Market cap filters
            need an FMP key in Settings — use “Refresh fundamentals” after scan if cap column is empty.
          </p>
          <OptionCombo
            label="Min strength"
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            value={String(prefs.filters.minStrength)}
            onChange={(id) => patchFilter('minStrength', Number(id))}
            options={[0, 1, 2, 3, 4, 5].map((n) => ({
              id: String(n),
              label: n === 0 ? 'Any' : `${n}+`,
            }))}
          />
          <OptionCombo
            label="Trend vs SMA50"
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            value={prefs.filters.trendVsSma50}
            onChange={(id) => patchFilter('trendVsSma50', id)}
            options={TREND_FILTERS.map((t) => ({ id: t.id, label: t.label }))}
          />
          <div>
            <label style={labelStyle}>RSI min</label>
            <input
              style={inputStyle}
              placeholder="Any"
              value={prefs.filters.minRsi}
              onChange={(e) => patchFilter('minRsi', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>RSI max</label>
            <input
              style={inputStyle}
              placeholder="Any"
              value={prefs.filters.maxRsi}
              onChange={(e) => patchFilter('maxRsi', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Min vol ratio (20-bar)</label>
            <input
              style={inputStyle}
              placeholder="e.g. 1.5"
              value={prefs.filters.minVolRatio}
              onChange={(e) => patchFilter('minVolRatio', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Min % vs SMA50</label>
            <input
              style={inputStyle}
              placeholder="e.g. 0"
              value={prefs.filters.minPctAboveSma50}
              onChange={(e) => patchFilter('minPctAboveSma50', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Max % vs SMA50</label>
            <input
              style={inputStyle}
              placeholder="Any"
              value={prefs.filters.maxPctAboveSma50}
              onChange={(e) => patchFilter('maxPctAboveSma50', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Min day chg % (live)</label>
            <input
              style={inputStyle}
              placeholder="Any"
              value={prefs.filters.minChangePct}
              onChange={(e) => patchFilter('minChangePct', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Max day chg %</label>
            <input
              style={inputStyle}
              placeholder="Any"
              value={prefs.filters.maxChangePct}
              onChange={(e) => patchFilter('maxChangePct', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Min price (USD equiv.)</label>
            <input
              style={inputStyle}
              value={prefs.filters.minPrice}
              onChange={(e) => patchFilter('minPrice', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Max price (USD equiv.)</label>
            <input
              style={inputStyle}
              value={prefs.filters.maxPrice}
              onChange={(e) => patchFilter('maxPrice', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Min mkt cap ($M USD equiv.)</label>
            <input
              style={inputStyle}
              type="number"
              min={0}
              step={1}
              placeholder="e.g. 2000"
              value={prefs.filters.minMktCapM}
              onChange={(e) => patchFilter('minMktCapM', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Max mkt cap ($M USD equiv.)</label>
            <input
              style={inputStyle}
              type="number"
              min={0}
              step={1}
              placeholder="e.g. 500000"
              value={prefs.filters.maxMktCapM}
              onChange={(e) => patchFilter('maxMktCapM', e.target.value)}
            />
          </div>
        </div>
      )}

      {tab === 'columns' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 10,
            background: 'var(--tp-bg-panel)',
            border: '1px solid var(--tp-border)',
            borderRadius: 12,
            padding: 18,
          }}
        >
          {[
            ['change5', '5-bar change %'],
            ['pctSma50', '% vs SMA50'],
            ['volRatio', 'Volume vs 20-bar avg'],
            ['marketCap', 'Market cap (USD equiv.)'],
            ['emaTrend', 'EMA 9/21 trend'],
            ['atrPct', 'ATR % of price'],
            ['bbWidth', 'Bollinger width %'],
          ].map(([key, label]) => (
            <label
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: 'var(--tp-text-secondary)',
              }}
            >
              <input
                type="checkbox"
                checked={!!prefs.columns[key]}
                onChange={(e) => patchColumn(key, e.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
