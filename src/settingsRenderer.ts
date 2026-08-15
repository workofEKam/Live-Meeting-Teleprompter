import { ipcRenderer } from 'electron';

const transparencyInput = document.getElementById('transparency') as HTMLInputElement;
const transparencyVal = document.getElementById('transparency-val') as HTMLDivElement;
const fontSizeInput = document.getElementById('fontSize') as HTMLInputElement;
const fontColorInput = document.getElementById('fontColor') as HTMLInputElement;
const groqApiKeyInput = document.getElementById('groqApiKey') as HTMLInputElement;
const groqContextInput = document.getElementById('groqContext') as HTMLTextAreaElement;


// Debounce helper
function debounce(func: Function, wait: number) {
  let timeout: any;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const sendSettingsUpdate = debounce(() => {
  const settings = {
    transparency: parseFloat(transparencyInput.value),
    fontSize: parseInt(fontSizeInput.value, 10),
    fontColor: fontColorInput.value,
    groqApiKey: groqApiKeyInput.value,
    groqContext: groqContextInput.value,
  };
  ipcRenderer.send('save-settings', settings);
}, 200);

transparencyInput.addEventListener('input', () => {
  transparencyVal.innerText = transparencyInput.value;
  sendSettingsUpdate();
});

fontSizeInput.addEventListener('input', sendSettingsUpdate);
fontColorInput.addEventListener('input', sendSettingsUpdate);
groqApiKeyInput.addEventListener('input', sendSettingsUpdate);
groqContextInput.addEventListener('input', sendSettingsUpdate);


// Hotkey Recording Logic
let isRecording = false;
let currentTargetId: string | null = null;

(window as any).recordHotkey = (targetId: string) => {
  if (isRecording) return;
  isRecording = true;
  currentTargetId = targetId;
  const input = document.getElementById(targetId) as HTMLInputElement;
  input.value = "Press keys...";
  input.focus();
};

document.addEventListener('keydown', (e) => {
  if (!isRecording || !currentTargetId) return;
  e.preventDefault();

  // Ignore bare modifier presses
  if (['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) {
      return;
  }

  let keys = [];
  if (e.metaKey) keys.push('Command');
  if (e.ctrlKey) keys.push('Control');
  if (e.altKey) keys.push('Option');
  if (e.shiftKey) keys.push('Shift');

  // Convert key names for Electron
  let mainKey = e.key.toUpperCase();
  if (mainKey === ' ') mainKey = 'Space';
  else if (mainKey === 'ARROWUP') mainKey = 'Up';
  else if (mainKey === 'ARROWDOWN') mainKey = 'Down';
  else if (mainKey === 'ARROWLEFT') mainKey = 'Left';
  else if (mainKey === 'ARROWRIGHT') mainKey = 'Right';

  keys.push(mainKey);
  const hotkeyString = keys.join('+');

  const input = document.getElementById(currentTargetId) as HTMLInputElement;
  input.value = hotkeyString;

  isRecording = false;
  currentTargetId = null;

  // Send new hotkeys to main process
  const hotkeys = {
    up: (document.getElementById('hk-up') as HTMLInputElement).value,
    down: (document.getElementById('hk-down') as HTMLInputElement).value,
    auto: (document.getElementById('hk-auto') as HTMLInputElement).value,
    settings: (document.getElementById('hk-settings') as HTMLInputElement).value,
    askGroq: (document.getElementById('hk-askGroq') as HTMLInputElement).value,
  };
  ipcRenderer.send('save-hotkeys', hotkeys);
});

// Load initial settings
ipcRenderer.on('load-settings', (event, data) => {
    if (data.settings) {
        if (data.settings.transparency !== undefined) {
            transparencyInput.value = data.settings.transparency.toString();
            transparencyVal.innerText = transparencyInput.value;
        }
        if (data.settings.fontSize !== undefined) {
            fontSizeInput.value = data.settings.fontSize.toString();
        }
        if (data.settings.fontColor !== undefined) {
            fontColorInput.value = data.settings.fontColor;
        }
        if (data.settings.groqApiKey !== undefined) {
            groqApiKeyInput.value = data.settings.groqApiKey;
        }
        if (data.settings.groqContext !== undefined) {
            groqContextInput.value = data.settings.groqContext;
        }
    }
    if (data.hotkeys) {
        if (data.hotkeys.up) (document.getElementById('hk-up') as HTMLInputElement).value = data.hotkeys.up;
        if (data.hotkeys.down) (document.getElementById('hk-down') as HTMLInputElement).value = data.hotkeys.down;
        if (data.hotkeys.auto) (document.getElementById('hk-auto') as HTMLInputElement).value = data.hotkeys.auto;
        if (data.hotkeys.settings) (document.getElementById('hk-settings') as HTMLInputElement).value = data.hotkeys.settings;
        if (data.hotkeys.askGroq) (document.getElementById('hk-askGroq') as HTMLInputElement).value = data.hotkeys.askGroq;
    }
});

