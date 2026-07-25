const { getStore } = require('../store');
const { FmpClient } = require('./fmp');

let brokerRef = null;

function setBrokerRef(broker) {
  brokerRef = broker;
}

async function readMarketConfig() {
  const store = await getStore();
  return store.get('marketData') || {};
}

async function writeMarketConfig(patch) {
  const store = await getStore();
  const next = { ...store.get('marketData'), ...patch };
  store.set('marketData', next);
  return next;
}

function createService() {
  let configCache = null;
  const refreshConfig = async () => {
    configCache = await readMarketConfig();
    return configCache;
  };

  const fmp = new FmpClient(() => configCache || {});

  async function mergeFundamentals(entry) {
    await refreshConfig();
    const fmpRes = await fmp.getFundamentals(entry);
    let ibRes = { metrics: {}, fieldCount: 0, sources: [] };

    if (brokerRef?.status === 'connected') {
      try {
        ibRes = await brokerRef.getFundamentals(entry);
      } catch {
        /* ignore */
      }
    }

    const ibMetrics = ibRes.metrics || {};
    const fmpMetrics = fmpRes.metrics || {};
    const merged = { ...ibMetrics, ...fmpMetrics };
    const sources = [];
    if (ibRes.fieldCount > 0) sources.push('ib');
    if (fmpRes.fieldCount > 0) sources.push('fmp');

    const fieldCount = Object.keys(merged).length;
    let error = null;
    if (!fieldCount) {
      error = fmpRes.error || ibRes.error || 'No fundamentals — add FMP key and/or connect IB';
    }

    return {
      symbol: fmpRes.symbol || ibRes.symbol,
      metrics: merged,
      fieldCount,
      sources,
      profile: fmpRes.profile,
      error,
    };
  }

  return {
    refreshConfig,
    readMarketConfig,
    writeMarketConfig,
    testFmp: () => fmp.testConnection(),
    getFundamentals: mergeFundamentals,
    getNews: (opts) => fmp.getNews(opts),
    getEarningsCalendar: (opts) => fmp.getEarningsCalendar(opts),
  };
}

module.exports = { createMarketDataService: createService, setBrokerRef };
