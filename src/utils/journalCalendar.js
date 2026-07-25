/** Sum journal P&L by trade date (YYYY-MM-DD). */
export function aggregatePlByDate(trades) {
  const map = new Map();
  for (const t of trades || []) {
    const d = (t.date || '').slice(0, 10);
    if (!d) continue;
    const pl = parseFloat(t.pl);
    const add = Number.isFinite(pl) ? pl : 0;
    map.set(d, (map.get(d) || 0) + add);
  }
  return map;
}

export function countTradesByDate(trades) {
  const map = new Map();
  for (const t of trades || []) {
    const d = (t.date || '').slice(0, 10);
    if (!d) continue;
    map.set(d, (map.get(d) || 0) + 1);
  }
  return map;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Monday-first grid cells for a month (includes leading/trailing padding). */
export function buildMonthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  let startPad = first.getDay() - 1;
  if (startPad < 0) startPad = 6;

  const cells = [];
  for (let i = 0; i < startPad; i++) {
    cells.push({ date: null, day: null, inMonth: false });
  }
  for (let d = 1; d <= last.getDate(); d++) {
    const mm = String(monthIndex + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    cells.push({
      date: `${year}-${mm}-${dd}`,
      day: d,
      inMonth: true,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, day: null, inMonth: false });
  }
  return { cells, label: first.toLocaleString('en-GB', { month: 'long', year: 'numeric' }) };
}

export { WEEKDAYS };

export function dayTone(netPl, tradeCount) {
  if (!tradeCount) return 'empty';
  if (netPl > 0) return 'win';
  if (netPl < 0) return 'loss';
  return 'flat';
}
