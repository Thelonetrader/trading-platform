import React, { useEffect, useRef, useState } from 'react';
import TerminalChart from './TerminalChart';
import OrderTicket from './OrderTicket';
import OpenOrdersPanel from './OpenOrdersPanel';
import { RESEARCH_DATA_IMPORTED_EVENT } from '../utils/dataBackup';
import { getSymbolResearchContext } from '../utils/symbolResearch';
import { SECTORS, getRatingColor } from '../scorecards/model';
import { displayChangePct, displayPrice } from '../utils/quoteDisplay';

function TerminalSymbolField({ symbol, onSymbolChange }) {
  const inputRef = useRef(null);
  const [editing, setEditing] = useState(() => !symbol);
  const [draft, setDraft] = useState(symbol || '');

  useEffect(() => {
    setDraft(symbol || '');
    if (!symbol) setEditing(true);
  }, [symbol]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    const upper = draft.trim().toUpperCase();
    if (upper && onSymbolChange) onSymbolChange(upper);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(symbol || '');
    setEditing(false);
  };

  if (editing || !symbol) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') cancel();
          }}
          onBlur={() => {
            if (draft.trim()) commit();
            else cancel();
          }}
          placeholder="Enter ticker (e.g. AAPL)"
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: '#f8fafc',
            background: '#060b16',
            border: '1px solid #6366f1',
            borderRadius: 8,
            padding: '8px 12px',
            width: '100%',
            maxWidth: 280,
            outline: 'none',
            letterSpacing: '0.02em',
          }}
          aria-label="Ticker symbol"
        />
        <span style={{ fontSize: 11, color: '#64748b' }}>Enter to load · Esc to cancel · ⌘K also works</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Click to change symbol"
      style={{
        marginTop: 8,
        padding: 0,
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        borderRadius: 6,
      }}
    >
      <span
        style={{
          fontSize: 32,
          fontWeight: 800,
          color: '#f8fafc',
          borderBottom: '2px dashed #334155',
        }}
      >
        {symbol}
      </span>
      <span style={{ display: 'block', fontSize: 11, color: '#6366f1', marginTop: 4, fontWeight: 600 }}>
        Click to change symbol
      </span>
    </button>
  );
}

