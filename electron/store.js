let storePromise;

async function getStore() {
  if (!storePromise) {
    storePromise = import('electron-store').then(({ default: Store }) => {
      return new Store({
        name: 'trading-settings',
        defaults: {
          ib: {
            host: process.env.IB_HOST || '127.0.0.1',
            port: Number(process.env.IB_PORT) || 4002,
            clientId: Number(process.env.IB_CLIENT_ID) || 1,
            mode: process.env.IB_MODE || 'paper',
            accountId: process.env.IB_ACCOUNT_ID || '',
            useTws: false,
            marketDataType: 3,
          },
          marketData: {
            fmpApiKey: process.env.FMP_API_KEY || '',
            cacheTtlMinutes: 60,
          },
          agent: {
            enabled: true,
            activeProfileId: 'local-ollama',
            profiles: [],
            subscription: { plan: 'free' },
          },
        },
      });
    });
  }
  return storePromise;
}

module.exports = { getStore };
