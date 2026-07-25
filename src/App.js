import React, { useCallback, useEffect, useRef, useState } from 'react';
import Journal from './Journal';
import Watchlist from './Watchlist';
import Portfolio from './Portfolio';
import Scorecards from './Scorecards';
import News from './News';
import ScorecardLibrary from './ScorecardLibrary';
import Screener from './Screener';
import ChartScanner from './ChartScanner';
import Alerts from './Alerts';
import CommandBar from './components/CommandBar';
import QuoteStrip from './components/QuoteStrip';
import TerminalWorkspace from './components/TerminalWorkspace';
import AccountStrip from './components/AccountStrip';
import Settings from './components/Settings';
import { useTradingApi } from './hooks/useTradingApi';
import { useMarketData } from './hooks/useMarketData';
import { useAgent } from './hooks/useAgent';
import { useAlertNotifications } from './hooks/useAlertNotifications';
import { parseCommand } from './utils/parseCommand';
import { RESEARCH_DATA_IMPORTED_EVENT } from './utils/dataBackup';
import {
  formatGbp,
  getJournalCount,
  getPortfolioStats,
  getWatchlistSymbols,
} from './utils/storageStats';
import { mergeLiveSubscribeSymbols, WATCHLIST_CHANGED_EVENT } from './utils/liveSubscribe';
import { quoteForSymbol } from './utils/quoteDisplay';
import { contractFromResolved, resolveSymbolForTerminal } from './utils/resolveSymbolContract';
import {
  patchWatchlistFromResolved,
  reconcilePlaceholderWatchlistEntries,
  resolveAndPatchWatchlist,
} from './utils/watchlistAutoFill';

