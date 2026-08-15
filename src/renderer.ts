import { ipcRenderer } from 'electron';

const textArea = document.getElementById('prompter-text') as HTMLTextAreaElement;
let scrollInterval: any = null;
let currentScrollSpeed = 0; // 0 means stopped
const BASE_SCROLL_AMOUNT = 2; // Pixels per interval when auto-scrolling
const MANUAL_SCROLL_AMOUNT = 50;

// Listen for scroll commands from main process (triggered by global hotkeys)
ipcRenderer.on('scroll-up', () => {
  textArea.scrollTop -= MANUAL_SCROLL_AMOUNT;
});

ipcRenderer.on('scroll-down', () => {
  textArea.scrollTop += MANUAL_SCROLL_AMOUNT;
});

ipcRenderer.on('toggle-auto-scroll', () => {
  if (scrollInterval) {
    clearInterval(scrollInterval);
    scrollInterval = null;
  } else {
    scrollInterval = setInterval(() => {
      textArea.scrollTop += BASE_SCROLL_AMOUNT;
    }, 50);
  }
});

ipcRenderer.on('update-settings', (event, settings) => {
  if (settings.transparency !== undefined) {
    document.body.style.backgroundColor = `rgba(0, 0, 0, ${settings.transparency})`;
  }
  if (settings.fontSize !== undefined) {
    textArea.style.fontSize = `${settings.fontSize}px`;
  }
  if (settings.fontColor !== undefined) {
    textArea.style.color = settings.fontColor;
  }
});

// Update initial setup
console.log('Renderer started, listening for IPC.');
