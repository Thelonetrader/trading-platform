import { readJson } from './storageStats';
import { parseTags } from './customRank';
import { displayChangePct, displayPrice, quoteForSymbol } from './quoteDisplay';
import { matchesAnyContains, matchesAnyTag, normalizeFilterList } from './filterChipLists';
import {
  effectiveAlertLiveFilters,
  matchesAnyPriceBand,
  ruleHasLiveFilters,
} from './screenerQuickFilters';

export const ALERT_RULES_KEY = 'alertRules';

export const RATING_MIN_AVG = {
  any: 0,
  'hold+': 2.5,
  'buy+': 3.5,
  sb: 4.5,
};

export function listAlertRules() {
  return readJson(ALERT_RULES_KEY, []);
}

export function saveAlertRules(rules) {
  localStorage.setItem(ALERT_RULES_KEY, JSON.stringify(rules));
}

export function upsertAlertRule(rule) {
  const list = listAlertRules();
  const entry = {
    id: rule.id ?? Date.now(),
    name: (rule.name || 'Untitled rule').trim(),
    enabled: rule.enabled !== false,
    minScorecardAvg: Number(rule.minScorecardAvg) || 0,
    minRating: rule.minRating || 'any',
    priorities: rule.priorities?.length ? rule.priorities : ['High', 'Medium', 'Low'],
    requireJournal: !!rule.requireJournal,
    requireScorecard: !!rule.requireScorecard,
    tagMatches: normalizeFilterList(rule.tagMatches, rule.tagMatch),
    sectorMatches: normalizeFilterList(rule.sectorMatches, rule.sectorContains),
    dayChangeChipIds: normalizeFilterList(rule.dayChangeChipIds),
    priceBandIds: normalizeFilterList(rule.priceBandIds),
    minDayChangePct: rule.minDayChangePct === '' || rule.minDayChangePct == null ? null : Number(rule.minDayChangePct),
    maxDayChangePct: rule.maxDayChangePct === '' || rule.maxDayChangePct == null ? null : Number(rule.maxDayChangePct),
    minPrice: rule.minPrice === '' || rule.minPrice == null ? null : Number(rule.minPrice),
    maxPrice: rule.maxPrice === '' || rule.maxPrice == null ? null : Number(rule.maxPrice),
    minPctAboveBuy: rule.minPctAboveBuy === '' || rule.minPctAboveBuy == null ? null : Number(rule.minPctAboveBuy),
  };
  const idx = list.findIndex((r) => r.id === entry.id);
  if (idx >= 0) list[idx] = entry;
  else list.unshift(entry);
  saveAlertRules(list);
  return entry;
}

export function deleteAlertRule(id) {
  saveAlertRules(listAlertRules().filter((r) => r.id !== id));
}

export function evaluateRule(rule, ctx) {
  if (!rule.enabled) return false;
  if (!ctx.watch) return false;

  const sectorMatches = normalizeFilterList(rule.sectorMatches, rule.sectorContains);
  const tagMatches = normalizeFilterList(rule.tagMatches, rule.tagMatch);

  if (!rule.priorities.includes(ctx.watch.priority || 'Medium')) return false;

  const sector = (ctx.watch.sector || '').toLowerCase();
  if (!matchesAnyContains(sector, sectorMatches)) return false;

  const tags = ctx.tags || parseTags(ctx.watch.tags);
  if (!matchesAnyTag(tags, tagMatches)) return false;

  if (rule.requireJournal && !ctx.journal) return false;
  if (rule.requireScorecard && !ctx.eval) return false;

  const minAvg = Math.max(rule.minScorecardAvg || 0, RATING_MIN_AVG[rule.minRating] ?? 0);
  if (minAvg > 0) {
    if (!ctx.eval || ctx.eval.avg < minAvg) return false;
  }

  const live = effectiveAlertLiveFilters(rule);
  const priceBandIds = normalizeFilterList(rule.priceBandIds);

  const needsQuote = ruleHasLiveFilters(rule);

  if (needsQuote) {
    const q = ctx.quote;
    const price = displayPrice(q);
    const chg = displayChangePct(q);
    if (live.minDayChangePct != null && (chg == null || chg < live.minDayChangePct)) return false;
    if (live.maxDayChangePct != null && (chg == null || chg > live.maxDayChangePct)) return false;

    const priceBand = matchesAnyPriceBand(price, priceBandIds);
    if (priceBand === false) return false;
    if (live.minPrice != null && (price == null || price < live.minPrice)) return false;
    if (live.maxPrice != null && (price == null || price > live.maxPrice)) return false;
    if (rule.minPctAboveBuy != null) {
      const buy = parseFloat(ctx.watch?.buyPrice);
      if (!Number.isFinite(buy) || buy <= 0 || price == null) return false;
      const pctAbove = ((price - buy) / buy) * 100;
      if (pctAbove < rule.minPctAboveBuy) return false;
    }
  }

  return true;
}

/** @param {ReturnType<import('./customRank').rankAllWatchlistItems>} contexts */
export function evaluateAllRules(contexts, quotes = {}) {
  const rules = listAlertRules().filter((r) => r.enabled);
  return rules.map((rule) => ({
    rule,
    matches: contexts.filter((ctx) => {
      const withQuote = {
        ...ctx,
        quote: ctx.quote ?? quoteForSymbol(quotes, ctx.ticker),
      };
      return evaluateRule(rule, withQuote);
    }),
  }));
}

export const DEFAULT_RULE_TEMPLATE = {
  name: '',
  enabled: true,
  minScorecardAvg: 0,
  minRating: 'buy+',
  priorities: ['High', 'Medium'],
  requireJournal: false,
  requireScorecard: true,
  tagMatches: [],
  sectorMatches: [],
  dayChangeChipIds: [],
  priceBandIds: [],
  minDayChangePct: null,
  maxDayChangePct: null,
  minPrice: null,
  maxPrice: null,
  minPctAboveBuy: null,
};
