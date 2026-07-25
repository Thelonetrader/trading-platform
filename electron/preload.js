const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('trading', {
  getSettings: () => ipcRenderer.invoke('trading:getSettings'),
  setSettings: (settings) => ipcRenderer.invoke('trading:setSettings', settings),
  getConnectionStatus: () => ipcRenderer.invoke('trading:getConnectionStatus'),
  connect: () => ipcRenderer.invoke('trading:connect'),
  disconnect: () => ipcRenderer.invoke('trading:disconnect'),
  subscribeQuotes: (symbols) => ipcRenderer.invoke('trading:subscribeQuotes', symbols),
  getQuotes: () => ipcRenderer.invoke('trading:getQuotes'),
  placeOrder: (order) => ipcRenderer.invoke('trading:placeOrder', order),
  cancelOrder: (orderId) => ipcRenderer.invoke('trading:cancelOrder', orderId),
  getOpenOrders: () => ipcRenderer.invoke('trading:getOpenOrders'),
  getPositions: () => ipcRenderer.invoke('trading:getPositions'),
  getAccountSummary: () => ipcRenderer.invoke('trading:getAccountSummary'),
  onQuote: (cb) => {
    const handler = (_e, quote) => cb(quote);
    ipcRenderer.on('trading:quote', handler);
    return () => ipcRenderer.removeListener('trading:quote', handler);
  },
  onConnectionStatus: (cb) => {
    const handler = (_e, status) => cb(status);
    ipcRenderer.on('trading:connection', handler);
    return () => ipcRenderer.removeListener('trading:connection', handler);
  },
  onOrderUpdate: (cb) => {
    const handler = (_e, update) => cb(update);
    ipcRenderer.on('trading:order', handler);
    return () => ipcRenderer.removeListener('trading:order', handler);
  },
});
