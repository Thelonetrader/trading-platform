import React, { useEffect, useMemo, useState } from 'react';
import { RESEARCH_DATA_IMPORTED_EVENT } from './utils/dataBackup';
import MultiFilterCombo from './components/MultiFilterCombo';
import QuickFilterCombo from './components/QuickFilterCombo';
import { WATCHLIST_CHANGED_EVENT } from './utils/liveSubscribe';
import { readJson } from './utils/storageStats';
import { buildWatchlistFilterSuggestions } from './utils/screenerFilterSuggestions';
import { normalizeFilterList } from './utils/filterChipLists';
import {
  DAY_CHANGE_QUICK_FILTERS,
  chipLabels,
  priceBandOptions,
  ruleHasLiveFilters,
} from './utils/screenerQuickFilters';
import {
  DEFAULT_RULE_TEMPLATE,
  deleteAlertRule,
  evaluateAllRules,
  listAlertRules,
  upsertAlertRule,
} from './utils/alertRules';
import { displayChangePct, displayPrice } from './utils/quoteDisplay';
import {
  DEFAULT_RANK_WEIGHTS,
  getRankWeights,
  rankAllWatchlistItems,
  saveRankWeights,
} from './utils/customRank';
import {
  DEFAULT_ALERT_NOTIFY_PREFS,
  ensureNotificationPermission,
  getAlertNotifyPrefs,
  saveAlertNotifyPrefs,
  saveAlertNotifyState,
} from './utils/alertNotifications';

