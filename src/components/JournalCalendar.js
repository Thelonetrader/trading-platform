import React, { useMemo, useState } from 'react';
import {
  WEEKDAYS,
  aggregatePlByDate,
  buildMonthGrid,
  countTradesByDate,
  dayTone,
} from '../utils/journalCalendar';

const toneStyles = {
  win: {
    background: '#14532d',
    border: '1px solid #22c55e',
    color: '#bbf7d0',
  },
  loss: {
    background: '#450a0a',
    border: '1px solid #ef4444',
    color: '#fecaca',
  },
  flat: {
    background: '#422006',
    border: '1px solid #f59e0b',
    color: '#fde68a',
  },
  empty: {
    background: '#060b16',
    border: '1px solid #1a2035',
    color: '#64748b',
  },
};

export default function JournalCalendar({ trades, selectedDate, onSelectDate }) {
  const today = new Date();
  const [cursor, setCursor] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));

  const plByDate = useMemo(() => aggregatePlByDate(trades), [trades]);
  const countByDate = useMemo(() => countTradesByDate(trades), [trades]);

  const { cells, label } = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  );

  const monthNet = useMemo(() => {
    let sum = 0;
    const prefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`;
    for (const [d, pl] of plByDate.entries()) {
      if (d.startsWith(prefix)) sum += pl;
    }
    return sum;
  }, [plByDate, cursor.year, cursor.month]);

  const prevMonth = () => {
    setCursor((c) => {
      if (c.month === 0) return { year: c.year - 1, month: 11 };
      return { year: c.year, month: c.month - 1 };
    });
  };

  const nextMonth = () => {
    setCursor((c) => {
      if (c.month === 11) return { year: c.year + 1, month: 0 };
      return { year: c.year, month: c.month + 1 };
    });
  };

  const goToday = () => {
    const n = new Date();
    setCursor({ year: n.getFullYear(), month: n.getMonth() });
  };

  const navBtn = {
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid #1a2035',
    background: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
  };

  return (
    <div
      style={{
        background: '#0a0f1e',
        border: '1px solid #1a2035',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 4,
            }}
          >
            P&amp;L calendar
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>{label}</div>
          <div style={{ fontSize: 12, color: monthNet >= 0 ? '#22c55e' : '#ef4444', marginTop: 4 }}>
            Month total: £{monthNet.toFixed(2)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" onClick={prevMonth} style={navBtn} aria-label="Previous month">
            ←
          </button>
          <button type="button" onClick={goToday} style={navBtn}>
            Today
          </button>
          <button type="button" onClick={nextMonth} style={navBtn} aria-label="Next month">
            →
          </button>
          {selectedDate && (
            <button
              type="button"
              onClick={() => onSelectDate?.(null)}
              style={{ ...navBtn, color: '#818cf8', borderColor: '#6366f1' }}
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 6,
          marginBottom: 8,
        }}
      >
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            style={{
              fontSize: 10,
              color: '#475569',
              textTransform: 'uppercase',
              textAlign: 'center',
              fontWeight: 600,
            }}
          >
            {wd}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {cells.map((cell, idx) => {
          if (!cell.inMonth || !cell.date) {
            return <div key={`pad-${idx}`} style={{ minHeight: 52 }} />;
          }
          const net = plByDate.get(cell.date) || 0;
          const count = countByDate.get(cell.date) || 0;
          const tone = dayTone(net, count);
          const style = toneStyles[tone];
          const isSelected = selectedDate === cell.date;
          const isToday = cell.date === today.toISOString().slice(0, 10);

          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => onSelectDate?.(selectedDate === cell.date ? null : cell.date)}
              title={
                count
                  ? `${count} trade(s) · £${net.toFixed(2)}`
                  : 'No trades'
              }
              style={{
                minHeight: 52,
                borderRadius: 8,
                padding: '6px 4px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                ...style,
                outline: isSelected ? '2px solid #6366f1' : isToday ? '1px solid #818cf8' : 'none',
                boxShadow: isSelected ? '0 0 0 1px #6366f1' : 'none',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700 }}>{cell.day}</span>
              {count > 0 && (
                <>
                  <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.95 }}>
                    {net >= 0 ? '+' : ''}
                    {net.toFixed(0)}
                  </span>
                  <span style={{ fontSize: 9, opacity: 0.75 }}>{count} tr</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap', fontSize: 11, color: '#64748b' }}>
        <span>
          <span style={{ color: '#22c55e' }}>■</span> Green day (net profit)
        </span>
        <span>
          <span style={{ color: '#ef4444' }}>■</span> Red day (net loss)
        </span>
        <span>
          <span style={{ color: '#f59e0b' }}>■</span> Flat / breakeven
        </span>
        <span>Click a day to filter the table below</span>
      </div>
    </div>
  );
}
