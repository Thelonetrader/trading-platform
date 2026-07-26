import React, { useEffect, useMemo, useState } from 'react';
import { RESEARCH_DATA_IMPORTED_EVENT } from './utils/dataBackup';
import JournalCalendar from './components/JournalCalendar';

function Journal({ onOpenTerminal }) {
  const loadTrades = () => {
    const saved = localStorage.getItem('trades');
    return saved ? JSON.parse(saved) : [];
  };
  const [trades, setTrades] = useState(loadTrades);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    ticker: '',
    type: 'Long',
    tradeType: 'Real',
    entryPrice: '',
    exitPrice: '',
    shares: '',
    reasoning: '',
    outcome: '',
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const calcPL = () => {
    const entry = parseFloat(form.entryPrice);
    const exit = parseFloat(form.exitPrice);
    const shares = parseFloat(form.shares);
    if (!entry || !exit || !shares) return null;
    return ((exit - entry) * shares).toFixed(2);
  };

  const handleSubmit = () => {
    if (!form.ticker || !form.entryPrice) return;
    const pl = calcPL();
    let newTrades;
    if (editingId) {
      newTrades = trades.map(t => t.id === editingId ? { ...form, pl, id: editingId } : t);
      setEditingId(null);
    } else {
      newTrades = [{ ...form, pl, id: Date.now() }, ...trades];
    }
    setTrades(newTrades);
    localStorage.setItem('trades', JSON.stringify(newTrades));
    setForm({
      date: new Date().toISOString().split('T')[0],
      ticker: '',
      type: 'Long',
      tradeType: 'Real',
      entryPrice: '',
      exitPrice: '',
      shares: '',
      reasoning: '',
      outcome: '',
    });
    setShowForm(false);
  };const handleEdit = (trade) => {
    setForm({
      date: trade.date,
      ticker: trade.ticker,
      type: trade.type,
      tradeType: trade.tradeType,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
      shares: trade.shares,
      reasoning: trade.reasoning,
      outcome: trade.outcome,
    });
    setEditingId(trade.id);
    setShowForm(true);
  };

const handleDelete = (id) => {
    const newTrades = trades.filter(t => t.id !== id);
    setTrades(newTrades);
    localStorage.setItem('trades', JSON.stringify(newTrades));
  };

  const totalPL = trades.reduce((sum, t) => sum + (parseFloat(t.pl) || 0), 0);
  const winners = trades.filter(t => parseFloat(t.pl) > 0).length;
  const winRate = trades.length > 0 ? ((winners / trades.length) * 100).toFixed(0) : 0;

  const visibleTrades = useMemo(() => {
    if (!selectedCalendarDate) return trades;
    return trades.filter((t) => (t.date || '').slice(0, 10) === selectedCalendarDate);
  }, [trades, selectedCalendarDate]);

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

  useEffect(() => {
    const reload = () => setTrades(loadTrades());
    window.addEventListener(RESEARCH_DATA_IMPORTED_EVENT, reload);
    return () => window.removeEventListener(RESEARCH_DATA_IMPORTED_EVENT, reload);
  }, []);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--tp-text-dim)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>
            Performance Tracking
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--tp-text-strong)', letterSpacing: '-0.02em' }}>
            Trade Journal
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '10px 20px',
            background: '#6366f1',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {showForm ? '✕ Cancel' : '+ Log Trade'}
        </button>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 12,
        marginBottom: 24,
      }}>
        {[
          { label: 'Total Trades', value: trades.length },
          { label: 'Win Rate', value: `${winRate}%` },
          { label: 'Total P&L', value: `£${totalPL.toFixed(2)}`, color: totalPL >= 0 ? '#22c55e' : '#ef4444' },
          { label: 'Winners', value: winners },
          { label: 'Losers', value: trades.length - winners },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'var(--tp-bg-panel)',
            border: '1px solid var(--tp-border)',
            borderRadius: 10,
            padding: '16px 18px',
          }}>
            <div style={{ fontSize: 11, color: 'var(--tp-text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color || '#f1f5f9' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <JournalCalendar
        trades={trades}
        selectedDate={selectedCalendarDate}
        onSelectDate={setSelectedCalendarDate}
      />

      {/* Log Trade Form */}
      {showForm && (
        <div style={{
          background: 'var(--tp-bg-panel)',
          border: '1px solid var(--tp-border)',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tp-text-title)', marginBottom: 20 }}>Log New Trade</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Date</label>
              <input type="date" value={form.date} onChange={e => handleChange('date', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Ticker</label>
              <input placeholder="e.g. ULVR" value={form.ticker} onChange={e => handleChange('ticker', e.target.value.toUpperCase())} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Direction</label>
              <select value={form.type} onChange={e => handleChange('type', e.target.value)} style={inputStyle}>
                <option>Long</option>
                <option>Short</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Trade Type</label>
              <select value={form.tradeType} onChange={e => handleChange('tradeType', e.target.value)} style={inputStyle}>
                <option>Real</option>
                <option>Paper</option>
                <option>Backtest</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Entry Price (£)</label>
              <input type="number" placeholder="0.00" value={form.entryPrice} onChange={e => handleChange('entryPrice', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Exit Price (£)</label>
              <input type="number" placeholder="0.00" value={form.exitPrice} onChange={e => handleChange('exitPrice', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Shares / Units</label>
              <input type="number" placeholder="0" value={form.shares} onChange={e => handleChange('shares', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <div style={{
                background: 'var(--tp-bg-input)',
                border: '1px solid var(--tp-border)',
                borderRadius: 8,
                padding: '8px 12px',
                width: '100%',
                boxSizing: 'border-box',
              }}>
                <div style={{ fontSize: 11, color: 'var(--tp-text-faint)', marginBottom: 2 }}>Estimated P&L</div>
                <div style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: calcPL() >= 0 ? '#22c55e' : '#ef4444',
                }}>
                  {calcPL() !== null ? `£${calcPL()}` : '—'}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Entry Reasoning</label>
              <textarea
                placeholder="Why did you enter this trade?"
                value={form.reasoning}
                onChange={e => handleChange('reasoning', e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Exit Reasoning / Outcome</label>
              <textarea
                placeholder="What happened? What did you learn?"
                value={form.outcome}
                onChange={e => handleChange('outcome', e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          </div>

          <button onClick={handleSubmit} style={{
            padding: '10px 24px',
            background: '#6366f1',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            Save Trade
          </button>
        </div>
      )}

      {/* Trades Table */}
      {trades.length === 0 ? (
        <div style={{
          background: 'var(--tp-bg-panel)',
          border: '1px solid var(--tp-border)',
          borderRadius: 12,
          padding: 48,
          textAlign: 'center',
          color: 'var(--tp-text-dim)',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--tp-text-faint)', marginBottom: 6 }}>No trades logged yet</div>
          <div style={{ fontSize: 13 }}>Click "Log Trade" to record your first trade</div>
        </div>
      ) : visibleTrades.length === 0 ? (
        <div
          style={{
            background: 'var(--tp-bg-panel)',
            border: '1px solid var(--tp-border)',
            borderRadius: 12,
            padding: 32,
            textAlign: 'center',
            color: 'var(--tp-text-muted)',
            fontSize: 13,
          }}
        >
          No trades on {selectedCalendarDate}.{' '}
          <button
            type="button"
            onClick={() => setSelectedCalendarDate(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#818cf8',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Show all
          </button>
        </div>
      ) : (
        <div style={{
          background: 'var(--tp-bg-panel)',
          border: '1px solid var(--tp-border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          {selectedCalendarDate && (
            <div
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid var(--tp-border)',
                fontSize: 12,
                color: 'var(--tp-text-secondary)',
              }}
            >
              Showing trades on <strong style={{ color: 'var(--tp-text)' }}>{selectedCalendarDate}</strong>
            </div>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--tp-border)' }}>
              {['Date', 'Ticker', 'Type', 'Direction', 'Entry', 'Exit', 'Shares', 'P&L', 'Reasoning', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    color: 'var(--tp-text-faint)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontWeight: 600,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleTrades.map((trade, i) => (
                <tr key={trade.id} style={{
                  borderBottom: '1px solid #0f172a',
                  background: i % 2 === 0 ? 'transparent' : '#060b1640',
                }}>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--tp-text-muted)' }}>{trade.date}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: 'var(--tp-text-title)' }}>
                    {onOpenTerminal ? (
                      <button
                        type="button"
                        onClick={() => onOpenTerminal(trade.ticker)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: '#818cf8',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer',
                        }}
                      >
                        {trade.ticker}
                      </button>
                    ) : (
                      trade.ticker
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: trade.tradeType === 'Real' ? '#6366f120' : trade.tradeType === 'Paper' ? '#f59e0b20' : '#10b98120',
                      color: trade.tradeType === 'Real' ? '#6366f1' : trade.tradeType === 'Paper' ? '#f59e0b' : '#10b981',
                      fontWeight: 600,
                    }}>{trade.tradeType}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: trade.type === 'Long' ? '#22c55e' : '#ef4444' }}>{trade.type}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--tp-text-secondary)' }}>£{trade.entryPrice}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--tp-text-secondary)' }}>£{trade.exitPrice || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--tp-text-secondary)' }}>{trade.shares}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: parseFloat(trade.pl) >= 0 ? '#22c55e' : '#ef4444' }}>
                    {trade.pl ? `£${trade.pl}` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--tp-text-faint)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {trade.reasoning || '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {onOpenTerminal && (
                        <button
                          type="button"
                          onClick={() => onOpenTerminal(trade.ticker)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 5,
                            border: 'none',
                            background: '#6366f1',
                            color: '#fff',
                            fontSize: 11,
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          Terminal
                        </button>
                      )}
                      <button onClick={() => handleEdit(trade)} style={{
                        padding: '4px 10px', borderRadius: 5, border: '1px solid var(--tp-border)',
                        background: 'transparent', color: '#6366f1', fontSize: 11,
                        cursor: 'pointer', fontWeight: 600,
                      }}>Edit</button>
                      <button onClick={() => handleDelete(trade.id)} style={{
                        padding: '4px 10px', borderRadius: 5, border: '1px solid var(--tp-border)',
                        background: 'transparent', color: '#ef4444', fontSize: 11,
                        cursor: 'pointer', fontWeight: 600,
                      }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Journal;