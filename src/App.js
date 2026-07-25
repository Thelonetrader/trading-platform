import React, { useState } from 'react';
import Journal from './Journal';
import Watchlist from './Watchlist';
import Portfolio from './Portfolio';

function App() {
  const [activePage, setActivePage] = useState('dashboard');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '⬡' },
    { id: 'screener', label: 'Stock Screener', icon: '◈' },
    { id: 'scorecard', label: 'Scorecards', icon: '▣' },
    { id: 'portfolio', label: 'Portfolio', icon: '◎' },
    { id: 'watchlist', label: 'Watchlist', icon: '◉' },
    { id: 'journal', label: 'Trade Journal', icon: '✦' },
    { id: 'news', label: 'News & Sentiment', icon: '◆' },
    { id: 'alerts', label: 'Alerts', icon: '◇' },
  ];

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#060b16',
      color: '#e2e8f0',
      fontFamily: "'Inter', system-ui, sans-serif",
      overflow: 'hidden',
    }}>

      {/* Sidebar */}
      <div style={{
        width: 220,
        background: '#0a0f1e',
        borderRight: '1px solid #1a2035',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          padding: '24px 20px 20px',
          borderBottom: '1px solid #1a2035',
        }}>
          <div style={{
            fontSize: 11,
            letterSpacing: '0.2em',
            color: '#334155',
            textTransform: 'uppercase',
            marginBottom: 4,
          }}>The Lone Trader</div>
          <div style={{
            fontSize: 18,
            fontWeight: 800,
            color: '#f8fafc',
            letterSpacing: '-0.02em',
          }}>Trading Platform</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              style={{
                width: '100%',
                padding: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: activePage === item.id ? '#1a2035' : 'transparent',
                border: 'none',
                borderLeft: activePage === item.id ? '2px solid #6366f1' : '2px solid transparent',
                color: activePage === item.id ? '#f1f5f9' : '#475569',
                fontSize: 13,
                fontWeight: activePage === item.id ? 600 : 400,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #1a2035',
          fontSize: 11,
          color: '#1e293b',
        }}>
          v0.1.0 — Development Build
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top Bar */}
        <div style={{
          height: 56,
          background: '#0a0f1e',
          borderBottom: '1px solid #1a2035',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
            {navItems.find(n => n.id === activePage)?.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 12, color: '#334155' }}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 6px #22c55e',
            }} />
          </div>
        </div>

        {/* Page Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {activePage === 'dashboard' && <Dashboard />}
{activePage === 'journal' && <Journal />}
{activePage === 'watchlist' && <Watchlist />}
{activePage === 'portfolio' && <Portfolio />}
{activePage !== 'dashboard' && activePage !== 'journal' && activePage !== 'watchlist' && activePage !== 'portfolio' && (
  <ComingSoon page={navItems.find(n => n.id === activePage)?.label} />
)}
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const stats = [
    { label: 'Portfolio Value', value: '£250,000', change: '+0.00%', positive: true },
    { label: 'Watchlist Items', value: '0', change: 'No alerts', positive: true },
    { label: 'Open Positions', value: '0', change: 'No positions', positive: true },
    { label: 'Journal Entries', value: '0', change: 'Start logging', positive: true },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>
          Welcome back
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, Luke
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 24,
      }}>
        {stats.map((stat, i) => (
          <div key={i} style={{
            background: '#0a0f1e',
            border: '1px solid #1a2035',
            borderRadius: 12,
            padding: '20px 20px',
          }}>
            <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 12, color: stat.positive ? '#22c55e' : '#ef4444' }}>
              {stat.change}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{
        background: '#0a0f1e',
        border: '1px solid #1a2035',
        borderRadius: 12,
        padding: 20,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>
          Quick Actions
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['Add to Watchlist', 'Log a Trade', 'Run Screener', 'Open Scorecard'].map(action => (
            <button key={action} style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid #1a2035',
              borderRadius: 8,
              color: '#475569',
              fontSize: 13,
              cursor: 'pointer',
            }}>
              {action}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ComingSoon({ page }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '60vh',
      color: '#334155',
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>◈</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#475569', marginBottom: 8 }}>{page}</div>
      <div style={{ fontSize: 14 }}>Coming in the next build</div>
    </div>
  );
}

export default App;