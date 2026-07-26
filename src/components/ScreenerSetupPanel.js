import React, { useState } from 'react';
import { UNIVERSE_OPTIONS } from '../data/screenerIndexLists';
import QuickFilterCombo from './QuickFilterCombo';
import MultiFilterCombo from './MultiFilterCombo';
import SymbolSearchCombo from './SymbolSearchCombo';
import LiveUniversePanel from './LiveUniversePanel';
import OptionCombo from './OptionCombo';
import NumericFilterCombo from './NumericFilterCombo';
import {
  SCREENER_PRO_PRESETS,
  applyScreenerProPreset,
  clearScreenerProPreset,
  getScreenerProPreset,
  saveScreenerLiveFilters,
} from '../utils/screenerConfig';
import { SORT_OPTIONS } from '../utils/screenerFilters';
import { CURRENCY_FILTER_OPTIONS } from '../utils/fxUsd';
import {
  DAY_CHANGE_QUICK_FILTERS,
  FUNDAMENTAL_QUICK_FILTERS,
  RATING_QUICK_OPTIONS,
  betaBandOptions,
  fundamentalNumericSuggestions,
  mktCapBandOptions,
  priceBandOptions,
} from '../utils/screenerQuickFilters';
import { getAccentChipStyle, getSegmentTabStyle } from '../theme/formStyles';
import { SelectWithChevron } from './ComboField';

const TABS = [
  { id: 'presets', label: 'Presets' },
  { id: 'universe', label: 'Universe' },
  { id: 'fundamentals', label: 'Fundamentals' },
  { id: 'size', label: 'Size & price' },
  { id: 'research', label: 'Research' },
];

const VALID_TAB_IDS = new Set(TABS.map((t) => t.id));

function resolveSetupTab(setupTab) {
  const raw = String(setupTab ?? 'presets').trim();
  return VALID_TAB_IDS.has(raw) ? raw : 'presets';
}

const PRIORITIES = ['High', 'Medium', 'Low'];

const JOURNAL_FILTERS = [
  { id: 'any', label: 'Any journal status' },
  { id: 'has', label: 'Has journal entry' },
  { id: 'none', label: 'No journal yet' },
];