function App() {
  const [activePage, setActivePage] = useState('terminal');
  const [activeSymbol, setActiveSymbol] = useState('');
  const [activeContract, setActiveContract] = useState({ exchange: 'SMART', currency: 'USD' });
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandMsg, setCommandMsg] = useState('');
  const [orderPreset, setOrderPreset] = useState(null);
  const [scorecardFocus, setScorecardFocus] = useState({ ticker: '', sector: '' });
  const [screenerRefreshKey, setScreenerRefreshKey] = useState(0);
  const [terminalResearchVersion, setTerminalResearchVersion] = useState(0);
  const [cancelBusyId, setCancelBusyId] = useState(null);
  const [portfolioSubTick, setPortfolioSubTick] = useState(0);
  const [scorecardLiveTicker, setScorecardLiveTicker] = useState('');
  const [screenerExtraTickers, setScreenerExtraTickers] = useState([]);
  const [scannerExtraEntries, setScannerExtraEntries] = useState([]);

  const {
    connection,
    quotes,
    settings,
    openOrders,
    accountSummary,
    tradingRefreshing,
    connect,
    disconnect,
    saveSettings,
    subscribeSymbols,
    refreshTradingData,
    cancelOrder,
    fetchFundamentals,
    fetchHistoricalBars,
    isElectron,
  } = useTradingApi();

  const { testFmp, config: marketConfig, fetchNews, fetchScreenerSnapshots } = useMarketData();
  const {
    config: agentConfig,
    activeProfile,
    saveConfig: saveAgentConfig,
    setActiveProfile,
    updateProfile,
    addProfile,
    testAgent,
    chat: agentChat,
  } = useAgent();
  const hasFmpKey = !!(settings?.marketData?.fmpApiKey || marketConfig.fmpApiKey || '').trim();

  useAlertNotifications(quotes);

  const resolveGenRef = useRef(0);

  const openTerminalForTicker = useCallback((sym) => {
    const upper = (sym || '').trim().toUpperCase();
    if (!upper) return;
    const gen = ++resolveGenRef.current;
    setActiveSymbol(upper);
    setActivePage('terminal');
    resolveSymbolForTerminal(upper).then((resolved) => {
      if (resolveGenRef.current !== gen) return;
      setActiveContract(contractFromResolved(resolved));
      if (patchWatchlistFromResolved(resolved).updated) {
        setTerminalResearchVersion((v) => v + 1);
      }
    });
  }, []);

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
    if (activePage === 'terminal') {
      setTerminalResearchVersion((v) => v + 1);
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
    if (activePage !== 'screener') setScreenerExtraTickers([]);
    if (activePage !== 'chartscanner') setScannerExtraEntries([]);
  }, [activePage]);

  useEffect(() => {
    const bump = () => setPortfolioSubTick((t) => t + 1);
    window.addEventListener(RESEARCH_DATA_IMPORTED_EVENT, bump);
    window.addEventListener('portfolio-changed', bump);
    window.addEventListener(WATCHLIST_CHANGED_EVENT, bump);
    return () => {
      window.removeEventListener(RESEARCH_DATA_IMPORTED_EVENT, bump);
      window.removeEventListener('portfolio-changed', bump);
      window.removeEventListener(WATCHLIST_CHANGED_EVENT, bump);
    };
  }, []);

  useEffect(() => {
    if (!hasFmpKey) return;
    reconcilePlaceholderWatchlistEntries({ limit: 12 }).then(({ reconciled }) => {
      if (reconciled > 0) setPortfolioSubTick((t) => t + 1);
    });
  }, [hasFmpKey]);

  useEffect(() => {
    if (connection.status !== 'connected') return;
    const syms = mergeLiveSubscribeSymbols({
      activeSymbol,
      activeContract,
      extraTickers: [
        ...(scorecardLiveTicker ? [scorecardLiveTicker] : []),
        ...screenerExtraTickers,
        ...scannerExtraEntries,
      ],
    });
    if (syms.length) subscribeSymbols(syms);
  }, [
    connection.status,
    activeSymbol,
    activeContract,
    subscribeSymbols,
    portfolioSubTick,
    scorecardLiveTicker,
    screenerExtraTickers,
    scannerExtraEntries,
  ]);

  const runCommand = useCallback(
    (input) => {
      const cmd = parseCommand(input);
      setCommandMsg('');

      if (cmd.type === 'help') {
        setCommandMsg('Symbol · buy TICKER 10 · go chartscanner · go screener · watch TICKER · help');
        return;
      }
      if (cmd.type === 'nav') {
        setActivePage(cmd.page);
        setCommandOpen(false);
        return;
      }
      if (cmd.type === 'symbol') {
        openTerminalForTicker(cmd.symbol);
        setCommandOpen(false);
        return;
      }
      if (cmd.type === 'order') {
        openTerminalForTicker(cmd.symbol);
        setOrderPreset({ side: cmd.side, qty: cmd.qty });
        setCommandOpen(false);
        return;
      }
      if (cmd.type === 'watch') {
        setCommandOpen(false);
        resolveAndPatchWatchlist(cmd.symbol, { addIfMissing: true }).then(({ created, resolved }) => {
          openTerminalForTicker(resolved.symbol || cmd.symbol);
          setCommandMsg(
            created
              ? `Added ${cmd.symbol} to watchlist (auto-filled exchange & name)`
              : `Updated ${cmd.symbol} on watchlist`,
          );
        });
        return;
      }
      if (cmd.type === 'unknown') {
        setCommandMsg(`Unknown: ${cmd.raw}`);
        return;
      }
      setCommandOpen(false);
    },
    [openTerminalForTicker],
  );

  const navItems = [
    { id: 'terminal', label: 'Terminal', icon: '▤' },
    { id: 'dashboard', label: 'Dashboard', icon: '⬡' },
    { id: 'screener', label: 'Stock Screener', icon: '◈' },
    { id: 'chartscanner', label: 'Chart Scanner', icon: '⬢' },
    { id: 'scorecard', label: 'Scorecards', icon: '▣' },
    { id: 'scorecard-library', label: 'Scorecard Library', icon: '▦' },
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
    'scorecard-library',
    'screener',
    'chartscanner',
    'alerts',
    'settings',
    'news',
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
          v0.2.1 · ⌘K command
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <AccountStrip
              connection={connection}
              accountSummary={accountSummary}
              onRefresh={refreshTradingData}
              refreshing={tradingRefreshing}
            />
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
          isElectron={isElectron}
        />

        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {activePage === 'terminal' && (
            <TerminalWorkspace
              symbol={activeSymbol}
              exchange={activeContract.exchange}
              currency={activeContract.currency}
              primaryExch={activeContract.primaryExch}
              listingExchange={activeContract.listingExchange}
              resolvedName={activeContract.name}
              quote={activeSymbol ? quoteForSymbol(quotes, activeSymbol) : null}
              connection={connection}
              settings={settings}
              orderPreset={orderPreset}
              openOrders={openOrders}
              onRefreshOrders={refreshTradingData}
              ordersRefreshing={tradingRefreshing}
              cancelBusyId={cancelBusyId}
              onCancelOrder={async (orderId) => {
                setCancelBusyId(orderId);
                try {
                  await cancelOrder(orderId);
                } finally {
                  setCancelBusyId(null);
                }
              }}
              onOrderPlaced={() => {
                setOrderPreset(null);
                refreshTradingData();
              }}
              onOpenScorecard={(sym, sector) => {
                setScorecardFocus({ ticker: sym, sector: sector || 'core' });
                setActivePage('scorecard');
              }}
              onOpenJournal={() => setActivePage('journal')}
              onOpenWatchlist={() => setActivePage('watchlist')}
              onSymbolChange={openTerminalForTicker}
              researchVersion={terminalResearchVersion}
              fetchHistoricalBars={fetchHistoricalBars}
              fetchFundamentals={fetchFundamentals}
              hasFmpKey={hasFmpKey}
              fetchNews={fetchNews}
              isElectron={isElectron}
              onOpenNews={() => setActivePage('news')}
              agentChat={agentChat}
              agentEnabled={agentConfig?.enabled !== false}
              agentProfileLabel={activeProfile?.label}
              agentProfileTier={activeProfile?.tier}
            />
          )}
          {activePage === 'dashboard' && (
            <Dashboard
              onNavigate={setActivePage}
              portfolioStats={getPortfolioStats(quotes)}
              connection={connection}
              accountSummary={accountSummary}
            />
          )}
          {activePage === 'journal' && <Journal onOpenTerminal={openTerminalForTicker} />}
          {activePage === 'watchlist' && (
            <Watchlist
              quotes={quotes}
              onSelectSymbol={(sym) => openTerminalForTicker(sym)}
            />
          )}
          {activePage === 'portfolio' && (
            <Portfolio
              connection={connection}
              quotes={quotes}
              onOpenTerminal={openTerminalForTicker}
            />
          )}
          {activePage === 'scorecard' && (
            <Scorecards
              focusTicker={scorecardFocus.ticker}
              focusSector={scorecardFocus.sector}
              onOpenLibrary={() => setActivePage('scorecard-library')}
              connection={connection}
              isElectron={isElectron}
              fetchFundamentals={fetchFundamentals}
              hasFmpKey={hasFmpKey}
              quotes={quotes}
              onLiveTickerChange={setScorecardLiveTicker}
            />
          )}
          {activePage === 'news' && (
            <News onOpenTerminal={openTerminalForTicker} />
          )}
          {activePage === 'scorecard-library' && (
            <ScorecardLibrary
              onOpenAnalyzer={() => {
                setScorecardFocus({ ticker: '', sector: '' });
                setActivePage('scorecard');
              }}
              onOpenScorecard={(sym, sector) => {
                setScorecardFocus({ ticker: sym, sector: sector || 'core' });
                setActivePage('scorecard');
              }}
              onOpenTerminal={(sym) => openTerminalForTicker(sym)}
            />
          )}
          {activePage === 'screener' && (
            <Screener
              refreshKey={screenerRefreshKey}
              quotes={quotes}
              connection={connection}
              onUniverseTickersChange={setScreenerExtraTickers}
              onOpenTerminal={(sym) => openTerminalForTicker(sym)}
              onOpenScorecard={(sym, sector) => {
                setScorecardFocus({ ticker: sym, sector: sector || 'core' });
                setActivePage('scorecard');
              }}
              hasFmpKey={hasFmpKey}
              fetchScreenerSnapshots={fetchScreenerSnapshots}
              isElectron={isElectron}
            />
          )}
          {activePage === 'chartscanner' && (
            <ChartScanner
              quotes={quotes}
              connection={connection}
              fetchHistoricalBars={fetchHistoricalBars}
              isElectron={isElectron}
              onOpenTerminal={(sym) => openTerminalForTicker(sym)}
              onUniverseEntriesChange={setScannerExtraEntries}
            />
          )}
          {activePage === 'alerts' && (
            <Alerts
              quotes={quotes}
              connection={connection}
              onOpenTerminal={(sym) => openTerminalForTicker(sym)}
              onOpenScreener={() => setActivePage('screener')}
            />
          )}
          {activePage === 'settings' && (
            <Settings
              settings={settings}
              connection={connection}
              onSave={saveSettings}
              onConnect={connect}
              onDisconnect={disconnect}
              onTestFmp={testFmp}
              agentConfig={agentConfig}
              onSaveAgent={saveAgentConfig}
              onAgentSetActiveProfile={setActiveProfile}
              onAgentUpdateProfile={updateProfile}
              onAgentAddProfile={addProfile}
              onTestAgent={testAgent}
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

function Dashboard({ onNavigate, portfolioStats, connection, accountSummary = [] }) {
  const journalCount = getJournalCount();
  const watchCount = getWatchlistSymbols().length;
  const plSign = portfolioStats.plPct >= 0;
  const ibConnected = connection?.status === 'connected';
  const nlvRow = accountSummary.find((r) => r.tag === 'NetLiquidation' || r.tag === 'NetLiquidationByCurrency');
  const nlv = nlvRow ? parseFloat(nlvRow.value) : null;

  const stats = [
    {
      label: 'Portfolio Value',
      value: formatGbp(portfolioStats.totalValue),
      change: `${plSign ? '+' : ''}${portfolioStats.plPct.toFixed(2)}% vs cost${ibConnected ? ' · live marks' : ''}`,
      positive: plSign,
    },
    ...(ibConnected && nlv != null && Number.isFinite(nlv)
      ? [
          {
            label: 'IB Net Liquidation',
            value: new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: nlvRow.currency || 'USD',
              maximumFractionDigits: 0,
            }).format(nlv),
            change: 'From account summary',
            positive: true,
          },
        ]
      : []),
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
