import React, { useState } from 'react';

function Watchlist({ quotes = {}, onSelectSymbol }) {
  const [stocks, setStocks] = useState(() => {
    const saved = localStorage.getItem('watchlist');
    return saved ? JSON.parse(saved) : [];
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    ticker: '',
    name: '',
    sector: '',
    buyPrice: '',
    notes: '',
    priority: 'Medium',
    exchange: 'SMART',
    currency: 'USD',
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAdd = () => {
    if (!form.ticker) return;
    const newStocks = [{ ...form, id: Date.now(), addedDate: new Date().toISOString().split('T')[0] }, ...stocks];
    setStocks(newStocks);
    localStorage.setItem('watchlist', JSON.stringify(newStocks));
    setForm({ ticker: '', name: '', sector: '', buyPrice: '', notes: '', priority: 'Medium', exchange: 'SMART', currency: 'USD' });
    setShowForm(false);
  };

  const handleDelete = (id) => {
    const newStocks = stocks.filter(s => s.id !== id);
    setStocks(newStocks);
    localStorage.setItem('watchlist', JSON.stringify(newStocks));
  };

  const priorityColor = (p) => p === 'High' ? '#ef4444' : p === 'Medium' ? '#f59e0b' : '#22c55e';

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

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>
            Stocks to Watch
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Watchlist
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          padding: '10px 20px',
          background: '#6366f1',
          border: 'none',
          borderRadius: 8,
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}>
          {showForm ? '✕ Cancel' : '+ Add Stock'}
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
          { label: 'Watching', value: stocks.length },
          { label: 'High Priority', value: stocks.filter(s => s.priority === 'High').length, color: '#ef4444' },
          { label: 'Medium Priority', value: stocks.filter(s => s.priority === 'Medium').length, color: '#f59e0b' },
          { label: 'Low Priority', value: stocks.filter(s => s.priority === 'Low').length, color: '#22c55e' },
        ].map((s, i) => (
          <div key={i} style={{
            background: '#0a0f1e',
            border: '1px solid #1a2035',
            borderRadius: 10,
            padding: '16px 18px',
          }}>
            <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color || '#f1f5f9' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Add Stock Form */}
      {showForm && (
        <div style={{
          background: '#0a0f1e',
          border: '1px solid #1a2035',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 20 }}>Add Stock to Watchlist</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Ticker</label>
              <input placeholder="e.g. ULVR" value={form.ticker} onChange={e => handleChange('ticker', e.target.value.toUpperCase())} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Company Name</label>
              <input placeholder="e.g. Unilever" value={form.name} onChange={e => handleChange('name', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Sector</label>
              <select value={form.sector} onChange={e => handleChange('sector', e.target.value)} style={inputStyle}>
                <option value="">Select sector</option>
                <option>Consumer Staples</option>
                <option>Technology</option>
                <option>Energy</option>
                <option>Financial Services</option>
                <option>Healthcare</option>
                <option>Real Estate</option>
                <option>Industrials</option>
                <option>Materials</option>
                <option>Utilities</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Target Buy Price (£)</label>
              <input type="number" placeholder="0.00" value={form.buyPrice} onChange={e => handleChange('buyPrice', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Exchange (IB)</label>
              <input placeholder="SMART or LSE" value={form.exchange} onChange={e => handleChange('exchange', e.target.value.toUpperCase())} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <input placeholder="USD / GBP" value={form.currency} onChange={e => handleChange('currency', e.target.value.toUpperCase())} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Priority</label>
              <select value={form.priority} onChange={e => handleChange('priority', e.target.value)} style={inputStyle}>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Notes</label>
            <textarea
              placeholder="Why are you watching this stock? What would make you buy?"
              value={form.notes}
              onChange={e => handleChange('notes', e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          <button onClick={handleAdd} style={{
            padding: '10px 24px',
            background: '#6366f1',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            Add to Watchlist
          </button>
        </div>
      )}

      {/* Watchlist */}
      {stocks.length === 0 ? (
        <div style={{
          background: '#0a0f1e',
          border: '1px solid #1a2035',
          borderRadius: 12,
          padding: 48,
          textAlign: 'center',
          color: '#334155',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>◉</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#475569', marginBottom: 6 }}>No stocks on your watchlist</div>
          <div style={{ fontSize: 13 }}>Click "Add Stock" to start watching</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stocks.map(stock => {
            const sym = (stock.ticker || '').toUpperCase();
            const q = quotes[sym];
            return (
            <div key={stock.id} style={{
              background: '#0a0f1e',
              border: '1px solid #1a2035',
              borderRadius: 12,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flex: 1 }}>
                {/* Priority indicator */}
                <div style={{
                  width: 4,
                  alignSelf: 'stretch',
                  borderRadius: 2,
                  background: priorityColor(stock.priority),
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>{stock.ticker}</span>
                    {stock.name && <span style={{ fontSize: 13, color: '#475569' }}>{stock.name}</span>}
                    {stock.sector && (
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 4,
                        background: '#1a2035', color: '#64748b', fontWeight: 500,
                      }}>{stock.sector}</span>
                    )}
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                      background: `${priorityColor(stock.priority)}20`,
                      color: priorityColor(stock.priority),
                    }}>{stock.priority}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 20, marginBottom: stock.notes ? 8 : 0 }}>
                    {stock.buyPrice && (
                      <div style={{ fontSize: 12, color: '#475569' }}>
                        Target: <span style={{ color: '#22c55e', fontWeight: 600 }}>£{stock.buyPrice}</span>
                      </div>
                    )}
                    {q?.last != null && (
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>
                        Last: <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{Number(q.last).toFixed(2)}</span>
                        {q.changePct != null && (
                          <span style={{ marginLeft: 8, color: q.changePct >= 0 ? '#22c55e' : '#ef4444' }}>
                            {q.changePct >= 0 ? '+' : ''}{q.changePct.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: '#334155' }}>Added: {stock.addedDate}</div>
                  </div>
                  {stock.notes && (
                    <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{stock.notes}</div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                {onSelectSymbol && (
                  <button type="button" onClick={() => onSelectSymbol(sym, { exchange: stock.exchange || 'SMART', currency: stock.currency || 'USD' })} style={{
                    padding: '4px 10px', borderRadius: 5, border: '1px solid #334155',
                    background: 'transparent', color: '#6366f1', fontSize: 11,
                    cursor: 'pointer', fontWeight: 600,
                  }}>Terminal</button>
                )}
              <button onClick={() => handleDelete(stock.id)} style={{
                padding: '4px 10px', borderRadius: 5, border: '1px solid #1a2035',
                background: 'transparent', color: '#ef4444', fontSize: 11,
                cursor: 'pointer', fontWeight: 600, flexShrink: 0,
              }}>Remove</button>
              </div>
            </div>
          );})}
        </div>
      )}
    </div>
  );
}

export default Watchlist;