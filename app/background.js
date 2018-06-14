const { app, ipcMain, BrowserWindow } = require('electron'),
      env = require('./vendor/electron_boilerplate/env_config'),
      devHelper = require('./vendor/electron_boilerplate/dev_helper'),
      windowStateKeeper = require('./vendor/electron_boilerplate/window_state');

var mainWindow,
  icon = process.platform === 'darwin' ? 'icon.icns' : 'icon.ico';

// Preserver of the window size and position between app launches.
var mainWindowState = windowStateKeeper('main', {
  width: 800,
  height: 650
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    minHeight: 650,
    minWidth: 800,
    icon: __dirname + '/assets/images/' + icon
  });

  if (mainWindowState.isMaximized) {
    mainWindow.maximize();
  }

  mainWindow.loadURL('file://' + __dirname + '/app.html');
 
  if (process.env.NODE_ENV === 'development') {
    devHelper.setDevMenu();
    mainWindow.openDevTools();
  }

  mainWindow.on('close', function () {
    mainWindowState.saveState(mainWindow);
  });
});

app.on('window-all-closed', function () {
  app.quit();
});