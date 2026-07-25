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

## Features

- **Terminal** — symbol workspace, order ticket, quote strip, ⌘K command bar
- **Watchlist** — local notes + live quotes when IB connected (exchange/currency per symbol)
- **Stock Screener** — filter watchlist by priority, scorecard ratings, journal, IB day change; saved screen presets
- **Scorecards** — sector fundamental scorecards; save evaluations to the research library
- **Portfolio** — manual holdings or IB positions tab
- **Journal & Scorecards** — local research workflow
- **Settings** — IB connection; **export/import** backup (watchlist, journal, portfolio, scorecards, screener presets)

## Data backup

Research data lives in the app’s **localStorage** (not in git). Use **Settings → Export / import** to download a JSON backup before reinstalling or moving machines. Optional: include IB connection settings in the backup file.

## Web-only dev

`npm start` runs the UI in the browser; broker APIs are available only in Electron (`window.trading`).

See `.env.example` for optional environment defaults.
