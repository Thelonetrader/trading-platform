# Trading Platform

Desktop trading terminal (Electron + React) with research tools, IB Gateway integration, and manual portfolio/journal tracking.

## Run in development

1. Install dependencies: `npm install`
2. Start React + Electron together:

```bash
npm run electron:dev
```

Or run `npm start` in one terminal and `npm run electron` in another (after http://localhost:3000 is up).

## Run production build in Electron

```bash
npm run electron:prod
```

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
- **Portfolio** — manual holdings or IB positions tab
- **Journal & Scorecards** — local research workflow

## Web-only dev

`npm start` runs the UI in the browser; broker APIs are available only in Electron (`window.trading`).

See `.env.example` for optional environment defaults.
