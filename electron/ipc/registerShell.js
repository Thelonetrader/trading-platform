const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const chartWindows = new Map();

function registerShellIpc({ isDev, appRoot }) {
  ipcMain.handle('shell:openChartWindow', (_e, opts = {}) => {
    const symbol = String(opts.symbol || '').trim().toUpperCase();
    if (!symbol) return { ok: false, error: 'Missing symbol' };

    const existing = chartWindows.get(symbol);
    if (existing && !existing.isDestroyed()) {
      existing.focus();
      return { ok: true, reused: true };
    }

    const query = {
      chart: '1',
      symbol,
      exchange: opts.exchange || 'SMART',
      currency: opts.currency || 'USD',
    };
    if (opts.primaryExch) query.primaryExch = opts.primaryExch;
    if (opts.duration) query.duration = opts.duration;
    if (opts.barSize) query.barSize = opts.barSize;

    const win = new BrowserWindow({
      width: 1024,
      height: 720,
      minWidth: 480,
      minHeight: 360,
      backgroundColor: '#060b16',
      title: `${symbol} — Chart`,
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    chartWindows.set(symbol, win);
    win.on('closed', () => {
      if (chartWindows.get(symbol) === win) chartWindows.delete(symbol);
    });

    if (isDev) {
      const q = new URLSearchParams(query);
      win.loadURL(`http://localhost:3000/?${q.toString()}`);
    } else {
      win.loadFile(path.join(appRoot, 'build', 'index.html'), { query });
    }

    return { ok: true };
  });
}

module.exports = { registerShellIpc };
