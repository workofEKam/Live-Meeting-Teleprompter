"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let teleprompterWindow = null;
let settingsWindow = null;
let transcriptionWindow = null;
const configPath = path.join(electron_1.app.getPath('userData'), 'config.json');
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
    }
    catch (error) {
        console.error("Failed to load config:", error);
    }
}
function saveConfig() {
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }
    catch (error) {
        console.error("Failed to save config:", error);
    }
}
function registerHotkeys() {
    electron_1.globalShortcut.unregisterAll();
    if (config.hotkeys.askGroq) {
        electron_1.globalShortcut.register(config.hotkeys.askGroq, () => {
            transcriptionWindow?.webContents.send('get-transcription');
        });
    }
    if (config.hotkeys.up) {
        electron_1.globalShortcut.register(config.hotkeys.up, () => {
            teleprompterWindow?.webContents.send('scroll-up');
        });
    }
    if (config.hotkeys.down) {
        electron_1.globalShortcut.register(config.hotkeys.down, () => {
            teleprompterWindow?.webContents.send('scroll-down');
        });
    }
    if (config.hotkeys.auto) {
        electron_1.globalShortcut.register(config.hotkeys.auto, () => {
            teleprompterWindow?.webContents.send('toggle-auto-scroll');
        });
    }
    if (config.hotkeys.settings) {
        electron_1.globalShortcut.register(config.hotkeys.settings, () => {
            if (settingsWindow) {
                settingsWindow.focus();
            }
            else {
                createSettingsWindow();
            }
        });
    }
}
function createTeleprompterWindow() {
    teleprompterWindow = new electron_1.BrowserWindow({
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
    if (transcriptionWindow)
        return;
    const primaryDisplay = electron_1.screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const windowWidth = 400;
    transcriptionWindow = new electron_1.BrowserWindow({
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
    if (settingsWindow)
        return;
    settingsWindow = new electron_1.BrowserWindow({
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
electron_1.ipcMain.on('transcription-result', async (event, text) => {
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
    }
    catch (error) {
        console.error("Failed to fetch from Groq:", error);
        teleprompterWindow?.webContents.send('set-prompter-text', `Error: ${error.message}`);
    }
});
electron_1.ipcMain.on('save-settings', (event, newSettings) => {
    config.settings = { ...config.settings, ...newSettings };
    saveConfig();
    if (teleprompterWindow) {
        teleprompterWindow.webContents.send('update-settings', config.settings);
    }
});
electron_1.ipcMain.on('save-hotkeys', (event, newHotkeys) => {
    config.hotkeys = { ...config.hotkeys, ...newHotkeys };
    saveConfig();
    registerHotkeys(); // Re-register with new bindings
});
electron_1.app.on('ready', () => {
    if (electron_1.app.dock) {
        electron_1.app.dock.hide();
    }
    electron_1.session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === 'media') {
            // Approving microphone permission automatically
            callback(true);
        }
        else {
            callback(false);
        }
    });
    loadConfig();
    createTeleprompterWindow();
    createTranscriptionWindow();
    registerHotkeys();
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('will-quit', () => {
    electron_1.globalShortcut.unregisterAll();
});
electron_1.app.on('activate', () => {
    if (teleprompterWindow === null) {
        createTeleprompterWindow();
    }
});
