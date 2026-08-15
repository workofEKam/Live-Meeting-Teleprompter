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
const configPath = path.join(electron_1.app.getPath('userData'), 'config.json');
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
    teleprompterWindow.loadFile(path.join(__dirname, '../src/index.html'));
    teleprompterWindow.webContents.on('did-finish-load', () => {
        teleprompterWindow?.webContents.send('update-settings', config.settings);
    });
    teleprompterWindow.on('closed', () => {
        teleprompterWindow = null;
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
    loadConfig();
    createTeleprompterWindow();
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
