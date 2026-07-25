const { ipcMain } = require('electron');
const { createMarketDataService, setBrokerRef } = require('../providers/marketDataService');

function registerMarketDataIpc(broker) {
  setBrokerRef(broker);
  const service = createMarketDataService();

  ipcMain.handle('marketData:getConfig', async () => service.readMarketConfig());

  ipcMain.handle('marketData:setConfig', async (_e, patch) => {
    const next = await service.writeMarketConfig(patch || {});
    await service.refreshConfig();
    return next;
  });

  ipcMain.handle('marketData:testFmp', async () => {
    await service.refreshConfig();
    return service.testFmp();
  });

  ipcMain.handle('marketData:getFundamentals', async (_e, entry) => service.getFundamentals(entry || {}));

  ipcMain.handle('marketData:resolveSymbol', async (_e, ticker) => service.resolveSymbol(ticker));

  ipcMain.handle('marketData:getNews', async (_e, opts) => service.getNews(opts || {}));

  ipcMain.handle('marketData:getEarningsCalendar', async (_e, opts) =>
    service.getEarningsCalendar(opts || {}),
  );
}

module.exports = { registerMarketDataIpc };
