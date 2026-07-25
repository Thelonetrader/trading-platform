const { getCached, setCached } = require('./cache');
const { mapFmpToMetrics } = require('./mapFmpMetrics');
const { scoreSentiment } = require('./sentiment');

/** FMP stable API (legacy /api/v3 paths deprecated for new keys). */
const BASE = 'https://financialmodelingprep.com/stable';

class FmpClient {
  constructor(getConfig) {
    this.getConfig = getConfig;
  }

  _ttlMs() {
    const cfg = this.getConfig() || {};
    const mins = Number(cfg.cacheTtlMinutes) || 60;
    return Math.max(5, mins) * 60_000;
  }

  _key() {
    return (this.getConfig()?.fmpApiKey || '').trim();
  }

  _extractError(data, text) {
    if (typeof data === 'string') return data;
    if (data?.['Error Message']) return data['Error Message'];
    if (data?.message) return data.message;
    if (text && text.includes('Legacy Endpoint')) return text.slice(0, 400);
    return null;
  }

  _asArray(data) {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && !this._extractError(data)) return [data];
    return [];
  }

  async _fetchJson(path, query = {}) {
    const apikey = this._key();
    if (!apikey) {
      throw new Error('Add your FMP API key in Settings → Market data');
    }
    const q = new URLSearchParams({ ...query, apikey });
    const url = `${BASE}${path}?${q}`;
    const cacheKey = url.replace(apikey, '***');
    const cached = getCached(cacheKey, this._ttlMs());
    if (cached != null) return cached;

    const res = await fetch(url);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(text?.slice(0, 200) || 'Invalid response from FMP');
    }
    const errMsg = this._extractError(data, text);
    if (!res.ok) {
      throw new Error(errMsg || `FMP HTTP ${res.status}`);
    }
    if (errMsg) {
      throw new Error(errMsg);
    }
    setCached(cacheKey, data);
    return data;
  }

  normalizeSymbol(entry) {
    const raw = typeof entry === 'string' ? entry : entry?.ticker || entry?.symbol || '';
    return String(raw).trim().toUpperCase();
  }

  async testConnection() {
    const rows = this._asArray(await this._fetchJson('/profile', { symbol: 'AAPL' }));
    return { ok: true, sample: rows[0]?.companyName || 'AAPL' };
  }

  async getFundamentals(entry) {
    const symbol = this.normalizeSymbol(entry);
    if (!symbol) return { symbol: '', metrics: {}, fieldCount: 0, sources: [], error: 'Missing ticker' };

    try {
      const [ratiosRows, keyRows, growthRows, profileRows] = await Promise.all([
        this._fetchJson('/ratios-ttm', { symbol }),
        this._fetchJson('/key-metrics-ttm', { symbol }),
        this._fetchJson('/financial-growth', { symbol }),
        this._fetchJson('/profile', { symbol }),
      ]);

      const ratios = this._asArray(ratiosRows)[0];
      const keyMetrics = this._asArray(keyRows)[0];
      const growth = this._asArray(growthRows)[0];
      const profile = this._asArray(profileRows)[0];

      const metrics = mapFmpToMetrics({
        ratios,
        keyMetrics,
        growth,
        profile,
      });

      const fieldCount = Object.keys(metrics).length;
      return {
        symbol,
        metrics,
        fieldCount,
        sources: ['fmp'],
        profile: profile
          ? {
              companyName: profile.companyName,
              sector: profile.sector,
              industry: profile.industry,
              mktCap: profile.mktCap,
              price: profile.price,
              beta: profile.beta,
              exchange: profile.exchangeShortName || profile.exchange || null,
            }
          : null,
        error: fieldCount ? null : 'No ratio fields returned for this symbol',
      };
    } catch (e) {
      return {
        symbol,
        metrics: {},
        fieldCount: 0,
        sources: [],
        error: e.message || 'FMP fundamentals failed',
      };
    }
  }

  async getNews({ tickers = [], limit = 40 } = {}) {
    const list = [...new Set(tickers.map((t) => String(t).trim().toUpperCase()).filter(Boolean))];
    if (!list.length) {
      return { items: [], error: 'No tickers specified' };
    }

    try {
      const chunk = list.slice(0, 10).join(',');
      const rows = this._asArray(
        await this._fetchJson('/news/stock', {
          symbols: chunk,
          limit: String(Math.min(limit, 100)),
        }),
      );
      const items = rows.map((row) => {
        const text = `${row.title || ''} ${row.text || ''}`;
        const sent = scoreSentiment(text);
        return {
          id: `${row.publishedDate || row.date || ''}-${row.title || ''}`,
          ticker: (row.symbol || row.tickers || '').toUpperCase().split(',')[0],
          title: row.title,
          text: row.text,
          url: row.url,
          site: row.site || row.publisher,
          publishedAt: row.publishedDate || row.date,
          sentiment: sent.label,
          sentimentScore: sent.score,
        };
      });
      return { items, error: null };
    } catch (e) {
      return { items: [], error: e.message || 'FMP news failed' };
    }
  }

  async getEarningsCalendar({ from, to } = {}) {
    const now = new Date();
    const fromD = from || now.toISOString().slice(0, 10);
    const toDate = new Date(now);
    toDate.setDate(toDate.getDate() + 45);
    const toD = to || toDate.toISOString().slice(0, 10);

    try {
      const rows = this._asArray(await this._fetchJson('/earnings-calendar', { from: fromD, to: toD }));
      const items = rows.map((row) => ({
        symbol: (row.symbol || '').toUpperCase(),
        date: row.date,
        epsEstimate: row.epsEstimated ?? row.epsEstimate,
        revenueEstimate: row.revenueEstimated ?? row.revenueEstimate,
        time: row.time,
      }));
      return { items, from: fromD, to: toD, error: null };
    } catch (e) {
      return { items: [], error: e.message || 'FMP earnings calendar failed' };
    }
  }
}

module.exports = { FmpClient };
