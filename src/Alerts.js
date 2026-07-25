import React, { useEffect, useMemo, useState } from 'react';
import { RESEARCH_DATA_IMPORTED_EVENT } from './utils/dataBackup';
import {
  DEFAULT_RULE_TEMPLATE,
  deleteAlertRule,
  evaluateAllRules,
  listAlertRules,
  upsertAlertRule,
} from './utils/alertRules';
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

export default function Alerts({ onOpenTerminal, onOpenScreener }) {
  const [weights, setWeights] = useState(() => getRankWeights());
  const [rules, setRules] = useState(() => listAlertRules());
  const [notifyPrefs, setNotifyPrefs] = useState(() => getAlertNotifyPrefs());
  const [form, setForm] = useState({ ...DEFAULT_RULE_TEMPLATE });
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState('');
  const [dataTick, setDataTick] = useState(0);

  const contexts = useMemo(() => rankAllWatchlistItems(), [weights, dataTick]);
  const evaluations = useMemo(() => evaluateAllRules(contexts), [contexts, rules, dataTick]);

  const reload = () => {
    setRules(listAlertRules());
    setWeights(getRankWeights());
  };

  useEffect(() => {
    const onImport = () => {
      reload();
      setDataTick((t) => t + 1);
    };
    window.addEventListener(RESEARCH_DATA_IMPORTED_EVENT, onImport);
    return () => window.removeEventListener(RESEARCH_DATA_IMPORTED_EVENT, onImport);
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
    setForm({ ...rule });
  };

  const togglePriority = (p) => {
    setForm((f) => {
      const has = f.priorities.includes(p);
      const priorities = has ? f.priorities.filter((x) => x !== p) : [...f.priorities, p];
      return { ...f, priorities: priorities.length ? priorities : [p] };
    });
  };

  const inputStyle = {
    background: '#060b16',
    border: '1px solid #1a2035',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 13,
    padding: '8px 12px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    fontSize: 11,
    color: '#475569',
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
        <div style={{ fontSize: 11, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>
          Phase 1 · Local rules
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc' }}>Alerts & ranking</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 6, maxWidth: 560 }}>
          Custom rank blends scorecard, priority, journal, and notes. Rules fire when watchlist names match your
          criteria (no market data API required).
        </div>
        {msg && <div style={{ marginTop: 8, fontSize: 13, color: '#22c55e' }}>{msg}</div>}
      </div>

      <div
        style={{
          background: '#0a0f1e',
          border: '1px solid #1a2035',
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 8 }}>Background notifications</div>
        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 14px', maxWidth: 520 }}>
          Periodically re-check rules while the app is open. You are notified when the match set changes (not on every poll).
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>
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
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8', marginRight: 16 }}>
          <input
            type="checkbox"
            checked={notifyPrefs.desktopNotify}
            onChange={(e) => saveNotifyPrefs({ ...notifyPrefs, desktopNotify: e.target.checked })}
          />
          Desktop notification
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8', marginTop: 8 }}>
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
          background: '#0a0f1e',
          border: '1px solid #1a2035',
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 12 }}>Custom rank weights</div>
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
          <button type="button" onClick={resetWeights} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #1a2035', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>
            Reset defaults
          </button>
          {onOpenScreener && (
            <button type="button" onClick={onOpenScreener} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #1a2035', background: 'transparent', color: '#818cf8', cursor: 'pointer' }}>
              Open screener
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#0a0f1e', border: '1px solid #1a2035', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 12 }}>
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
            <div>
              <label style={labelStyle}>Tag contains</label>
              <input style={inputStyle} value={form.tagMatch} onChange={(e) => setForm((f) => ({ ...f, tagMatch: e.target.value }))} placeholder="e.g. thesis" />
            </div>
            <div>
              <label style={labelStyle}>Sector contains</label>
              <input style={inputStyle} value={form.sectorContains} onChange={(e) => setForm((f) => ({ ...f, sectorContains: e.target.value }))} placeholder="e.g. tech" />
            </div>
            <div>
              <label style={labelStyle}>Priorities</label>
              <div style={{ display: 'flex', gap: 12 }}>
                {['High', 'Medium', 'Low'].map((p) => (
                  <label key={p} style={{ fontSize: 13, color: '#94a3b8' }}>
                    <input type="checkbox" checked={form.priorities.includes(p)} onChange={() => togglePriority(p)} /> {p}
                  </label>
                ))}
              </div>
            </div>
            <label style={{ fontSize: 13, color: '#94a3b8' }}>
              <input type="checkbox" checked={form.requireScorecard} onChange={(e) => setForm((f) => ({ ...f, requireScorecard: e.target.checked }))} /> Require saved scorecard
            </label>
            <label style={{ fontSize: 13, color: '#94a3b8' }}>
              <input type="checkbox" checked={form.requireJournal} onChange={(e) => setForm((f) => ({ ...f, requireJournal: e.target.checked }))} /> Require journal entry
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={submitRule} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                {editingId ? 'Update' : 'Add rule'}
              </button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setForm({ ...DEFAULT_RULE_TEMPLATE }); }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #1a2035', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ background: '#0a0f1e', border: '1px solid #1a2035', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 12 }}>Saved rules ({rules.length})</div>
          {rules.length === 0 ? (
            <p style={{ color: '#475569', fontSize: 13 }}>No rules yet. Add one to highlight watchlist names that match.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rules.map((rule) => (
                <div key={rule.id} style={{ padding: 12, borderRadius: 8, background: '#060b16', border: '1px solid #1a2035' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{rule.name}</span>
                    <span style={{ fontSize: 11, color: rule.enabled ? '#22c55e' : '#64748b' }}>{rule.enabled ? 'On' : 'Off'}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    {rule.minRating !== 'any' && `${rule.minRating} · `}
                    {rule.tagMatch && `tag "${rule.tagMatch}" · `}
                    {rule.requireScorecard && 'scored · '}
                    {rule.requireJournal && 'journal · '}
                    priorities {rule.priorities.join(', ')}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button type="button" onClick={() => editRule(rule)} style={{ fontSize: 11, color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                    <button type="button" onClick={() => { upsertAlertRule({ ...rule, enabled: !rule.enabled }); reload(); }} style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
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

      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>
        Live matches: {totalMatches} hit{totalMatches === 1 ? '' : 's'} across {evaluations.filter((e) => e.matches.length).length} rule(s)
      </div>

      {evaluations.map(({ rule, matches }) =>
        matches.length === 0 ? null : (
          <div key={rule.id} style={{ background: '#0a0f1e', border: '1px solid #1a2035', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 600, color: '#f8fafc', marginBottom: 10 }}>{rule.name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {matches.map((ctx) => (
                <div key={ctx.ticker} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 12px', background: '#060b16', borderRadius: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, color: '#f1f5f9' }}>{ctx.ticker}</span>
                    <span style={{ marginLeft: 10, fontSize: 12, color: '#818cf8' }}>Rank {ctx.customRank}</span>
                    {ctx.eval && <span style={{ marginLeft: 8, fontSize: 12, color: '#64748b' }}>{ctx.eval.ratingShort}</span>}
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
