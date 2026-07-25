import React, { useCallback, useEffect, useState } from 'react';
import Journal from './Journal';
import Watchlist from './Watchlist';
import Portfolio from './Portfolio';
import Scorecards from './Scorecards';
import Screener from './Screener';
import CommandBar from './components/CommandBar';
import QuoteStrip from './components/QuoteStrip';
import TerminalWorkspace from './components/TerminalWorkspace';
import Settings from './components/Settings';
import { useTradingApi } from './hooks/useTradingApi';
import { parseCommand } from './utils/parseCommand';
import { RESEARCH_DATA_IMPORTED_EVENT } from './utils/dataBackup';
import {
  formatGbp,
  getJournalCount,
  getPortfolioStats,
  getWatchlistSymbols,
} from './utils/storageStats';

function App() {
  const [activePage, setActivePage] = useState('terminal');
  const [activeSymbol, setActiveSymbol] = useState('');
  const [activeContract, setActiveContract] = useState({ exchange: 'SMART', currency: 'USD' });
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandMsg, setCommandMsg] = useState('');
  const [orderPreset, setOrderPreset] = useState(null);
  const [scorecardFocus, setScorecardFocus] = useState({ ticker: '', sector: '' });
  const [screenerRefreshKey, setScreenerRefreshKey] = useState(0);

  const {
    connection,
    quotes,
    settings,
    connect,
    disconnect,
    saveSettings,
    subscribeSymbols,
  } = useTradingApi();

  const watchlistSymbols = getWatchlistSymbols();
  const stripSymbols = watchlistSymbols.length
    ? watchlistSymbols
    : activeSymbol
      ? [{ ticker: activeSymbol, ...activeContract }]
      : [];

  useEffect(() => {
    if (activePage === 'screener') {
      setScreenerRefreshKey((k) => k + 1);
    }
  }, [activePage]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (connection.status !== 'connected') return;
    const syms = getWatchlistSymbols();
    if (activeSymbol) {
      const inList = syms.some((s) => s.ticker === activeSymbol);
      if (!inList) {
        syms.push({ ticker: activeSymbol, ...activeContract });
      }
    }
    if (syms.length) subscribeSymbols(syms);
  }, [connection.status, activeSymbol, activeContract, subscribeSymbols]);

  const runCommand = useCallback(
    (input) => {
      const cmd = parseCommand(input);
      setCommandMsg('');

      if (cmd.type === 'help') {
        setCommandMsg('Symbol · buy TICKER 10 · sell TICKER 5 · watch TICKER · go watchlist · go screener · go settings');
        return;
      }
      if (cmd.type === 'nav') {
        setActivePage(cmd.page);
        setCommandOpen(false);
        return;
      }
      if (cmd.type === 'symbol') {
        setActiveSymbol(cmd.symbol);
        setActivePage('terminal');
        setCommandOpen(false);
        return;
      }
      if (cmd.type === 'order') {
        setActiveSymbol(cmd.symbol);
        setOrderPreset({ side: cmd.side, qty: cmd.qty });
        setActivePage('terminal');
        setCommandOpen(false);
        return;
      }
      if (cmd.type === 'watch') {
        const list = JSON.parse(localStorage.getItem('watchlist') || '[]');
        if (!list.some((s) => (s.ticker || '').toUpperCase() === cmd.symbol)) {
          list.unshift({
            id: Date.now(),
            ticker: cmd.symbol,
            exchange: 'SMART',
            currency: 'USD',
            priority: 'Medium',
            addedDate: new Date().toISOString().split('T')[0],
          });
          localStorage.setItem('watchlist', JSON.stringify(list));
        }
        setActiveSymbol(cmd.symbol);
        setCommandOpen(false);
        setCommandMsg(`Added ${cmd.symbol} to watchlist`);
        return;
      }
      if (cmd.type === 'unknown') {
        setCommandMsg(`Unknown: ${cmd.raw}`);
        return;
      }
      setCommandOpen(false);
    },
    [],
  );

  const navItems = [
    { id: 'terminal', label: 'Terminal', icon: '▤' },
    { id: 'dashboard', label: 'Dashboard', icon: '⬡' },
    { id: 'screener', label: 'Stock Screener', icon: '◈' },
    { id: 'scorecard', label: 'Scorecards', icon: '▣' },
    { id: 'portfolio', label: 'Portfolio', icon: '◎' },
    { id: 'watchlist', label: 'Watchlist', icon: '◉' },
    { id: 'journal', label: 'Trade Journal', icon: '✦' },
    { id: 'news', label: 'News & Sentiment', icon: '◆' },
    { id: 'alerts', label: 'Alerts', icon: '◇' },
    { id: 'settings', label: 'Settings', icon: '⚙' },
  ];

  const implemented = new Set([
    'terminal',
    'dashboard',
    'journal',
    'watchlist',
    'portfolio',
    'scorecard',
    'screener',
    'settings',
  ]);

  const connDot =
    connection.status === 'connected' ? '#22c55e' : connection.status === 'connecting' ? '#f59e0b' : '#475569';

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: '#060b16',
        color: '#e2e8f0',
        fontFamily: "'Inter', system-ui, sans-serif",
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: 220,
          background: '#0a0f1e',
          borderRight: '1px solid #1a2035',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #1a2035' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.2em', color: '#334155', textTransform: 'uppercase', marginBottom: 4 }}>
            The Lone Trader
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Trading Platform
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
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
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #1a2035', fontSize: 11, color: '#1e293b' }}>
          v0.2.0 · ⌘K command
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div
          style={{
            height: 56,
            background: '#0a0f1e',
            borderBottom: '1px solid #1a2035',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
            {navItems.find((n) => n.id === activePage)?.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              style={{
                fontSize: 12,
                color: '#64748b',
                background: '#060b16',
                border: '1px solid #1a2035',
                borderRadius: 6,
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              ⌘K
            </button>
            <div style={{ fontSize: 12, color: '#334155' }}>
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: connDot,
                boxShadow: `0 0 6px ${connDot}`,
              }}
              title={connection.status}
            />
          </div>
        </div>

        <QuoteStrip
          symbols={stripSymbols}
          activeSymbol={activeSymbol}
          quotes={quotes}
          connection={connection}
        />

        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {activePage === 'terminal' && (
            <TerminalWorkspace
              symbol={activeSymbol}
              exchange={activeContract.exchange}
              currency={activeContract.currency}
              quote={activeSymbol ? quotes[activeSymbol] : null}
              connection={connection}
              settings={settings}
              orderPreset={orderPreset}
              onOrderPlaced={() => setOrderPreset(null)}
            />
          )}
          {activePage === 'dashboard' && (
            <Dashboard onNavigate={setActivePage} portfolioStats={getPortfolioStats()} />
          )}
          {activePage === 'journal' && <Journal />}
          {activePage === 'watchlist' && (
            <Watchlist
              quotes={quotes}
              onSelectSymbol={(sym, contract) => {
                setActiveSymbol(sym);
                if (contract) setActiveContract(contract);
                setActivePage('terminal');
              }}
            />
          )}
          {activePage === 'portfolio' && <Portfolio connection={connection} />}
          {activePage === 'scorecard' && (
            <Scorecards focusTicker={scorecardFocus.ticker} focusSector={scorecardFocus.sector} />
          )}
          {activePage === 'screener' && (
            <Screener
              refreshKey={screenerRefreshKey}
              quotes={quotes}
              connection={connection}
              onOpenTerminal={(sym, contract) => {
                setActiveSymbol(sym);
                if (contract) setActiveContract(contract);
                setActivePage('terminal');
              }}
              onOpenScorecard={(sym, sector) => {
                setScorecardFocus({ ticker: sym, sector: sector || 'tech' });
                setActivePage('scorecard');
              }}
            />
          )}
          {activePage === 'settings' && (
            <Settings
              settings={settings}
              connection={connection}
              onSave={saveSettings}
              onConnect={connect}
              onDisconnect={disconnect}
              onDataImported={() => {
                setScreenerRefreshKey((k) => k + 1);
                window.dispatchEvent(new Event(RESEARCH_DATA_IMPORTED_EVENT));
              }}
            />
          )}
          {!implemented.has(activePage) && (
            <ComingSoon page={navItems.find((n) => n.id === activePage)?.label} />
          )}
        </div>
      </div>

      <CommandBar
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onSubmit={runCommand}
        message={commandMsg}
      />
    </div>
  );
}

function Dashboard({ onNavigate, portfolioStats }) {
  const journalCount = getJournalCount();
  const watchCount = getWatchlistSymbols().length;
  const plSign = portfolioStats.plPct >= 0;

  const stats = [
    {
      label: 'Portfolio Value',
      value: formatGbp(portfolioStats.totalValue),
      change: `${plSign ? '+' : ''}${portfolioStats.plPct.toFixed(2)}% vs cost`,
      positive: plSign,
    },
    {
      label: 'Watchlist Items',
      value: String(watchCount),
      change: watchCount ? 'Live when IB connected' : 'Add symbols',
      positive: true,
    },
    {
      label: 'Manual Holdings',
      value: String(portfolioStats.holdingsCount),
      change: portfolioStats.holdingsCount ? 'Tracked locally' : 'No holdings',
      positive: true,
    },
    {
      label: 'Journal Entries',
      value: String(journalCount),
      change: journalCount ? 'Logged trades' : 'Start logging',
      positive: true,
    },
  ];

  const actions = [
    { label: 'Add to Watchlist', page: 'watchlist' },
    { label: 'Log a Trade', page: 'journal' },
    { label: 'Open Terminal', page: 'terminal' },
    { label: 'IB Settings', page: 'settings' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>
          Welcome back
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
          Good{' '}
          {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, Luke
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              background: '#0a0f1e',
              border: '1px solid #1a2035',
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: stat.positive ? '#22c55e' : '#ef4444' }}>{stat.change}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#0a0f1e', border: '1px solid #1a2035', borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>Quick Actions</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => onNavigate(action.page)}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid #1a2035',
                borderRadius: 8,
                color: '#475569',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ComingSoon({ page }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        color: '#334155',
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>◈</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#475569', marginBottom: 8 }}>{page}</div>
      <div style={{ fontSize: 14 }}>Coming in the next build</div>
    </div>
  );
}

export default App;
