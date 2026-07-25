/** Map FMP TTM / growth payloads → scorecard metric ids (percent fields as 0–100). */

function pct(v) {
  if (v == null || Number.isNaN(Number(v))) return null;
  const n = Number(v);
  if (Math.abs(n) <= 1.5) return n * 100;
  return n;
}

function num(v) {
  if (v == null || Number.isNaN(Number(v))) return null;
  return Number(v);
}

function mapFmpToMetrics({ ratios, keyMetrics, growth, profile } = {}) {
  const r = ratios || {};
  const k = keyMetrics || {};
  const g = growth || {};
  const p = profile || {};

  const out = {};

  const forwardPe = num(r.peRatioTTM) ?? num(k.peRatioTTM);
  if (forwardPe != null) out.forwardPE = forwardPe;

  const peg = num(r.pegRatioTTM) ?? num(k.pegRatioTTM);
  if (peg != null) out.pegRatio = peg;

  const ps = num(r.priceToSalesRatioTTM) ?? num(k.priceToSalesRatioTTM);
  if (ps != null) out.psRatio = ps;

  const pb = num(r.priceToBookRatioTTM) ?? num(k.priceToBookRatioTTM);
  if (pb != null) out.pbRatio = pb;

  const roic = pct(r.returnOnInvestedCapitalTTM) ?? pct(k.roicTTM);
  if (roic != null) out.roic = roic;

  const roe = pct(r.returnOnEquityTTM) ?? pct(k.roeTTM);
  if (roe != null && out.roic == null) out.roic = roe;

  const opM = pct(r.operatingProfitMarginTTM) ?? pct(k.operatingProfitMarginTTM);
  if (opM != null) out.operatingMargin = opM;

  const gm = pct(r.grossProfitMarginTTM) ?? pct(k.grossProfitMarginTTM);
  if (gm != null) out.grossMargin = gm;

  const ndE = num(r.netDebtToEBITDATTM) ?? num(k.netDebtToEBITDATTM);
  if (ndE != null) out.netDebtEbitda = ndE;

  const fcfY = pct(r.freeCashFlowYieldTTM) ?? pct(k.freeCashFlowYieldTTM);
  if (fcfY != null) out.fcfYield = fcfY;

  const evE = num(r.enterpriseValueOverEBITDATTM) ?? num(k.enterpriseValueOverEBITDATTM);
  if (evE != null) out.evEbitda = evE;

  const intCov = num(r.interestCoverageTTM) ?? num(k.interestCoverageTTM);
  if (intCov != null) out.interestCoverage = intCov;

  const divY = pct(r.dividendYieldTTM) ?? pct(k.dividendYieldTTM);
  if (divY != null) out.dividendYield = divY;

  const ptbv = num(r.priceToBookRatioTTM);
  if (ptbv != null) out.ptbv = ptbv;

  const epsG = pct(g.epsgrowth) ?? pct(g.growthEPS);
  if (epsG != null) out.epsGrowth = epsG;

  const revG = pct(g.revenueGrowth) ?? pct(g.growthRevenue);
  if (revG != null) out.revenueGrowth = revG;

  if (p.lastDiv != null && out.dividendYield == null && p.price) {
    const dy = (Number(p.lastDiv) / Number(p.price)) * 100;
    if (Number.isFinite(dy)) out.dividendYield = dy;
  }

  return out;
}

module.exports = { mapFmpToMetrics };
