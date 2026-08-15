import { app, BrowserWindow, globalShortcut, ipcMain, screen, session } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let teleprompterWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let transcriptionWindow: BrowserWindow | null = null;

const configPath = path.join(app.getPath('userData'), 'config.json');

// Default config
let config = {
  settings: {
    transparency: 0.5,
    fontSize: 24,
    fontColor: '#ffffff',
    groqApiKey: '',
    groqContext: 'You are a helpful software engineering assistant...'
  },
  hotkeys: {
    up: 'CommandOrControl+Option+Up',
    down: 'CommandOrControl+Option+Down',
    auto: 'CommandOrControl+Option+Space',
    settings: 'CommandOrControl+Option+S',
    askGroq: 'CommandOrControl+Option+G'
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

  if (config.hotkeys.askGroq) {
    globalShortcut.register(config.hotkeys.askGroq, () => {
      transcriptionWindow?.webContents.send('get-transcription');
    });
  }

  
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
  teleprompterWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  teleprompterWindow.loadFile(path.join(__dirname, '../src/index.html'));
  
  teleprompterWindow.webContents.on('did-finish-load', () => {
    teleprompterWindow?.webContents.send('update-settings', config.settings);
  });

  teleprompterWindow.on('closed', () => {
    teleprompterWindow = null;
  });
}


function createTranscriptionWindow() {
  if (transcriptionWindow) return;

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const windowWidth = 400;

  transcriptionWindow = new BrowserWindow({
    width: windowWidth,
    height: height,
    x: width - windowWidth,
    y: 0,
    title: "Live Transcription",
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  transcriptionWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  transcriptionWindow.loadFile(path.join(__dirname, '../src/transcription.html'));

  transcriptionWindow.on('closed', () => {
    transcriptionWindow = null;
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

ipcMain.on('transcription-result', async (event, text) => {
  if (!text || text.trim() === "") {
    teleprompterWindow?.webContents.send('set-prompter-text', "No transcription text available to ask Groq.");
    return;
  }

  if (!config.settings.groqApiKey) {
    teleprompterWindow?.webContents.send('set-prompter-text', "Please set your Groq API Key in Settings.");
    return;
  }

  teleprompterWindow?.webContents.send('set-prompter-text', "Thinking...");

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.settings.groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: config.settings.groqContext },
          { role: 'user', content: text }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices[0].message.content;
    teleprompterWindow?.webContents.send('set-prompter-text', answer);
  } catch (error: any) {
    console.error("Failed to fetch from Groq:", error);
    teleprompterWindow?.webContents.send('set-prompter-text', `Error: ${error.message}`);
  }
});

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

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      // Approving microphone permission automatically
      callback(true);
    } else {
      callback(false);
    }
  });

  loadConfig();
  createTeleprompterWindow();
  createTranscriptionWindow();
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
