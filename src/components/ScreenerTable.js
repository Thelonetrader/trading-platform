import React from 'react';
import { SECTORS, getRatingColor } from '../scorecards/model';
import { displayChangePct } from '../utils/quoteDisplay';
import {
  fmtMetric,
  fmtMktCap,
  mergedMetrics,
  rowLastPrice,
  rowMarketCapUsd,
  rowSnapshot,
} from '../utils/screenerFilters';
import { listingCurrency } from '../utils/fxUsd';

const COL = {
  sym: 108,
  name: 140,
  last: 72,
  chg: 64,
  bid: 64,
  ask: 64,
  mcap: 72,
  pe: 52,
  epsG: 56,
  fcf: 52,
  score: 72,
  rank: 44,
  pri: 56,
  actions: 148,
};

function Th({ children, align = 'left', w }) {
  return (
    <th
      style={{
        textAlign: align,
        padding: '8px 10px',
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--tp-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        borderBottom: '1px solid var(--tp-border)',
        width: w,
        minWidth: w,
        position: 'sticky',
        top: 0,
        background: 'var(--tp-bg-input)',
        zIndex: 0,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, align = 'left', mono, color }) {
  return (
    <td
      style={{
        padding: '10px 10px',
        fontSize: 12,
        color: color || 'var(--tp-text-secondary)',
        textAlign: align,
        fontVariantNumeric: mono ? 'tabular-nums' : undefined,
        fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : undefined,
        borderBottom: '1px solid var(--tp-border-subtle, var(--tp-border))',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </td>
  );
}

export default function ScreenerTable({ rows, quotes, snapshots, connection, onOpenTerminal, onOpenScorecard }) {
  return (
    <div
      style={{
        background: 'var(--tp-bg-panel)',
        border: '1px solid var(--tp-border)',
        borderRadius: 12,
        overflow: 'auto',
        maxHeight: 'calc(100vh - 320px)',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
        <thead>
          <tr>
            <Th w={COL.sym}>Symbol</Th>
            <Th w={COL.name}>Name</Th>
            <Th align="right" w={COL.last}>
              Last
            </Th>
            <Th align="right" w={COL.chg}>
              Chg %
            </Th>
            <Th align="right" w={COL.bid}>
              Bid
            </Th>
            <Th align="right" w={COL.ask}>
              Ask
            </Th>
            <Th align="right" w={COL.mcap}>
              Mkt cap (USD)
            </Th>
            <Th align="right" w={COL.pe}>
              P/E
            </Th>
            <Th align="right" w={COL.epsG}>
              EPS gr
            </Th>
            <Th align="right" w={COL.fcf}>
              FCF yld
            </Th>
            <Th w={COL.score}>
              Score
            </Th>
            <Th align="right" w={COL.rank}>
              Rank
            </Th>
            <Th w={COL.pri}>
              Pri
            </Th>
            <Th w={COL.actions} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const quote = quotes[row.ticker];
            const snap = rowSnapshot(snapshots, row.ticker);
            const metrics = mergedMetrics(row, snap);
            const px = rowLastPrice(quote, snap);
            const ch = displayChangePct(quote);
            const mcap = rowMarketCapUsd(row, snap, quote);
            const ccy = listingCurrency(snap, row);
            const sectorMeta = row.eval?.sectorId ? SECTORS[row.eval.sectorId] : null;
            const accent = sectorMeta?.accent || '#6366f1';
            const avg = row.eval?.avg;
            const ratingColor = avg != null ? getRatingColor(avg, accent) : 'var(--tp-text-dim)';
            const priColor = row.priority === 'High' ? '#ef4444' : row.priority === 'Medium' ? '#f59e0b' : '#22c55e';
            const live = connection?.status === 'connected' && quote?.updatedAt;
            const name = row.name || snap?.profile?.companyName || row.sectorLabel || '—';

            return (
              <tr
                key={row.id}
                style={{ background: 'var(--tp-bg-panel)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--tp-bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--tp-bg-panel)';
                }}
              >
                <Td mono color="var(--tp-text-strong)">
                  <span style={{ fontWeight: 700 }}>{row.ticker}</span>
                  {!row.onWatchlist && (
                    <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--tp-text-faint)' }}>ext</span>
                  )}
                  {live && (
                    <span style={{ marginLeft: 4, fontSize: 8, color: '#22c55e' }} title="IB tick">
                      ●
                    </span>
                  )}
                </Td>
                <Td>
                  <span
                    style={{
                      display: 'block',
                      maxWidth: COL.name,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={name}
                  >
                    {name}
                  </span>
                </Td>
                <Td align="right" mono>
                  {px != null ? px.toFixed(2) : '—'}
                </Td>
                <Td align="right" mono color={ch == null ? 'var(--tp-text-dim)' : ch >= 0 ? '#22c55e' : '#ef4444'}>
                  {ch != null ? `${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%` : '—'}
                </Td>
                <Td align="right" mono color="var(--tp-text-muted)">
                  {quote?.bid > 0 ? quote.bid.toFixed(2) : '—'}
                </Td>
                <Td align="right" mono color="var(--tp-text-muted)">
                  {quote?.ask > 0 ? quote.ask.toFixed(2) : '—'}
                </Td>
                <Td align="right" mono title={ccy !== 'USD' ? `Listing: ${ccy}` : undefined}>
                  {fmtMktCap(mcap)}
                  {ccy !== 'USD' && mcap != null && (
                    <span style={{ marginLeft: 4, fontSize: 9, color: 'var(--tp-text-faint)' }}>{ccy}</span>
                  )}
                </Td>
                <Td align="right" mono>
                  {fmtMetric(metrics.forwardPE, 1)}
                </Td>
                <Td align="right" mono color={metrics.epsGrowth >= 0 ? 'var(--tp-text-muted)' : '#f97316'}>
                  {metrics.epsGrowth != null ? `${fmtMetric(metrics.epsGrowth, 1)}%` : '—'}
                </Td>
                <Td align="right" mono>
                  {metrics.fcfYield != null ? `${fmtMetric(metrics.fcfYield, 1)}%` : '—'}
                </Td>
                <Td>
                  {row.eval ? (
                    <>
                      <span style={{ fontWeight: 700, color: ratingColor }}>{row.eval.ratingShort}</span>
                      <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--tp-text-faint)' }}>{row.eval.avg.toFixed(2)}</span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--tp-text-dim)' }}>—</span>
                  )}
                </Td>
                <Td align="right" mono color="var(--tp-accent)">
                  {row.customRank}
                </Td>
                <Td color={priColor}>{row.priority.slice(0, 1)}</Td>
                <Td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" onClick={() => onOpenTerminal?.(row.ticker)} style={btnPrimary}>
                      Term
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenScorecard?.(row.ticker, row.eval?.sectorId || row.sectorId || 'core')}
                      style={btnGhost}
                    >
                      Score
                    </button>
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const btnPrimary = {
  padding: '4px 10px',
  borderRadius: 6,
  border: 'none',
  background: 'var(--tp-accent)',
  color: '#fff',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
};

const btnGhost = {
  padding: '4px 10px',
  borderRadius: 6,
  border: '1px solid var(--tp-border)',
  background: 'transparent',
  color: 'var(--tp-text-secondary)',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
};
