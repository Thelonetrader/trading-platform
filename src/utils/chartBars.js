export const BAR_SIZE_OPTIONS = [
  { id: '5 mins', label: '5m' },
  { id: '15 mins', label: '15m' },
  { id: '1 hour', label: '1h' },
  { id: '1 day', label: 'Daily' },
  { id: '1 week', label: 'Weekly' },
];

const DAILY_DURATIONS = [
  { id: '3 M', label: '3M' },
  { id: '6 M', label: '6M' },
  { id: '1 Y', label: '1Y' },
  { id: '2 Y', label: '2Y' },
];

export function isIntradayBarSize(barSize) {
  const s = String(barSize || '').toLowerCase();
  return /\b(min|mins|hour|hours|sec|secs)\b/.test(s);
}

export function durationsForBarSize(barSize) {
  if (barSize === '5 mins') {
    return [
      { id: '1 D', label: '1D' },
      { id: '5 D', label: '5D' },
      { id: '2 W', label: '2W' },
      { id: '1 M', label: '1M' },
    ];
  }
  if (barSize === '15 mins') {
    return [
      { id: '1 D', label: '1D' },
      { id: '5 D', label: '5D' },
      { id: '1 M', label: '1M' },
      { id: '3 M', label: '3M' },
    ];
  }
  if (barSize === '1 hour') {
    return [
      { id: '5 D', label: '5D' },
      { id: '1 M', label: '1M' },
      { id: '3 M', label: '3M' },
      { id: '6 M', label: '6M' },
      { id: '1 Y', label: '1Y' },
    ];
  }
  return DAILY_DURATIONS;
}

export function defaultDurationForBarSize(barSize) {
  if (barSize === '5 mins') return '5 D';
  if (barSize === '15 mins') return '1 M';
  if (barSize === '1 hour') return '3 M';
  return '1 Y';
}

export function coerceDurationForBarSize(barSize, duration) {
  const allowed = durationsForBarSize(barSize);
  if (allowed.some((d) => d.id === duration)) return duration;
  return defaultDurationForBarSize(barSize);
}

/** Parse IB historical bar time to epoch ms (US/Eastern when time component present). */
export function parseBarTimeMs(time) {
  const s = String(time || '').trim();
  if (/^\d{8}$/.test(s)) {
    const ms = Date.parse(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T16:00:00-05:00`);
    return Number.isNaN(ms) ? 0 : ms;
  }
  const m = s.match(/^(\d{4})(\d{2})(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (m) {
    const hh = m[4].padStart(2, '0');
    const ms = Date.parse(`${m[1]}-${m[2]}-${m[3]}T${hh}:${m[5]}:${m[6]}-05:00`);
    return Number.isNaN(ms) ? 0 : ms;
  }
  if (/^\d+$/.test(s) && s.length >= 10) {
    const n = Number(s);
    return n < 1e12 ? n * 1000 : n;
  }
  return 0;
}

export function formatBarAxisLabel(time, barSize) {
  const ms = parseBarTimeMs(time);
  if (!ms) return String(time || '');
  const d = new Date(ms);
  if (isIntradayBarSize(barSize)) {
    return d.toLocaleString('en-GB', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (barSize === '1 week') {
    return d.toLocaleString('en-GB', {
      timeZone: 'America/New_York',
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    });
  }
  return d.toLocaleString('en-GB', {
    timeZone: 'America/New_York',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatBarTooltipTime(time, barSize) {
  const ms = parseBarTimeMs(time);
  if (!ms) return String(time || '');
  const d = new Date(ms);
  const opts = {
    timeZone: 'America/New_York',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  if (isIntradayBarSize(barSize)) {
    opts.hour = '2-digit';
    opts.minute = '2-digit';
  }
  return d.toLocaleString('en-GB', opts);
}

export function defaultVisibleBarCount(barSize, totalBars) {
  const total = Math.max(0, totalBars);
  if (!total) return 0;
  const minVisible = isIntradayBarSize(barSize) ? 64 : 48;
  const fraction = isIntradayBarSize(barSize) ? 0.35 : 0.4;
  return Math.min(total, Math.max(minVisible, Math.floor(total * fraction)));
}
