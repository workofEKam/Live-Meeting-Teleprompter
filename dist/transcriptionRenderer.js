"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const transcriptionDiv = document.getElementById('transcription-text');
let accumulatedText = "";
function updateDisplay() {
    transcriptionDiv.innerHTML = accumulatedText;
    window.scrollTo(0, document.body.scrollHeight);
}
let mediaRecorder = null;
let recordingInterval = null;
async function startAudioCapture() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorder.ondataavailable = async (event) => {
            if (event.data.size > 0) {
                const buffer = await event.data.arrayBuffer();
                electron_1.ipcRenderer.send('audio-chunk', Buffer.from(buffer));
            }
        };
        mediaRecorder.start();
        // Stop and start every 5 seconds to create discrete chunks
        recordingInterval = setInterval(() => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                mediaRecorder.start();
            }
        }, 5000);
    }
    catch (err) {
        console.error("Microphone access denied or error:", err);
        transcriptionDiv.innerText = "Please grant microphone permissions in System Settings.";
    }
}
startAudioCapture();
electron_1.ipcRenderer.on('transcription-chunk-result', (event, text) => {
    if (text) {
        accumulatedText += text + " ";
        updateDisplay();
    }
});
// Handle request from main process to get transcription for Groq
electron_1.ipcRenderer.on('get-transcription', () => {
    const fullText = accumulatedText.trim();
    electron_1.ipcRenderer.send('transcription-result', fullText);
    accumulatedText = ""; // Clear buffer
    updateDisplay();
});
