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
  const [openOrders, setOpenOrders] = useState([]);
  const [accountSummary, setAccountSummary] = useState([]);
  const [tradingRefreshing, setTradingRefreshing] = useState(false);

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
    const offOrder = api.onOrderUpdate((update) => {
      if (update.type === 'openOrderEnd') {
        setOpenOrders(update.orders || []);
      }
      if (update.type === 'openOrder' && update.order) {
        setOpenOrders((prev) => {
          const idx = prev.findIndex((o) => o.orderId === update.order.orderId);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = update.order;
            return next;
          }
          return [update.order, ...prev];
        });
      }
      if (update.type === 'orderStatus') {
        setOpenOrders((prev) =>
          prev.map((o) => (o.orderId === update.orderId ? { ...o, status: update.status } : o)),
        );
      }
      if (update.type === 'accountSummaryEnd') {
        setAccountSummary(update.summary || []);
      }
    });
    return () => {
      mounted = false;
      offStatus();
      offQuote();
      offOrder();
    };
  }, [api]);

  const refreshQuotes = useCallback(async () => {
    const snap = await api.getQuotes();
    setQuotes(snap || {});
  }, [api]);

  const refreshTradingData = useCallback(async () => {
    const status = await api.getConnectionStatus();
    if (status.status !== 'connected') {
      setOpenOrders([]);
      setAccountSummary([]);
      return;
    }
    setTradingRefreshing(true);
    try {
      const [orders, summary] = await Promise.all([api.getOpenOrders(), api.getAccountSummary()]);
      setOpenOrders(orders || []);
      setAccountSummary(summary || []);
    } finally {
      setTradingRefreshing(false);
    }
  }, [api]);

  useEffect(() => {
    if (connection.status === 'connected') {
      refreshTradingData();
    } else {
      setOpenOrders([]);
      setAccountSummary([]);
    }
  }, [connection.status, refreshTradingData]);

  const connect = useCallback(async () => {
    const result = await api.connect();
    setConnection(await api.getConnectionStatus());
    await refreshTradingData();
    return result;
  }, [api, refreshTradingData]);

  const disconnect = useCallback(async () => {
    await api.disconnect();
    setConnection(await api.getConnectionStatus());
    setOpenOrders([]);
    setAccountSummary([]);
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

  const cancelOrder = useCallback(
    async (orderId) => {
      await api.cancelOrder(orderId);
      await refreshTradingData();
    },
    [api, refreshTradingData],
  );

  return {
    api,
    isElectron: api !== noopApi,
    connection,
    quotes,
    settings,
    openOrders,
    accountSummary,
    tradingRefreshing,
    connect,
    disconnect,
    saveSettings,
    subscribeSymbols,
    refreshQuotes,
    refreshTradingData,
    cancelOrder,
  };
}