export default function Alerts({ quotes = {}, connection, onOpenTerminal, onOpenScreener }) {
  const [weights, setWeights] = useState(() => getRankWeights());
  const [rules, setRules] = useState(() => listAlertRules());
  const [notifyPrefs, setNotifyPrefs] = useState(() => getAlertNotifyPrefs());
  const [form, setForm] = useState({ ...DEFAULT_RULE_TEMPLATE });
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState('');
  const [dataTick, setDataTick] = useState(0);
  const [watchlist, setWatchlist] = useState(() => readJson('watchlist', []));
  const [showAdvancedLive, setShowAdvancedLive] = useState(false);

  const filterSuggestions = useMemo(
    () => buildWatchlistFilterSuggestions(watchlist),
    [watchlist],
  );

  const contexts = useMemo(() => rankAllWatchlistItems(quotes), [weights, dataTick, quotes]);
  const evaluations = useMemo(() => evaluateAllRules(contexts, quotes), [contexts, rules, dataTick, quotes]);

  const reload = () => {
    setRules(listAlertRules());
    setWeights(getRankWeights());
  };

  useEffect(() => {
    const refreshWatchlist = () => setWatchlist(readJson('watchlist', []));
    const onImport = () => {
      reload();
      refreshWatchlist();
      setDataTick((t) => t + 1);
    };
    window.addEventListener(RESEARCH_DATA_IMPORTED_EVENT, onImport);
    window.addEventListener(WATCHLIST_CHANGED_EVENT, refreshWatchlist);
    return () => {
      window.removeEventListener(RESEARCH_DATA_IMPORTED_EVENT, onImport);
      window.removeEventListener(WATCHLIST_CHANGED_EVENT, refreshWatchlist);
    };
  }, []);

  const saveWeights = () => {
    saveRankWeights(weights);
    window.dispatchEvent(new Event(RESEARCH_DATA_IMPORTED_EVENT));
    setMsg('Rank weights saved');
    setTimeout(() => setMsg(''), 2500);
  };

  const resetWeights = () => {
    setWeights({ ...DEFAULT_RANK_WEIGHTS });
  };

  const submitRule = () => {
    if (!form.name.trim()) {
      setMsg('Rule needs a name');
      return;
    }
    upsertAlertRule({ ...form, id: editingId ?? undefined });
    reload();
    setForm({ ...DEFAULT_RULE_TEMPLATE });
    setEditingId(null);
    window.dispatchEvent(new Event(RESEARCH_DATA_IMPORTED_EVENT));
    setMsg('Rule saved');
    setTimeout(() => setMsg(''), 2500);
  };

  const editRule = (rule) => {
    setEditingId(rule.id);
    setForm({
      ...rule,
      tagMatches: normalizeFilterList(rule.tagMatches, rule.tagMatch),
      sectorMatches: normalizeFilterList(rule.sectorMatches, rule.sectorContains),
      dayChangeChipIds: normalizeFilterList(rule.dayChangeChipIds),
      priceBandIds: normalizeFilterList(rule.priceBandIds),
    });
  };

  const togglePriority = (p) => {
    setForm((f) => {
      const has = f.priorities.includes(p);
      const priorities = has ? f.priorities.filter((x) => x !== p) : [...f.priorities, p];
      return { ...f, priorities: priorities.length ? priorities : [p] };
    });
  };

  const inputStyle = {
    background: 'var(--tp-bg-input)',
    border: '1px solid var(--tp-border)',
    borderRadius: 8,
    color: 'var(--tp-text-title)',
    fontSize: 13,
    padding: '8px 12px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    fontSize: 11,
    color: 'var(--tp-text-faint)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 6,
    display: 'block',
  };

  const totalMatches = evaluations.reduce((n, e) => n + e.matches.length, 0);

  const saveNotifyPrefs = async (next) => {
    if (next.enabled && next.desktopNotify) {
      const ok = await ensureNotificationPermission();
      if (!ok) {
        setMsg('Enable notifications in macOS System Settings for this app');
        setTimeout(() => setMsg(''), 4000);
        return;
      }
    }
    setNotifyPrefs(next);
    saveAlertNotifyPrefs(next);
    saveAlertNotifyState({ lastFingerprint: '' });
    window.dispatchEvent(new Event('alert-notify-prefs-changed'));
    setMsg('Notification settings saved');
    setTimeout(() => setMsg(''), 2500);
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: 'var(--tp-text-dim)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>
          Phase 1 · Local rules
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--tp-text-strong)' }}>Alerts & ranking</div>
        <div style={{ fontSize: 13, color: 'var(--tp-text-muted)', marginTop: 6, maxWidth: 560 }}>
          Custom rank blends scorecard, priority, journal, and notes. With IB connected, rules can also filter on live
          price, day % change, and distance above watchlist buy price.
        </div>
        {msg && <div style={{ marginTop: 8, fontSize: 13, color: '#22c55e' }}>{msg}</div>}
      </div>

      <div
        style={{
          background: 'var(--tp-bg-panel)',
          border: '1px solid var(--tp-border)',
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tp-text-title)', marginBottom: 8 }}>Background notifications</div>
        <p style={{ fontSize: 12, color: 'var(--tp-text-muted)', margin: '0 0 14px', maxWidth: 520 }}>
          Periodically re-check rules while the app is open. You are notified when the match set changes (not on every poll).
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--tp-text-secondary)', marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={notifyPrefs.enabled}
            onChange={(e) => saveNotifyPrefs({ ...notifyPrefs, enabled: e.target.checked })}
          />
          Enable alert notifications
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Check every (minutes)</label>
            <input
              type="number"
              min={1}
              max={240}
              style={inputStyle}
              value={notifyPrefs.intervalMinutes}
              onChange={(e) =>
                setNotifyPrefs((p) => ({ ...p, intervalMinutes: Number(e.target.value) || DEFAULT_ALERT_NOTIFY_PREFS.intervalMinutes }))
              }
              onBlur={() => saveNotifyPrefs(notifyPrefs)}
            />
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--tp-text-secondary)', marginRight: 16 }}>
          <input
            type="checkbox"
            checked={notifyPrefs.desktopNotify}
            onChange={(e) => saveNotifyPrefs({ ...notifyPrefs, desktopNotify: e.target.checked })}
          />
          Desktop notification
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--tp-text-secondary)', marginTop: 8 }}>
          <input
            type="checkbox"
            checked={notifyPrefs.sound}
            onChange={(e) => saveNotifyPrefs({ ...notifyPrefs, sound: e.target.checked })}
          />
          Short sound
        </label>
      </div>

      <div
        style={{
          background: 'var(--tp-bg-panel)',
          border: '1px solid var(--tp-border)',
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tp-text-title)', marginBottom: 12 }}>Custom rank weights</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {[
            ['scorecard', 'Scorecard'],
            ['priority', 'Priority'],
            ['journal', 'Journal'],
            ['notes', 'Watchlist notes'],
          ].map(([key, label]) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <input
                type="number"
                min={0}
                max={100}
                style={inputStyle}
                value={weights[key]}
                onChange={(e) => setWeights((w) => ({ ...w, [key]: Number(e.target.value) }))}
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button
            type="button"
            onClick={saveWeights}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#6366f1',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Save weights
          </button>
          <button type="button" onClick={resetWeights} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--tp-border)', background: 'transparent', color: 'var(--tp-text-secondary)', cursor: 'pointer' }}>
            Reset defaults
          </button>
          {onOpenScreener && (
            <button type="button" onClick={onOpenScreener} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--tp-border)', background: 'transparent', color: '#818cf8', cursor: 'pointer' }}>
              Open screener
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)', gap: 16, marginBottom: 20 }}>
        <div style={{ background: 'var(--tp-bg-panel)', border: '1px solid var(--tp-border)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tp-text-title)', marginBottom: 12 }}>
            {editingId ? 'Edit rule' : 'New rule'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input style={inputStyle} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. High conviction" />
            </div>
            <div>
              <label style={labelStyle}>Min rating</label>
              <select style={inputStyle} value={form.minRating} onChange={(e) => setForm((f) => ({ ...f, minRating: e.target.value }))}>
                <option value="any">Any</option>
                <option value="hold+">Hold+</option>
                <option value="buy+">Buy+</option>
                <option value="sb">Strong Buy</option>
              </select>
            </div>
            <MultiFilterCombo
              label="Tag (any match)"
              labelStyle={labelStyle}
              inputStyle={inputStyle}
              placeholder="e.g. thesis"
              selected={form.tagMatches || []}
              onChange={(v) => setForm((f) => ({ ...f, tagMatches: v }))}
              options={filterSuggestions.tags}
            />
            <MultiFilterCombo
              label="Sector (any match)"
              labelStyle={labelStyle}
              inputStyle={inputStyle}
              placeholder="e.g. Technology"
              selected={form.sectorMatches || []}
              onChange={(v) => setForm((f) => ({ ...f, sectorMatches: v }))}
              options={filterSuggestions.sectors}
            />
            <div>
              <label style={labelStyle}>Priorities</label>
              <div style={{ display: 'flex', gap: 12 }}>
                {['High', 'Medium', 'Low'].map((p) => (
                  <label key={p} style={{ fontSize: 13, color: 'var(--tp-text-secondary)' }}>
                    <input type="checkbox" checked={form.priorities.includes(p)} onChange={() => togglePriority(p)} /> {p}
                  </label>
                ))}
              </div>
            </div>
            <label style={{ fontSize: 13, color: 'var(--tp-text-secondary)' }}>
              <input type="checkbox" checked={form.requireScorecard} onChange={(e) => setForm((f) => ({ ...f, requireScorecard: e.target.checked }))} /> Require saved scorecard
            </label>
            <label style={{ fontSize: 13, color: 'var(--tp-text-secondary)' }}>
              <input type="checkbox" checked={form.requireJournal} onChange={(e) => setForm((f) => ({ ...f, requireJournal: e.target.checked }))} /> Require journal entry
            </label>
            <div style={{ fontSize: 11, color: 'var(--tp-text-faint)', marginTop: 4 }}>Live filters (IB quotes)</div>
            <QuickFilterCombo
              catalog={DAY_CHANGE_QUICK_FILTERS}
              chipIds={form.dayChangeChipIds || []}
              onChipIdsChange={(ids) => setForm((f) => ({ ...f, dayChangeChipIds: ids }))}
              label="Day change (stack)"
              labelStyle={labelStyle}
              inputStyle={inputStyle}
              placeholder="Momentum, pullback…"
              hint="Combines with manual min/max day % (AND). Remove chips to relax."
            />
            <QuickFilterCombo
              catalog={priceBandOptions()}
              chipIds={form.priceBandIds || []}
              onChipIdsChange={(ids) => setForm((f) => ({ ...f, priceBandIds: ids }))}
              label="Price band (any match)"
              labelStyle={labelStyle}
              inputStyle={inputStyle}
              placeholder="Under $5, $25–100…"
              hint="Match any band (OR) in quote currency. Manual min/max price still apply."
            />
            <button
              type="button"
              onClick={() => setShowAdvancedLive(!showAdvancedLive)}
              style={{
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
              {showAdvancedLive ? '▾' : '▸'} Manual live thresholds
            </button>
            {showAdvancedLive && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Min day %</label>
                <input
                  type="number"
                  step="0.1"
                  style={inputStyle}
                  value={form.minDayChangePct ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, minDayChangePct: e.target.value === '' ? null : e.target.value }))}
                  placeholder="e.g. 2"
                />
              </div>
              <div>
                <label style={labelStyle}>Max day %</label>
                <input
                  type="number"
                  step="0.1"
                  style={inputStyle}
                  value={form.maxDayChangePct ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, maxDayChangePct: e.target.value === '' ? null : e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>Min price</label>
                <input
                  type="number"
                  step="0.01"
                  style={inputStyle}
                  value={form.minPrice ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, minPrice: e.target.value === '' ? null : e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>Max price</label>
                <input
                  type="number"
                  step="0.01"
                  style={inputStyle}
                  value={form.maxPrice ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, maxPrice: e.target.value === '' ? null : e.target.value }))}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Min % above watchlist buy price</label>
                <input
                  type="number"
                  step="0.1"
                  style={inputStyle}
                  value={form.minPctAboveBuy ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, minPctAboveBuy: e.target.value === '' ? null : e.target.value }))}
                  placeholder="e.g. 5"
                />
              </div>
            </div>
            )}
            {connection?.status !== 'connected' && (
              <div style={{ fontSize: 11, color: 'var(--tp-text-muted)' }}>Connect IB for live price filters to apply.</div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={submitRule} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                {editingId ? 'Update' : 'Add rule'}
              </button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setForm({ ...DEFAULT_RULE_TEMPLATE }); }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--tp-border)', background: 'transparent', color: 'var(--tp-text-secondary)', cursor: 'pointer' }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--tp-bg-panel)', border: '1px solid var(--tp-border)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tp-text-title)', marginBottom: 12 }}>Saved rules ({rules.length})</div>
          {rules.length === 0 ? (
            <p style={{ color: 'var(--tp-text-faint)', fontSize: 13 }}>No rules yet. Add one to highlight watchlist names that match.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rules.map((rule) => (
                <div key={rule.id} style={{ padding: 12, borderRadius: 8, background: 'var(--tp-bg-input)', border: '1px solid var(--tp-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontWeight: 600, color: 'var(--tp-text)' }}>{rule.name}</span>
                    <span style={{ fontSize: 11, color: rule.enabled ? '#22c55e' : '#64748b' }}>{rule.enabled ? 'On' : 'Off'}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--tp-text-muted)', marginTop: 4 }}>
                    {rule.minRating !== 'any' && `${rule.minRating} · `}
                    {(rule.tagMatches?.length ? rule.tagMatches : rule.tagMatch ? [rule.tagMatch] : []).length > 0 &&
                      `tags ${(rule.tagMatches?.length ? rule.tagMatches : [rule.tagMatch]).join(', ')} · `}
                    {(rule.sectorMatches?.length ? rule.sectorMatches : rule.sectorContains ? [rule.sectorContains] : [])
                      .length > 0 &&
                      `sectors ${(rule.sectorMatches?.length ? rule.sectorMatches : [rule.sectorContains]).join(', ')} · `}
                    {rule.requireScorecard && 'scored · '}
                    {rule.requireJournal && 'journal · '}
                    {(rule.dayChangeChipIds || []).length > 0 &&
                      `Δ ${chipLabels(DAY_CHANGE_QUICK_FILTERS, rule.dayChangeChipIds).join(', ')} · `}
                    {(rule.priceBandIds || []).length > 0 &&
                      `price ${chipLabels(priceBandOptions(), rule.priceBandIds).join(', ')} · `}
                    {ruleHasLiveFilters(rule) && 'live · '}
                    priorities {rule.priorities.join(', ')}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button type="button" onClick={() => editRule(rule)} style={{ fontSize: 11, color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                    <button type="button" onClick={() => { upsertAlertRule({ ...rule, enabled: !rule.enabled }); reload(); }} style={{ fontSize: 11, color: 'var(--tp-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {rule.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button type="button" onClick={() => { deleteAlertRule(rule.id); reload(); window.dispatchEvent(new Event(RESEARCH_DATA_IMPORTED_EVENT)); }} style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ fontSize: 13, color: 'var(--tp-text-muted)', marginBottom: 10 }}>
        Live matches: {totalMatches} hit{totalMatches === 1 ? '' : 's'} across {evaluations.filter((e) => e.matches.length).length} rule(s)
      </div>

      {evaluations.map(({ rule, matches }) =>
        matches.length === 0 ? null : (
          <div key={rule.id} style={{ background: 'var(--tp-bg-panel)', border: '1px solid var(--tp-border)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 600, color: 'var(--tp-text-strong)', marginBottom: 10 }}>{rule.name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {matches.map((ctx) => (
                <div key={ctx.ticker} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 12px', background: 'var(--tp-bg-input)', borderRadius: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--tp-text-title)' }}>{ctx.ticker}</span>
                    <span style={{ marginLeft: 10, fontSize: 12, color: '#818cf8' }}>Rank {ctx.customRank}</span>
                    {ctx.eval && <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--tp-text-muted)' }}>{ctx.eval.ratingShort}</span>}
                    {displayPrice(ctx.quote) != null && (
                      <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--tp-text-secondary)' }}>
                        {displayPrice(ctx.quote).toFixed(2)}
                        {displayChangePct(ctx.quote) != null && (
                          <span style={{ color: displayChangePct(ctx.quote) >= 0 ? '#22c55e' : '#ef4444' }}>
                            {' '}
                            ({displayChangePct(ctx.quote) >= 0 ? '+' : ''}
                            {displayChangePct(ctx.quote).toFixed(2)}%)
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  {onOpenTerminal && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenTerminal(ctx.ticker, {
                          exchange: ctx.watch?.exchange || 'SMART',
                          currency: ctx.watch?.currency || 'USD',
                        })
                      }
                      style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#6366f1', color: '#fff', fontSize: 12, cursor: 'pointer' }}
                    >
                      Terminal
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ),
      )}
    </div>
  );
}
