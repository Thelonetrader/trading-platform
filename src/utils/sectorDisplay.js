import { SECTORS } from '../scorecards/model';

/** IB / API security type codes → readable labels */
const SEC_TYPE_LABELS = {
  STK: 'Stock',
  OPT: 'Option',
  FUT: 'Future',
  CASH: 'Cash',
  BOND: 'Bond',
  CFD: 'CFD',
  FOP: 'Future option',
  WAR: 'Warrant',
  FUND: 'Fund',
  IND: 'Index',
};

/** Short sector codes / scorecard ids → full label */
const SECTOR_SHORT = {
  tech: 'Technology',
  fin: 'Financial Services',
  financial: 'Financial Services',
  eng: 'Energy',
  enr: 'Energy',
  hlt: 'Healthcare',
  health: 'Healthcare',
  cons: 'Consumer',
  ind: 'Industrials',
  util: 'Utilities',
  re: 'Real Estate',
  mat: 'Materials',
  tec: 'Technology',
  stk: 'Consumer Staples',
};

const FMP_SECTOR_ALIASES = {
  'consumer cyclical': 'Consumer Cyclical',
  'consumer defensive': 'Consumer Defensive',
  'financial services': 'Financial Services',
  'financials': 'Financial Services',
  'basic materials': 'Basic Materials',
  'communication services': 'Communication Services',
  'real estate': 'Real Estate',
  technology: 'Technology',
  healthcare: 'Healthcare',
  industrials: 'Industrials',
  energy: 'Energy',
  utilities: 'Utilities',
};

export function formatSecType(code = 'STK') {
  const key = String(code || 'STK').trim().toUpperCase();
  return SEC_TYPE_LABELS[key] || key;
}

/**
 * Show full sector name for display (FMP GICS-style, watchlist text, or short codes).
 */
export function formatSectorDisplay(sector) {
  const raw = String(sector || '').trim();
  if (!raw) return '';

  if (SECTORS[raw]?.label) return SECTORS[raw].label;

  const lower = raw.toLowerCase();
  if (FMP_SECTOR_ALIASES[lower]) return FMP_SECTOR_ALIASES[lower];

  if (raw.length <= 3) {
    const expanded = SECTOR_SHORT[lower];
    if (expanded) return expanded;
  }

  if (/^[a-z]+$/i.test(raw) && raw.length <= 10 && !raw.includes(' ')) {
    const title = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    if (FMP_SECTOR_ALIASES[title.toLowerCase()]) return FMP_SECTOR_ALIASES[title.toLowerCase()];
    return title;
  }

  return raw;
}
