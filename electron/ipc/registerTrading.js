const { ipcMain, BrowserWindow } = require('electron');
const { getStore } = require('../store');
const { IbkrAdapter } = require('../broker/ibkr');

const broker = new IbkrAdapter();

function broadcast(channel, payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload);
  }
}

function registerTradingIpc() {
  broker.setCallbacks({
    onQuote: (quote) => broadcast('trading:quote', quote),
    onStatusChange: (status) => broadcast('trading:connection', status),
    onOrderUpdate: (update) => broadcast('trading:order', update),
  });

  ipcMain.handle('trading:getSettings', async () => {
    const store = await getStore();
    return { ib: store.get('ib'), marketData: store.get('marketData') };
  });

  ipcMain.handle('trading:setSettings', async (_e, { ib, marketData }) => {
    const store = await getStore();
    if (ib) store.set('ib', { ...store.get('ib'), ...ib });
    if (marketData) store.set('marketData', { ...store.get('marketData'), ...marketData });
    const saved = { ib: store.get('ib'), marketData: store.get('marketData') };
    broker.applyIbSettings(saved.ib);
    return saved;
  });

  ipcMain.handle('trading:getConnectionStatus', async () => broker.getConnectionStatus());

  ipcMain.handle('trading:connect', async () => {
    const store = await getStore();
    const ib = store.get('ib');
    return broker.connect(ib);
  });

  ipcMain.handle('trading:disconnect', async () => broker.disconnect());

  ipcMain.handle('trading:subscribeQuotes', async (_e, symbols) => broker.subscribeQuotes(symbols || []));

  ipcMain.handle('trading:getQuotes', async () => broker.getQuotes());

  ipcMain.handle('trading:placeOrder', async (_e, order) => broker.placeOrder(order));

  ipcMain.handle('trading:cancelOrder', async (_e, orderId) => broker.cancelOrder(orderId));

  ipcMain.handle('trading:getOpenOrders', async () => broker.getOpenOrders());

  ipcMain.handle('trading:getPositions', async () => broker.getPositions());

  ipcMain.handle('trading:getAccountSummary', async () => broker.getAccountSummary());

  ipcMain.handle('trading:getFundamentals', async (_e, entry) => broker.getFundamentals(entry || {}));

  ipcMain.handle('trading:getHistoricalBars', async (_e, entry, options) =>
    broker.getHistoricalBars(entry || {}, options || {}),
  );
}

module.exports = { registerTradingIpc, broker };
