import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let teleprompterWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;

const configPath = path.join(app.getPath('userData'), 'config.json');

// Default config
let config = {
  settings: {
    transparency: 0.5,
    fontSize: 24,
    fontColor: '#ffffff'
  },
  hotkeys: {
    up: 'CommandOrControl+Option+Up',
    down: 'CommandOrControl+Option+Down',
    auto: 'CommandOrControl+Option+Space',
    settings: 'CommandOrControl+Option+S'
  }
};

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to load config:", error);
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error("Failed to save config:", error);
  }
}

function registerHotkeys() {
  globalShortcut.unregisterAll();
  
  if (config.hotkeys.up) {
    globalShortcut.register(config.hotkeys.up, () => {
      teleprompterWindow?.webContents.send('scroll-up');
    });
  }
  
  if (config.hotkeys.down) {
    globalShortcut.register(config.hotkeys.down, () => {
      teleprompterWindow?.webContents.send('scroll-down');
    });
  }

  if (config.hotkeys.auto) {
    globalShortcut.register(config.hotkeys.auto, () => {
      teleprompterWindow?.webContents.send('toggle-auto-scroll');
    });
  }

  if (config.hotkeys.settings) {
    globalShortcut.register(config.hotkeys.settings, () => {
      if (settingsWindow) {
        settingsWindow.focus();
      } else {
        createSettingsWindow();
      }
    });
  }
}

function createTeleprompterWindow() {
  teleprompterWindow = new BrowserWindow({
    width: 600,
    height: 400,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  teleprompterWindow.setContentProtection(true);
  teleprompterWindow.loadFile(path.join(__dirname, '../src/index.html'));
  
  teleprompterWindow.webContents.on('did-finish-load', () => {
    teleprompterWindow?.webContents.send('update-settings', config.settings);
  });

  teleprompterWindow.on('closed', () => {
    teleprompterWindow = null;
  });
}

function createSettingsWindow() {
  if (settingsWindow) return;

  settingsWindow = new BrowserWindow({
    width: 400,
    height: 500,
    title: "Teleprompter Settings",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Settings window shouldn't be captured either to keep things clean, but it's optional.
  settingsWindow.setContentProtection(true);
  settingsWindow.loadFile(path.join(__dirname, '../src/settings.html'));

  settingsWindow.webContents.on('did-finish-load', () => {
    settingsWindow?.webContents.send('load-settings', config);
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// IPC Handlers
ipcMain.on('save-settings', (event, newSettings) => {
  config.settings = { ...config.settings, ...newSettings };
  saveConfig();
  if (teleprompterWindow) {
    teleprompterWindow.webContents.send('update-settings', config.settings);
  }
});

ipcMain.on('save-hotkeys', (event, newHotkeys) => {
  config.hotkeys = { ...config.hotkeys, ...newHotkeys };
  saveConfig();
  registerHotkeys(); // Re-register with new bindings
});


app.on('ready', () => {
  if (app.dock) {
    app.dock.hide();
  }
  loadConfig();
  createTeleprompterWindow();
  registerHotkeys();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('activate', () => {
  if (teleprompterWindow === null) {
    createTeleprompterWindow();
  }
});