export default function ScreenerSetupPanel({
  filters,
  onFiltersChange,
  universeTickersCount,
  evalCount,
  inputStyle,
  labelStyle,
  filterSuggestions = null,
  searchSymbols,
  hasFmpKey = false,
  liveUniverse,
  onRefreshLiveUniverse,
}) {
  const tab = resolveSetupTab(filters.setupTab);
  const [showAdvancedFundamentals, setShowAdvancedFundamentals] = useState(false);
  const [showAdvancedSize, setShowAdvancedSize] = useState(false);

  const sectorOptions = filterSuggestions?.sectors ?? [];
  const industryOptions = filterSuggestions?.industries ?? [];
  const exchangeOptions = filterSuggestions?.exchanges ?? [];
  const tagOptions = filterSuggestions?.tags ?? [];
  const currencyOptions = [
    ...CURRENCY_FILTER_OPTIONS.filter((c) => c.id !== 'any').map((c) => c.id),
    'non_usd',
  ];

  const patch = (partial) => {
    const next = { ...filters, ...partial };
    if (
      filters.activeProPresetId &&
      partial.activeProPresetId === undefined &&
      Object.keys(partial).some((k) => k !== 'setupTab')
    ) {
      next.activeProPresetId = '';
    }
    onFiltersChange(next);
    saveScreenerLiveFilters(next);
  };

  const activeProPreset = filters.activeProPresetId
    ? getScreenerProPreset(filters.activeProPresetId)
    : null;

  const clearProPreset = () => {
    const next = clearScreenerProPreset(filters);
    onFiltersChange(next);
    saveScreenerLiveFilters(next);
  };

  const setTab = (id) => {
    if (typeof document !== 'undefined') {
      const el = document.activeElement;
      if (el && typeof el.blur === 'function') el.blur();
    }
    patch({ setupTab: id });
  };

  const tabBtn = (id, label) => (
    <button key={id} type="button" onClick={() => setTab(id)} style={getSegmentTabStyle(tab === id)}>
      {label}
    </button>
  );

  const grid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 14,
    background: 'var(--tp-bg-panel)',
    border: '1px solid var(--tp-border)',
    borderRadius: 12,
    padding: 18,
  };

  const numCombo = (key, label, placeholder) => (
    <NumericFilterCombo
      key={key}
      label={label}
      labelStyle={labelStyle}
      inputStyle={inputStyle}
      value={filters[key] ?? ''}
      onChange={(v) => patch({ [key]: v })}
      options={fundamentalNumericSuggestions(key)}
      placeholder={placeholder || '—'}
    />
  );

  const num = (key, label, placeholder) => (
    <div key={key}>
      <label style={labelStyle}>{label}</label>
      <input
        style={inputStyle}
        type="number"
        placeholder={placeholder || '—'}
        value={filters[key] ?? ''}
        onChange={(e) => patch({ [key]: e.target.value })}
      />
    </div>
  );

  const toggleLink = (open, setOpen, label) => (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      style={{
        gridColumn: '1 / -1',
        textAlign: 'left',
        background: 'transparent',
        border: 'none',
        color: '#818cf8',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        padding: 0,
      }}
    >
      {open ? '▾' : '▸'} {label}
    </button>
  );

  return (
    <div style={{ marginBottom: 16, position: 'relative', zIndex: 5 }}>
      {activeProPreset && (
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
          <span style={{ fontSize: 12, color: 'var(--tp-text-secondary)' }}>Active screen preset</span>
          <span
            style={{
              ...getAccentChipStyle(),
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px 4px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {activeProPreset.label}
            <button
              type="button"
              aria-label={`Remove ${activeProPreset.label} preset`}
              onClick={clearProPreset}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--tp-text-secondary)',
                cursor: 'pointer',
                padding: '0 2px',
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </span>
          <button
            type="button"
            onClick={clearProPreset}
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
            Clear preset filters
          </button>
          <span style={{ flexBasis: '100%', fontSize: 11, color: 'var(--tp-text-muted)', lineHeight: 1.4 }}>
            {activeProPreset.blurb} · Edit any filter tab to detach, or clear to reset criteria (symbols you picked stay).
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {TABS.map((t) => tabBtn(t.id, t.label))}
      </div>

      <div key={tab} style={{ position: 'relative', zIndex: 1 }}>
      {tab === 'presets' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 12,
          }}
        >
          {SCREENER_PRO_PRESETS.map((p) => {
            const isActive = filters.activeProPresetId === p.id;
            return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                const next = applyScreenerProPreset(filters, p.id);
                onFiltersChange(next);
                saveScreenerLiveFilters(next);
              }}
              style={{
                textAlign: 'left',
                padding: 14,
                borderRadius: 10,
                border: isActive ? '1px solid var(--tp-accent)' : '1px solid var(--tp-border)',
                background: isActive ? 'var(--tp-accent-soft)' : 'var(--tp-bg-panel)',
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
              <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--tp-text)', marginBottom: 6 }}>
                {p.label}
              </span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--tp-text-muted)', lineHeight: 1.45 }}>{p.blurb}</span>
            </button>
            );
          })}
        </div>
      )}

      {tab === 'universe' && (
        <div style={grid}>
          <SymbolSearchCombo
            label="Find symbols"
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            placeholder="Type ticker or company name…"
            hint="Searches all FMP markets after 2 characters. Picked symbols are added to the screen and show ticker plus company name."
            selected={filters.symbolPicks || []}
            onChange={(v) => patch({ symbolPicks: v })}
            searchSymbols={searchSymbols}
            disabled={!hasFmpKey}
          />
          {!hasFmpKey && (
            <div style={{ gridColumn: '1 / -1', fontSize: 12, color: '#fbbf24' }}>
              Add an FMP API key in Settings → Market data to search symbols globally.
            </div>
          )}
          <OptionCombo
            label={`Universe source (${universeTickersCount} symbols · ${evalCount} saved evals)`}
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            gridColumn="1 / -1"
            value={filters.universeId}
            onChange={(id) => patch({ universeId: id })}
            options={UNIVERSE_OPTIONS.map((u) => ({ id: u.id, label: u.label }))}
          />

          {filters.universeId === 'live' && (
            <LiveUniversePanel
              liveUniverse={filters.liveUniverse}
              onChange={(next) => patch({ liveUniverse: next })}
              onRefresh={onRefreshLiveUniverse}
              loading={liveUniverse?.loading}
              symbolCount={universeTickersCount}
              updatedAt={liveUniverse?.updatedAt}
              error={liveUniverse?.error}
              hasFmpKey={hasFmpKey}
              inputStyle={inputStyle}
              labelStyle={labelStyle}
            />
          )}

          {filters.universeId === 'custom' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Custom tickers</label>
              <textarea
                style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
                placeholder="AAPL, MSFT, NVDA · LSE: SHEL.L"
                value={filters.customUniverse}
                onChange={(e) => patch({ customUniverse: e.target.value.toUpperCase() })}
              />
            </div>
          )}

          {filters.universeId !== 'live' && filters.universeId !== 'custom' && (
            <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--tp-text-muted)', lineHeight: 1.45 }}>
              Using saved/local symbol lists. Switch to <strong style={{ color: 'var(--tp-text-secondary)' }}>Live market</strong>{' '}
              for an up-to-date FMP screener universe, or use Find symbols to add names.
            </div>
          )}
          <MultiFilterCombo
            label="Sector (any match)"
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            placeholder="Pick sectors…"
            selected={filters.sectorMatches || []}
            onChange={(v) => patch({ sectorMatches: v })}
            options={sectorOptions}
          />
          <MultiFilterCombo
            label="Industry (any match)"
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            placeholder="Pick industries…"
            selected={filters.industryMatches || []}
            onChange={(v) => patch({ industryMatches: v })}
            options={industryOptions}
          />
          <MultiFilterCombo
            label="Exchange (any match)"
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            placeholder="NASDAQ, LSE…"
            selected={filters.exchangeMatches || []}
            onChange={(v) => patch({ exchangeMatches: v })}
            options={exchangeOptions}
          />
          <MultiFilterCombo
            label="Listing currency (any match)"
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            placeholder="USD, GBP, non_usd…"
            selected={filters.currencyFilters || []}
            onChange={(v) => patch({ currencyFilters: v, currencyFilter: 'any' })}
            options={currencyOptions}
            allowCustom={false}
          />
          <QuickFilterCombo
            catalog={DAY_CHANGE_QUICK_FILTERS}
            chipIds={filters.dayChangeChipIds || []}
            onChipIdsChange={(ids) => patch({ dayChangeChipIds: ids })}
            label="Day change quick filters (stack)"
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            placeholder="Momentum, pullback…"
            hint="Selected day-change rules combine (AND). Manual min/max below add further bounds."
          />
          <div>
            <label style={labelStyle}>Sort by</label>
            <SelectWithChevron style={inputStyle} value={filters.sortBy} onChange={(e) => patch({ sortBy: e.target.value })}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </SelectWithChevron>
          </div>
          {num('minChange', 'Min day Δ%')}
          {num('maxChange', 'Max day Δ%')}
        </div>
      )}

      {tab === 'fundamentals' && (
        <div style={grid}>
          <QuickFilterCombo
            catalog={FUNDAMENTAL_QUICK_FILTERS}
            chipIds={filters.fundamentalChipIds || []}
            onChipIdsChange={(ids) => patch({ fundamentalChipIds: ids })}
            label="Quick fundamental filters (stack)"
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            placeholder="P/E, growth, yield…"
            hint="Each chip tightens the screen (AND). Remove chips before searching to relax. Advanced fields below stack with chips."
          />
          <QuickFilterCombo
            catalog={betaBandOptions()}
            chipIds={filters.betaBandIds || []}
            onChipIdsChange={(ids) => patch({ betaBandIds: ids })}
            label="Beta profile (any match)"
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            placeholder="Low vol, high beta…"
            hint="Match any selected beta band (OR). Empty = use manual min/max only."
          />
          {toggleLink(showAdvancedFundamentals, setShowAdvancedFundamentals, 'Advanced numeric fields')}
          {showAdvancedFundamentals && (
            <>
              {numCombo('minPe', 'Min P/E')}
              {numCombo('maxPe', 'Max P/E')}
              {numCombo('minPb', 'Min P/B')}
              {numCombo('maxPb', 'Max P/B')}
              {numCombo('minEpsGrowth', 'Min EPS gr %')}
              {numCombo('maxEpsGrowth', 'Max EPS gr %')}
              {numCombo('minRevenueGrowth', 'Min rev gr %')}
              {numCombo('maxRevenueGrowth', 'Max rev gr %')}
              {numCombo('minFcfYield', 'Min FCF yld %')}
              {numCombo('maxFcfYield', 'Max FCF yld %')}
              {numCombo('minDivYield', 'Min div yld %')}
              {numCombo('minOperatingMargin', 'Min op margin %')}
              {numCombo('minGrossMargin', 'Min gross margin %')}
              {numCombo('maxNetDebtEbitda', 'Max net debt / EBITDA')}
              {numCombo('minInterestCoverage', 'Min interest coverage')}
              {numCombo('minBeta', 'Min beta')}
              {numCombo('maxBeta', 'Max beta')}
            </>
          )}
        </div>
      )}

      {tab === 'size' && (
        <div style={grid}>
          <QuickFilterCombo
            catalog={mktCapBandOptions()}
            chipIds={filters.mktCapBandIds || []}
            onChipIdsChange={(ids) => patch({ mktCapBandIds: ids })}
            label="Market cap size (any match)"
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            placeholder="Small, mid, large…"
            hint="Match any selected cap band (OR). USD equivalent from FMP profile."
          />
          <QuickFilterCombo
            catalog={priceBandOptions()}
            chipIds={filters.priceBandIds || []}
            onChipIdsChange={(ids) => patch({ priceBandIds: ids })}
            label="Price band USD equiv. (any match)"
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            placeholder="Under $5, $25–100…"
            hint="Match any selected price band (OR)."
          />
          {toggleLink(showAdvancedSize, setShowAdvancedSize, 'Manual cap & price ($M / USD)')}
          {showAdvancedSize && (
            <>
              {num('minMktCapM', 'Min mkt cap ($M USD equiv.)', 'e.g. 2000')}
              {num('maxMktCapM', 'Max mkt cap ($M USD equiv.)', 'e.g. 500000')}
              {num('minPriceUsd', 'Min price (USD equiv.)')}
              {num('maxPriceUsd', 'Max price (USD equiv.)')}
            </>
          )}
          <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--tp-text-muted)', lineHeight: 1.5 }}>
            Size bands and manual min/max: if bands are selected, a row must fall in at least one band; manual
            limits still apply when set.
          </div>
        </div>
      )}

      {tab === 'research' && (
        <div style={grid}>
          <QuickFilterCombo
            catalog={RATING_QUICK_OPTIONS}
            chipIds={filters.ratingMatches || []}
            onChipIdsChange={(ids) => patch({ ratingMatches: ids })}
            label="Min scorecard rating (any match)"
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            placeholder="Hold+, Buy+, …"
            hint="Match if score meets any selected tier (OR). Empty = use fallback dropdown."
          />
          <div>
            <label style={labelStyle}>Fallback min rating (no chips)</label>
            <SelectWithChevron
              style={inputStyle}
              value={filters.ratingFilter}
              onChange={(e) => patch({ ratingFilter: e.target.value })}
              disabled={(filters.ratingMatches || []).length > 0}
            >
              <option value="any">Any rating</option>
              <option value="hold+">Hold+ (≥2.5)</option>
              <option value="buy+">Buy+ (≥3.5)</option>
              <option value="sb">Strong Buy (≥4.5)</option>
            </SelectWithChevron>
          </div>
          <div>
            <label style={labelStyle}>Journal</label>
            <SelectWithChevron
              style={inputStyle}
              value={filters.journalFilter}
              onChange={(e) => patch({ journalFilter: e.target.value })}
            >
              {JOURNAL_FILTERS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </SelectWithChevron>
          </div>
          {num('minRank', 'Min custom rank')}
          <MultiFilterCombo
            label="Tag (any match)"
            labelStyle={labelStyle}
            inputStyle={inputStyle}
            placeholder="thesis, dividend…"
            selected={filters.tagMatches || []}
            onChange={(v) => patch({ tagMatches: v })}
            options={tagOptions}
          />
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--tp-text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Priority
            </span>
            {PRIORITIES.map((p) => (
              <label
                key={p}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--tp-text-secondary)', cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={(filters.priorityFilter || {})[p]}
                  onChange={() => {
                    const pri = filters.priorityFilter || { High: true, Medium: true, Low: true };
                    patch({
                      priorityFilter: { ...pri, [p]: !pri[p] },
                    });
                  }}
                />
                {p}
              </label>
            ))}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: 'var(--tp-text-secondary)',
                cursor: 'pointer',
                marginLeft: 8,
              }}
            >
              <input
                type="checkbox"
                checked={filters.requireScorecard}
                onChange={() => patch({ requireScorecard: !filters.requireScorecard })}
              />
              Only scored names
            </label>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
