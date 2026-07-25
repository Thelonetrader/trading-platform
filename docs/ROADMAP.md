# Product roadmap

Legend: **Done** · **Partial** · **Not started**

Last updated: 2026-07-25 (app v0.2.x)

## Coverage vs your target list

| Feature | Status | What exists today | What's missing |
|--------|--------|-------------------|----------------|
| Historical data | **Partial** | Terminal **IB daily bars**, candle + volume strip, hover OHLCV | Intraday, local bar cache, multi-timeframe |
| Earnings reports | **Partial** | FMP **earnings calendar** on News; estimate fields | Report links/PDFs, per-symbol history |
| EPS | **Partial** | FMP growth → scorecard **EPS growth**; auto-fill | Actual vs estimate trend panel |
| P/E and key ratios | **Partial** | FMP + IB → scorecard auto-fill; **Terminal key metrics** strip | Peer compare, screener filters on live ratios |
| Insider buying/selling | **Partial** | Scorecard **Insider Ownership %** (manual) | Transaction feed, Form 4 timeline |
| Institutional ownership | **Not started** | — | 13F-style % held, changes |
| Economic indicators | **Not started** | — | Macro dashboard (rates, CPI, PMI, etc.) |
| Technical indicators | **Not started** | — | RSI, MA, MACD on price series |
| AI earnings summaries | **Not started** | — | LLM pipeline over earnings text + citations |
| News sentiment analysis | **Partial** | **News & Sentiment** page (FMP feed + lexicon scores) | LLM summaries, richer NLP |
| Backtesting strategies | **Partial** | Journal trade type **Backtest** (label only) | Rules engine, historical sim, equity curve |
| Stock ranking (your criteria) | **Partial** | **Scorecards** + **Screener** + **custom rank** + presets + universes | Saved rank models beyond weights |
| Portfolio tracking | **Partial** | Manual portfolio P/L; IB positions tab; **All holdings** unified view | Full cost-basis sync, attribution |
| Watchlists | **Done** | Notes, priority, sector, exchange/currency, **tags**, quotes when IB connected | — |
| Alerts (your rules) | **Partial** | Rules + rank weights; **price / day % / buy-price** while app open; desktop/sound notify | Push when app closed |
| Journal | **Done** | CRUD, P/L stats, export via Settings backup, **open Terminal from row** | — |
| Detailed volume scanner | **Not started** | — | Unusual volume, RVOL, scan universe |

### Also shipped (supporting your workflow)

- IB connect (TWS/Gateway), order ticket, open orders, account strip  
- Terminal **research workspace** (watchlist + scorecard + journal per symbol)  
- **Scorecard library**, data **export/import**  
- **FMP stable API** — fundamentals, news, earnings (Settings key + cache TTL)  
- Central **live quote subscriptions** (watchlist, portfolio, terminal, scorecard, screener)  
- macOS **DMG** build (`npm run dist`)  
- ⌘K command bar  

---

## Data layer (current)

- **IB:** live quotes, orders, positions, historical daily bars, optional Reuters fundamentals for scorecards  
- **FMP (optional key):** ratios TTM, growth, profile, stock news, earnings calendar — cached in main process  
- **Local:** localStorage for research; electron-store for IB + market data settings  

---

## Recommended build phases

### Phase 1 — Alerts + ranking (no new paid API required) ✅

1. **Alerts** page: rules on watchlist + saved scorecard fields.  
2. **Custom rank score** + screener sort/filter.  
3. Watchlist **tags** for rule conditions.  
4. **Live price alerts** while app is open.

Export/import includes `alertRules`, `rankWeights`, and `alertNotifyPrefs`.

### Local polish (no paid API) ✅

- **Alert notifications** while app is open (desktop + optional sound)  
- **Portfolio · All holdings** (manual + IB)  
- **Journal → Terminal** from ticker or row action  

### Phase 2 — Market data foundation ✅ (core)

1. Settings: **FMP API key**, cache TTL, test connection.  
2. **Historical daily bars** + candle chart on Terminal (IB).  
3. **Key ratios** on Terminal + scorecard auto-fill (FMP ± IB).  
4. **Earnings calendar** + **news feed** (FMP).

**Next Phase 2 slices:** screener filters on FMP metrics; Terminal ratio panel polish; optional second provider.

### Phase 3 — Depth research

1. Insider + institutional ownership panels (FMP or similar).  
2. **AI earnings summary** (optional OpenAI/Anthropic key, user-triggered).  
3. Economic indicators widget (FRED or static curated set).

### Phase 4 — Scanner + quant

1. **Volume / RVOL scanner** (universe = watchlist or index list).  
2. **Technical indicators** on historical series.  
3. **Backtester v1**: rules on daily bars, journal export of sim trades.

### Phase 5 — Portfolio polish

1. Merge manual + IB positions.  
2. Performance vs benchmark, sector weights.  
3. Alert when portfolio rule breached (concentration, drawdown).

---

## Nav → delivery order

| Nav item | Status |
|----------|--------|
| Alerts | Phase 1 ✅ |
| News & Sentiment | Phase 2 ✅ (lexicon; LLM in Phase 3) |
| Stock Screener | Phase 1 ✅ + universes; API metric filters next |
| Chart (Terminal) | Phase 2 ✅ (IB daily); technicals in Phase 4 |

---

## How to use this doc

When starting a phase, implement in small PR-sized slices: data service → UI panel → persist rules → commit.

Track progress by changing **Status** in the table above.