function ResearchCard({ title, children, action }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 200,
        background: '#060b16',
        border: '1px solid #1a2035',
        borderRadius: 10,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {title}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

const btnGhost = {
  padding: '4px 10px',
  borderRadius: 6,
  border: '1px solid #1a2035',
  background: 'transparent',
  color: '#818cf8',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
};

export default function TerminalWorkspace({
  symbol,
  exchange,
  currency,
  quote,
  connection,
  settings,
  orderPreset,
  openOrders,
  onRefreshOrders,
  onCancelOrder,
  ordersRefreshing,
  cancelBusyId,
  onOrderPlaced,
  onOpenScorecard,
  onOpenJournal,
  onOpenWatchlist,
  onSymbolChange,
  researchVersion = 0,
  fetchHistoricalBars,
}) {
  const [research, setResearch] = useState(null);

  useEffect(() => {
    setResearch(symbol ? getSymbolResearchContext(symbol) : null);
  }, [symbol, researchVersion]);

  useEffect(() => {
    const onImport = () => {
      setResearch(symbol ? getSymbolResearchContext(symbol) : null);
    };
    window.addEventListener(RESEARCH_DATA_IMPORTED_EVENT, onImport);
    return () => window.removeEventListener(RESEARCH_DATA_IMPORTED_EVENT, onImport);
  }, [symbol]);

  const watch = research?.watch;
  const journal = research?.journal;
  const scorecard = research?.scorecard;
  const sectorMeta = scorecard?.sectorId ? SECTORS[scorecard.sectorId] : null;
  const ratingColor =
    scorecard && sectorMeta ? getRatingColor(scorecard.avg, sectorMeta.accent) : '#64748b';

  const px = displayPrice(quote);
  const chg = displayChangePct(quote);

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, minHeight: 420, alignItems: 'stretch' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          <div
            style={{
              background: '#0a0f1e',
              border: '1px solid #1a2035',
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Active symbol
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <TerminalSymbolField symbol={symbol} onSymbolChange={onSymbolChange} />
              {symbol && watch?.name && (
                <span style={{ fontSize: 16, color: '#94a3b8', alignSelf: 'center' }}>{watch.name}</span>
              )}
              {symbol && px != null && (
                <span style={{ fontSize: 20, color: '#e2e8f0', alignSelf: 'center' }}>{px.toFixed(2)}</span>
              )}
              {symbol && chg != null && (
                <span style={{ color: chg >= 0 ? '#22c55e' : '#ef4444', alignSelf: 'center' }}>
                  {chg >= 0 ? '+' : ''}
                  {chg.toFixed(2)}%
                </span>
              )}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span>{exchange || 'SMART'} · {currency || 'USD'}</span>
              {watch?.priority && (
                <span style={{ color: watch.priority === 'High' ? '#ef4444' : watch.priority === 'Medium' ? '#f59e0b' : '#22c55e' }}>
                  {watch.priority} priority
                </span>
              )}
              {watch?.sector && <span>{watch.sector}</span>}
            </div>
          </div>

          {!symbol ? (
            <div
              style={{
                flex: 1,
                minHeight: 280,
                background: '#0a0f1e',
                border: '1px dashed #1a2035',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569',
                fontSize: 14,
                padding: 24,
                textAlign: 'center',
                lineHeight: 1.6,
              }}
            >
              Pick a symbol above, from Watchlist or Screener, or press ⌘K.
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 280 }}>
              <TerminalChart
                symbol={symbol}
                exchange={exchange}
                currency={currency}
                connection={connection}
                fetchHistoricalBars={fetchHistoricalBars}
              />
              <div
                style={{
                  flex: 1,
                  background: '#0a0f1e',
                  border: '1px solid #1a2035',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
              <div style={{ fontSize: 11, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Research workspace
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: 1 }}>
                <ResearchCard
                  title="Watchlist"
                  action={
                    onOpenWatchlist && (
                      <button type="button" style={btnGhost} onClick={onOpenWatchlist}>
                        Edit list
                      </button>
                    )
                  }
                >
                  {watch ? (
                    <>
                      {watch.notes ? (
                        <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>{watch.notes}</p>
                      ) : (
                        <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>No notes on watchlist.</p>
                      )}
                      {watch.buyPrice && (
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          Target / ref: {watch.buyPrice}
                        </div>
                      )}
                    </>
                  ) : (
                    <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
                      Not on watchlist — add in Watchlist to keep thesis and priority here.
                    </p>
                  )}
                </ResearchCard>

                <ResearchCard
                  title="Scorecard"
                  action={
                    onOpenScorecard && (
                      <button
                        type="button"
                        style={btnGhost}
                        onClick={() => onOpenScorecard(symbol, scorecard?.sectorId || 'core')}
                      >
                        {scorecard ? 'Update' : 'Score'}
                      </button>
                    )
                  }
                >
                  {scorecard ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                        <span style={{ fontSize: 22, fontWeight: 800, color: ratingColor }}>{scorecard.ratingShort}</span>
                        <span style={{ fontSize: 14, color: '#94a3b8' }}>{scorecard.ratingLabel}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {sectorMeta?.label || scorecard.sectorId} · {scorecard.avg.toFixed(2)} / 5
                      </div>
                    </>
                  ) : (
                    <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
                      No saved scorecard — run sector metrics and Save to library.
                    </p>
                  )}
                </ResearchCard>

                <ResearchCard
                  title="Journal"
                  action={
                    onOpenJournal && (
                      <button type="button" style={btnGhost} onClick={onOpenJournal}>
                        Open journal
                      </button>
                    )
                  }
                >
                  {journal ? (
                    <>
                      <div style={{ fontSize: 12, color: '#818cf8' }}>
                        {journal.count} entr{journal.count === 1 ? 'y' : 'ies'}
                        {journal.latestDate ? ` · latest ${journal.latestDate}` : ''}
                      </div>
                      {journal.snippet ? (
                        <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>{journal.snippet}</p>
                      ) : (
                        <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>No reasoning text on latest entry.</p>
                      )}
                    </>
                  ) : (
                    <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
                      No journal entries for this ticker yet.
                    </p>
                  )}
                </ResearchCard>
              </div>
              <div style={{ fontSize: 11, color: '#334155', borderTop: '1px solid #1a2035', paddingTop: 10 }}>
                Daily / weekly bars from IB · orders execute via ticket or TWS
              </div>
            </div>
            </div>
          )}
        </div>

        <OrderTicket
          symbol={symbol}
          exchange={exchange}
          currency={currency}
          connection={connection}
          settings={settings}
          preset={orderPreset}
          onPlaced={onOrderPlaced}
        />
      </div>
      <OpenOrdersPanel
        connection={connection}
        openOrders={openOrders}
        onRefresh={onRefreshOrders}
        onCancel={onCancelOrder}
        refreshing={ordersRefreshing}
        busyOrderId={cancelBusyId}
      />
    </div>
  );
}
