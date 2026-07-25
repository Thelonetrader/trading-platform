# Product roadmap

Legend: **Done** · **Partial** · **Not started**

Last updated: 2026-07-25 (app v0.2.x)

## Coverage vs your target list

| Feature | Status | What exists today | What's missing |
|--------|--------|-------------------|----------------|
| Historical data | **Not started** | Terminal chart placeholder; IB `reqHistoricalData` not wired | Chart UI, bar storage, symbol/contract aware fetch |
| Earnings reports | **Not started** | — | Calendar, report links/PDFs, period metadata |
| EPS | **Not started** | — | Actual/estimate, growth, trend |
| P/E and key ratios | **Partial** | Manual scorecard sliders (P/S, P/B, margins, etc.) | Live market P/E, peer compare, auto-fill from API |
| Insider buying/selling | **Partial** | Scorecard **Insider Ownership %** (manual) | Transaction feed, net buying, Form 4 style timeline |
| Institutional ownership | **Not started** | — | 13F-style % held, changes |
| Economic indicators | **Not started** | — | Macro dashboard (rates, CPI, PMI, etc.) |
| Technical indicators | **Not started** | — | RSI, MA, MACD, etc. on price series |
| AI earnings summaries | **Not started** | — | LLM pipeline over earnings text + citations |
| News sentiment analysis | **Not started** | Nav stub **News & Sentiment** | Feed ingest, symbol tagging, sentiment scores |
| Backtesting strategies | **Partial** | Journal trade type **Backtest** (label only) | Rules engine, historical sim, equity curve |
| Stock ranking (your criteria) | **Partial** | **Scorecards** + **Screener** + **custom rank** + presets | Saved rank models beyond weights |
| Portfolio tracking | **Partial** | Manual portfolio P/L; IB positions tab; **All holdings** unified view | Full cost-basis sync, attribution |
| Watchlists | **Done** | Notes, priority, sector, exchange/currency, **tags**, quotes when IB connected | — |
| Alerts (your rules) | **Partial** | **Alerts** rules + rank weights; **desktop/sound notify** while app open | Price-triggered rules, push when app closed |
| Journal | **Done** | CRUD, P/L stats, export via Settings backup, **open Terminal from row** | — |
| Detailed volume scanner | **Not started** | — | Unusual volume, RVOL, scan universe |

### Also shipped (supporting your workflow)

- IB connect (TWS/Gateway), order ticket, open orders, account strip  
- Terminal **research workspace** (watchlist + scorecard + journal per symbol)  
- **Scorecard library**, data **export/import**  
- macOS **DMG** build (`npm run dist`)  
- ⌘K command bar  

---

## Why many items are “not started”

Most rows need **market/fundamental/news data** beyond what IB gives for free on your account. The app is currently **local-first** (localStorage + optional IB). Next step is a **data layer** (API keys in Settings, cached responses, rate limits).

Suggested providers (pick one stack; not implemented yet):

- **Fundamentals / ratios / EPS / ownership:** Financial Modeling Prep, Polygon, Finnhub, Alpha Vantage  
- **News / sentiment:** NewsAPI + LLM, or Benzinga/Polygon news with NLP  
- **Macro:** FRED (US), or broker macro feeds  
- **Historical + technicals:** IB historical (when subscribed), or Polygon/IEX  
- **Volume scan:** Intraday bars + RVOL (needs intraday API or IB scanner)  

---

## Recommended build phases

### Phase 1 — Alerts + ranking (no new paid API required) ✅

1. **Alerts** page: rules on watchlist + saved scorecard fields (e.g. rating ≥ Buy, priority High, journal exists).  
2. **Custom rank score**: weighted blend of scorecard avg, priority, journal recency (user weights in UI).  
3. **Screener**: sort/filter by custom rank.  
4. Watchlist **tags** for rule conditions.

Export/import includes `alertRules`, `rankWeights`, and `alertNotifyPrefs`.

### Local polish (no paid API) ✅

- **Alert notifications** while app is open (desktop + optional sound)  
- **Portfolio · All holdings** (manual + IB)  
- **Journal → Terminal** from ticker or row action  
- Journal table markup fix  

### Phase 2 — Market data foundation

1. Settings: API key(s), provider choice, cache TTL.  
2. **Historical daily bars** + simple line/candle chart on Terminal.  
3. **Key ratios** panel (P/E, EPS, market cap) from API for active symbol.  
4. **Earnings calendar** + links to reports (API).

### Phase 3 — Depth research

1. Insider + institutional ownership panels.  
2. **News feed** per symbol + basic sentiment (lexicon or LLM).  
3. **AI earnings summary** (optional OpenAI/Anthropic key, user-triggered).  
4. Economic indicators widget (FRED or static curated set).

### Phase 4 — Scanner + quant

1. **Volume / RVOL scanner** (universe = watchlist or index list).  
2. **Technical indicators** on historical series.  
3. **Backtester v1**: rules on daily bars, journal export of sim trades.

### Phase 5 — Portfolio polish

1. Merge manual + IB positions.  
2. Performance vs benchmark, sector weights.  
3. Alert when portfolio rule breached (concentration, drawdown).

---

## Nav stubs → delivery order

| Nav item | Target phase |
|----------|----------------|
| Alerts | Phase 1 ✅ (local notify polish) |
| News & Sentiment | Phase 3 |
| Stock Screener | Extend Phase 1–2 (API filters) |
| Chart (Terminal) | Phase 2 |

---

## How to use this doc

When starting a phase, implement in small PR-sized slices: data service → UI panel → persist rules → commit (per project rule).

Track progress by changing **Status** in the table above.
