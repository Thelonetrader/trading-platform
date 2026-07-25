/** Parse Reuters XML from IB reqFundamentalData (ReportSnapshot / ReportsFinSummary). */
const INVALID = -99999;

function cleanNum(raw) {
  const v = parseFloat(String(raw).replace(/,/g, ''));
  if (!Number.isFinite(v) || v <= INVALID + 1) return null;
  return v;
}

/** @returns {Record<string, number>} */
function parseIbFundamentalXml(xml) {
  const ratios = {};
  if (!xml || typeof xml !== 'string') return ratios;

  const ratioRe = /<Ratio FieldName="([^"]+)"[^>]*>([^<]*)<\/Ratio>/gi;
  let m;
  while ((m = ratioRe.exec(xml))) {
    const val = cleanNum(m[2]);
    if (val != null) ratios[m[1]] = val;
  }

  const forecastRe = /<ForecastData[^>]*>[\s\S]*?<Ratio FieldName="([^"]+)"[^>]*>([^<]*)<\/Ratio>/gi;
  while ((m = forecastRe.exec(xml))) {
    const val = cleanNum(m[2]);
    if (val != null) ratios[m[1]] = val;
  }

  return ratios;
}

/** First matching Reuters field → value */
function pick(ratios, keys) {
  for (const k of keys) {
    if (ratios[k] != null) return ratios[k];
  }
  return null;
}

/**
 * Map Reuters ratio codes to scorecard metric ids (shared across sectors where ids match).
 * Field names vary by instrument; we try several aliases.
 */
const METRIC_ALIASES = {
  forwardPE: ['ProjPE', 'APEEXCLXOR', 'PEEXCLXOR', 'APENORM'],
  pegRatio: ['APEGPLTTM', 'APEGPCT'],
  epsGrowth: ['AEPS5YGR', 'EPS5YGR', 'AEPSCHG', 'EPSCHG'],
  revenueGrowth: ['AREV5YGR', 'REV5YGR', 'AREVCHG', 'REVCHG'],
  roic: ['AROIC', 'AROICPCT'],
  roe: ['AROEPCT'],
  operatingMargin: ['AOPMGN', 'AOPMGNPCT', 'AOPMARGIN'],
  grossMargin: ['AGROSMGN', 'AGROSMGNPCT'],
  netDebtEbitda: ['ANETD2EBITD', 'ATOTD2EBT', 'ATOTD2EBITDA'],
  fcfYield: ['AFCFYLD', 'AFCFGRYLD'],
  evEbitda: ['AEV2EBITD', 'AEVEBITDA', 'EV2EBITDA'],
  interestCoverage: ['AINTCOV', 'AINTCOVRG'],
  psRatio: ['APR2REV', 'APR2SALES'],
  pbRatio: ['APRICE2BK', 'APRC2BK'],
  ptbv: ['APR2TANBK'],
  dividendYield: ['ADIVYLD', 'AYLD'],
  nim: ['ANIM', 'ANINTMGN'],
};

function mapRatiosToMetrics(ratios) {
  const out = {};
  for (const [metricId, keys] of Object.entries(METRIC_ALIASES)) {
    const v = pick(ratios, keys);
    if (v != null) out[metricId] = v;
  }
  if (out.roic == null && out.roe != null) {
    out.roic = out.roe;
  }
  return out;
}

module.exports = { parseIbFundamentalXml, mapRatiosToMetrics };
