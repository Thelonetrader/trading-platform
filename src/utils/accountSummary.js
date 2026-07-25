/** Pick first numeric value per IB account summary tag. */
export function parseAccountMetrics(summaryRows) {
  const pick = (tag) => {
    const row = (summaryRows || []).find((r) => r.tag === tag);
    if (!row?.value) return null;
    const n = parseFloat(String(row.value).replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  return {
    netLiquidation: pick('NetLiquidation'),
    totalCash: pick('TotalCashValue'),
    buyingPower: pick('BuyingPower'),
    grossPositionValue: pick('GrossPositionValue'),
  };
}

export function formatAccountMoney(value, currency = 'USD') {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
