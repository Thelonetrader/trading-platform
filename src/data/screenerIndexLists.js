/** Static ticker lists for screener universes (SMART / USD unless on watchlist). */
export const MAG7_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA'];

export const DOW30_TICKERS = [
  'AAPL', 'AMGN', 'AXP', 'BA', 'CAT', 'CRM', 'CSCO', 'CVX', 'DIS', 'DOW',
  'GS', 'HD', 'HON', 'IBM', 'INTC', 'JNJ', 'JPM', 'KO', 'MCD', 'MMM',
  'MRK', 'MSFT', 'NKE', 'PG', 'TRV', 'UNH', 'V', 'VZ', 'WMT', 'WBA',
];

/** Large-cap US sample (~50 names) for broad screens without a paid index API. */
export const SP50_SAMPLE_TICKERS = [
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'GOOGL', 'BRK.B', 'LLY', 'AVGO', 'JPM',
  'TSLA', 'UNH', 'XOM', 'V', 'MA', 'COST', 'PG', 'JNJ', 'HD', 'ABBV',
  'MRK', 'AMD', 'NFLX', 'CRM', 'BAC', 'PEP', 'KO', 'TMO', 'LIN', 'WMT',
  'ADBE', 'CSCO', 'MCD', 'ACN', 'ABT', 'DHR', 'TXN', 'DIS', 'PM', 'INTC',
  'VZ', 'CMCSA', 'QCOM', 'IBM', 'GE', 'CAT', 'GS', 'MS', 'RTX', 'HON',
];

export const UNIVERSE_OPTIONS = [
  { id: 'live', label: 'Live market (FMP screener)' },
  { id: 'global', label: 'Everything (local + symbol search)' },
  { id: 'watchlist', label: 'Watchlist only' },
  { id: 'combined', label: 'Watchlist + library + portfolio' },
  { id: 'library', label: 'Scorecard library' },
  { id: 'portfolio', label: 'Portfolio holdings' },
  { id: 'mag7', label: 'Mag 7' },
  { id: 'dow30', label: 'Dow 30' },
  { id: 'sp50', label: 'US large cap (sample 50)' },
  { id: 'custom', label: 'Custom ticker list' },
];
