/** Normalized headline for Terminal + future live streams (WebSocket, IB, etc.). */

export const NEWS_FEED_PROVIDERS = {
  fmp: 'fmp',
  live: 'live',
};

export function normalizeHeadline(raw, provider = NEWS_FEED_PROVIDERS.fmp) {
  if (!raw) return null;
  const id = raw.id || `${raw.publishedAt || ''}-${raw.title || ''}`;
  return {
    id,
    ticker: (raw.ticker || '').toUpperCase() || null,
    title: raw.title || 'Untitled',
    url: raw.url || null,
    publishedAt: raw.publishedAt || null,
    sentiment: raw.sentiment || 'Neutral',
    site: raw.site || raw.publisher || null,
    provider,
    live: provider === NEWS_FEED_PROVIDERS.live,
  };
}

export function sortHeadlinesNewestFirst(items) {
  return [...items].sort((a, b) => {
    const ta = Date.parse(a.publishedAt || '') || 0;
    const tb = Date.parse(b.publishedAt || '') || 0;
    return tb - ta;
  });
}

export function formatHeadlineTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 16);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
