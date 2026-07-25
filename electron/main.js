const { app, BrowserWindow } = require('electron');
const path = require('path');
const { registerTradingIpc } = require('./ipc/registerTrading');

const isDev = !app.isPackaged && process.env.ELECTRON_DEV !== '0';
const appRoot = path.join(__dirname, '..');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#060b16',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Trading Platform',
  });

  if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    win.loadFile(path.join(appRoot, 'build', 'index.html'));
  }
}

app.whenReady().then(() => {
  registerTradingIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
