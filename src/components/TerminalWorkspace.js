import React, { useEffect, useState } from 'react';
import OrderTicket from './OrderTicket';
import OpenOrdersPanel from './OpenOrdersPanel';
import { RESEARCH_DATA_IMPORTED_EVENT } from '../utils/dataBackup';
import { getSymbolResearchContext } from '../utils/symbolResearch';
import { SECTORS, getRatingColor } from '../scorecards/model';

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
  researchVersion = 0,
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
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: '#f8fafc' }}>{symbol || '—'}</span>
              {watch?.name && (
                <span style={{ fontSize: 16, color: '#94a3b8' }}>{watch.name}</span>
              )}
              {quote?.last != null && (
                <span style={{ fontSize: 20, color: '#e2e8f0' }}>{Number(quote.last).toFixed(2)}</span>
              )}
              {quote?.changePct != null && (
                <span style={{ color: quote.changePct >= 0 ? '#22c55e' : '#ef4444' }}>
                  {quote.changePct >= 0 ? '+' : ''}
                  {quote.changePct.toFixed(2)}%
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
              Pick a symbol from Watchlist or Screener, or press ⌘K and type a ticker.
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                minHeight: 280,
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
                        onClick={() => onOpenScorecard(symbol, scorecard?.sectorId || 'tech')}
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
                Charts and live quotes when IB data is configured — execute in TWS if you prefer.
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
