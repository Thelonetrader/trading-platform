import React, { useState, useEffect } from 'react';

function Portfolio({ connection }) {
  const [tab, setTab] = useState('manual');
  const [brokerPositions, setBrokerPositions] = useState([]);
  const [loadingBroker, setLoadingBroker] = useState(false);
  const [holdings, setHoldings] = useState(() => {
    const saved = localStorage.getItem('portfolio');
    return saved ? JSON.parse(saved) : [];
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    ticker: '',
    name: '',
    sector: '',
    shares: '',
    avgBuyPrice: '',
    currentPrice: '',
    dividendYield: '',
    notes: '',
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAdd = () => {
    if (!form.ticker || !form.shares || !form.avgBuyPrice) return;
    const newHoldings = [{ ...form, id: Date.now(), addedDate: new Date().toISOString().split('T')[0] }, ...holdings];
    setHoldings(newHoldings);
    localStorage.setItem('portfolio', JSON.stringify(newHoldings));
    setForm({ ticker: '', name: '', sector: '', shares: '', avgBuyPrice: '', currentPrice: '', dividendYield: '', notes: '' });
    setShowForm(false);
  };

  const handleDelete = (id) => {
    const newHoldings = holdings.filter(h => h.id !== id);
    setHoldings(newHoldings);
    localStorage.setItem('portfolio', JSON.stringify(newHoldings));
  };

  const calcValue = (h) => (parseFloat(h.shares) * parseFloat(h.currentPrice || h.avgBuyPrice)).toFixed(2);
  const calcCost = (h) => (parseFloat(h.shares) * parseFloat(h.avgBuyPrice)).toFixed(2);
  const calcPL = (h) => (parseFloat(calcValue(h)) - parseFloat(calcCost(h))).toFixed(2);
  const calcPLPct = (h) => (((parseFloat(calcValue(h)) - parseFloat(calcCost(h))) / parseFloat(calcCost(h))) * 100).toFixed(2);
  const calcAnnualIncome = (h) => h.dividendYield ? ((parseFloat(calcValue(h)) * parseFloat(h.dividendYield)) / 100).toFixed(2) : '0.00';

  const totalValue = holdings.reduce((sum, h) => sum + parseFloat(calcValue(h)), 0);
  const totalCost = holdings.reduce((sum, h) => sum + parseFloat(calcCost(h)), 0);
  const totalPL = (totalValue - totalCost).toFixed(2);
  const totalIncome = holdings.reduce((sum, h) => sum + parseFloat(calcAnnualIncome(h)), 0).toFixed(2);

  useEffect(() => {
    if (tab !== 'broker' || connection?.status !== 'connected' || !window.trading) return;
    setLoadingBroker(true);
    window.trading
      .getPositions()
      .then((rows) => setBrokerPositions(rows.filter((p) => p.position !== 0)))
      .catch(() => setBrokerPositions([]))
      .finally(() => setLoadingBroker(false));
  }, [tab, connection?.status]);

  const tabBtn = (id, label) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      style={{
        padding: '8px 16px',
        borderRadius: 8,
        border: 'none',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: 13,
        background: tab === id ? '#6366f1' : '#1a2035',
        color: tab === id ? '#fff' : '#64748b',
      }}
    >
      {label}
    </button>
  );

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
            Holdings & Performance
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Portfolio
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
          display: tab === 'manual' ? 'block' : 'none',
        }}>
          {showForm ? '✕ Cancel' : '+ Add Holding'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {tabBtn('manual', 'Manual holdings')}
        {tabBtn('broker', 'IB positions')}
      </div>

      {tab === 'broker' && (
        <div style={{ marginBottom: 24 }}>
          {connection?.status !== 'connected' ? (
            <div style={{ color: '#f59e0b', fontSize: 13 }}>Connect IB Gateway in Settings to view broker positions.</div>
          ) : loadingBroker ? (
            <div style={{ color: '#64748b', fontSize: 13 }}>Loading positions…</div>
          ) : brokerPositions.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: 13 }}>No open IB positions.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {brokerPositions.map((p, i) => (
                <div
                  key={`${p.symbol}-${i}`}
                  style={{
                    background: '#0a0f1e',
                    border: '1px solid #1a2035',
                    borderRadius: 10,
                    padding: '14px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 800, color: '#f1f5f9' }}>{p.symbol}</span>
                    <span style={{ marginLeft: 10, fontSize: 12, color: '#64748b' }}>{p.exchange}</span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 13 }}>
                    <div style={{ color: '#e2e8f0' }}>{p.position} sh</div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>Avg {Number(p.avgCost).toFixed(2)} {p.currency}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'manual' && (
        <>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 12,
        marginBottom: 24,
      }}>
        {[
          { label: 'Total Value', value: `£${totalValue.toFixed(2)}` },
          { label: 'Total Cost', value: `£${totalCost.toFixed(2)}` },
          { label: 'Total P&L', value: `£${totalPL}`, color: parseFloat(totalPL) >= 0 ? '#22c55e' : '#ef4444' },
          { label: 'Annual Income', value: `£${totalIncome}`, color: '#6366f1' },
          { label: 'Holdings', value: holdings.length },
        ].map((s, i) => (
          <div key={i} style={{
            background: '#0a0f1e',
            border: '1px solid #1a2035',
            borderRadius: 10,
            padding: '16px 18px',
          }}>
            <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color || '#f1f5f9' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Add Holding Form */}
      {showForm && (
        <div style={{
          background: '#0a0f1e',
          border: '1px solid #1a2035',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 20 }}>Add Holding</div>
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
              <label style={labelStyle}>Shares</label>
              <input type="number" placeholder="0" value={form.shares} onChange={e => handleChange('shares', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Avg Buy Price (£)</label>
              <input type="number" placeholder="0.00" value={form.avgBuyPrice} onChange={e => handleChange('avgBuyPrice', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Current Price (£)</label>
              <input type="number" placeholder="0.00" value={form.currentPrice} onChange={e => handleChange('currentPrice', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Dividend Yield (%)</label>
              <input type="number" placeholder="0.00" value={form.dividendYield} onChange={e => handleChange('dividendYield', e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Notes</label>
            <textarea
              placeholder="Why do you hold this? Any targets or exit conditions?"
              value={form.notes}
              onChange={e => handleChange('notes', e.target.value)}
              rows={2}
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
            Add Holding
          </button>
        </div>
      )}

      {/* Holdings */}
      {holdings.length === 0 ? (
        <div style={{
          background: '#0a0f1e',
          border: '1px solid #1a2035',
          borderRadius: 12,
          padding: 48,
          textAlign: 'center',
          color: '#334155',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#475569', marginBottom: 6 }}>No holdings yet</div>
          <div style={{ fontSize: 13 }}>Click "Add Holding" to track your portfolio</div>
        </div>
      ) : (
        <div style={{
          background: '#0a0f1e',
          border: '1px solid #1a2035',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1a2035' }}>
                {['Ticker', 'Sector', 'Shares', 'Avg Buy', 'Current', 'Value', 'P&L', 'P&L %', 'Annual Income', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontWeight: 600,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holdings.map((h, i) => (
                <tr key={h.id} style={{
                  borderBottom: '1px solid #0f172a',
                  background: i % 2 === 0 ? 'transparent' : '#060b1640',
                }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{h.ticker}</div>
                    {h.name && <div style={{ fontSize: 11, color: '#475569' }}>{h.name}</div>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>{h.sector || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8' }}>{h.shares}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8' }}>£{h.avgBuyPrice}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8' }}>£{h.currentPrice || h.avgBuyPrice}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>£{calcValue(h)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: parseFloat(calcPL(h)) >= 0 ? '#22c55e' : '#ef4444' }}>
                    £{calcPL(h)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: parseFloat(calcPLPct(h)) >= 0 ? '#22c55e' : '#ef4444' }}>
                    {calcPLPct(h)}%
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#6366f1', fontWeight: 600 }}>
                    £{calcAnnualIncome(h)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => handleDelete(h.id)} style={{
                      padding: '4px 10px', borderRadius: 5, border: '1px solid #1a2035',
                      background: 'transparent', color: '#ef4444', fontSize: 11,
                      cursor: 'pointer', fontWeight: 600,
                    }}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
        </>
      )}
    </div>
  );
}

export default Portfolio;