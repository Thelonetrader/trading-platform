# Trading Platform

Desktop trading terminal (Electron + React) with research tools, IB Gateway integration, and manual portfolio/journal tracking.

## Run in development

1. Install dependencies (do **not** use `sudo`):

```bash
npm install
```

2. Start React + Electron together:

```bash
npm run electron:dev
```

Or run `npm start` in one terminal and `npm run electron` in another (after http://localhost:3000 is up).

### If Electron fails to install

If you see permission errors under `node_modules/electron`, a prior `sudo npm install` likely left root-owned files. Fix ownership, then reinstall:

```bash
sudo chown -R "$(whoami):staff" node_modules/electron
node node_modules/electron/install.js
```

Never run `sudo electron` or `sudo npm install` in this project.

## Run production build locally (unpacked)

Builds the React app and opens it in Electron without the dev server:

```bash
npm run electron:prod
```

## Ship a macOS app (.dmg)

Creates installable artifacts under `dist/`:

```bash
npm run dist
```

- **DMG:** `dist/Trading Platform-<version>.dmg` — drag to Applications
- **ZIP:** `dist/Trading Platform-<version>-mac.zip` — portable copy

Quick unpack test without DMG:

```bash
npm run dist:dir
open "dist/mac-arm64/Trading Platform.app"
```

Smoke-test the production React bundle inside Electron (no dev server):

```bash
npm run electron:prod
```

macOS may block unsigned builds: **System Settings → Privacy & Security → Open Anyway**, or right‑click the app → **Open** once.

Notarization is not configured yet; the app is for personal/local use.

## Interactive Brokers setup

1. Install [IB Gateway](https://www.interactivebrokers.com/en/trading/ibgateway-stable.php) or Trader Workstation.
2. Log in (use **paper** account for testing).
3. Enable API: Configure → Settings → API → Settings
   - Enable ActiveX and Socket Clients
   - Trusted IP: `127.0.0.1`
   - Read-only API **off** if you want to place orders
4. Note the socket port:
   - **Gateway paper:** 4002 · **Gateway live:** 4001
   - **TWS paper:** 7497 · **TWS live:** 7496
5. In the app, open **Settings**, choose paper/live, set port and client ID (unique if multiple API clients), click **Connect**.

Market data requires the appropriate IB market data subscriptions for your symbols.

### FMP (fundamentals, news, earnings)

1. Sign up at [Financial Modeling Prep](https://site.financialmodelingprep.com/) and copy an API key (stable API).
2. In the app (**Electron only**), open **Settings** → **Market data (Phase 2)** → paste the key → **Save market data** → **Test FMP**.
3. Optional: set `FMP_API_KEY` in a local `.env` for defaults (see `.env.example`).

Cached responses use the TTL in Settings (default 60 minutes). Restart Electron after changing main-process code.

## Features

- **Terminal** — symbol workspace, **key metrics** (FMP/IB), **IB daily chart** (hover OHLCV), order ticket, quote strip, ⌘K command bar
- **Watchlist** — local notes + live quotes when IB connected (exchange/currency per symbol)
- **Stock Screener** — filter watchlist or index universes (Mag 7, Dow, etc.) by priority, scorecard, journal, IB day change, custom rank; saved presets
- **Scorecards** — sector fundamental scorecards; **auto-fill from FMP and/or IB**; save evaluations to the research library
- **News & Sentiment** — FMP headlines per watchlist tickers + lexicon sentiment; earnings calendar block
- **Portfolio** — manual holdings or IB positions tab
- **Alerts** — local rules (scorecard, priority, tags, **live price / % / buy-price**) with in-app notifications
- **Journal & Scorecards** — local research workflow
- **Settings** — IB connection; **FMP key** and cache TTL; **export/import** backup (watchlist, journal, portfolio, scorecards, screener presets, alert rules)

## Data backup

Research data lives in the app’s **localStorage** (not in git). Use **Settings → Export / import** to download a JSON backup before reinstalling or moving machines. Optional: include IB connection settings in the backup file.

## Web-only dev

`npm start` runs the UI in the browser; broker APIs are available only in Electron (`window.trading`).

See `.env.example` for optional environment defaults.

## Product roadmap

Full feature inventory (historical data, fundamentals, alerts, backtesting, etc.) and build phases: [docs/ROADMAP.md](docs/ROADMAP.md).
