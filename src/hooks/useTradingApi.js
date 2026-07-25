import { useCallback, useEffect, useMemo, useState } from 'react';

const noopApi = {
  getSettings: async () => ({ ib: { mode: 'paper', host: '127.0.0.1', port: 4002, clientId: 1, accountId: '' } }),
  setSettings: async () => ({}),
  getConnectionStatus: async () => ({ status: 'disconnected', mode: 'paper' }),
  connect: async () => ({ status: 'disconnected' }),
  disconnect: async () => ({}),
  subscribeQuotes: async () => ({}),
  getQuotes: async () => ({}),
  placeOrder: async () => {
    throw new Error('Connect via Electron to place orders');
  },
  cancelOrder: async () => ({}),
  getOpenOrders: async () => [],
  getPositions: async () => [],
  getAccountSummary: async () => [],
  onQuote: () => () => {},
  onConnectionStatus: () => () => {},
  onOrderUpdate: () => () => {},
};

export function useTradingApi() {
  const api = useMemo(() => (typeof window !== 'undefined' && window.trading) || noopApi, []);
  const [connection, setConnection] = useState({ status: 'disconnected', mode: 'paper' });
  const [quotes, setQuotes] = useState({});
  const [settings, setSettingsState] = useState(null);

  useEffect(() => {
    let mounted = true;
    api.getConnectionStatus().then((s) => {
      if (mounted) setConnection(s);
    });
    api.getSettings().then((s) => {
      if (mounted) setSettingsState(s);
    });
    const offStatus = api.onConnectionStatus((s) => setConnection(s));
    const offQuote = api.onQuote((q) => {
      setQuotes((prev) => ({ ...prev, [q.symbol]: q }));
    });
    return () => {
      mounted = false;
      offStatus();
      offQuote();
    };
  }, [api]);

  const refreshQuotes = useCallback(async () => {
    const snap = await api.getQuotes();
    setQuotes(snap || {});
  }, [api]);

  const connect = useCallback(async () => {
    const result = await api.connect();
    setConnection(await api.getConnectionStatus());
    return result;
  }, [api]);

  const disconnect = useCallback(async () => {
    await api.disconnect();
    setConnection(await api.getConnectionStatus());
  }, [api]);

  const saveSettings = useCallback(
    async (ib) => {
      const next = await api.setSettings({ ib });
      setSettingsState(next);
      return next;
    },
    [api],
  );

  const subscribeSymbols = useCallback(
    async (symbols) => {
      await api.subscribeQuotes(symbols);
      await refreshQuotes();
    },
    [api, refreshQuotes],
  );

  return {
    api,
    isElectron: api !== noopApi,
    connection,
    quotes,
    settings,
    connect,
    disconnect,
    saveSettings,
    subscribeSymbols,
    refreshQuotes,
  };
}
