import { ipcRenderer } from 'electron';

const transcriptionDiv = document.getElementById('transcription-text') as HTMLDivElement;

let accumulatedText = "";

function updateDisplay() {
    transcriptionDiv.innerHTML = accumulatedText;
    window.scrollTo(0, document.body.scrollHeight);
}

let mediaRecorder: MediaRecorder | null = null;
let recordingInterval: any = null;

async function startAudioCapture() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

        mediaRecorder.ondataavailable = async (event) => {
            if (event.data.size > 0) {
                const buffer = await event.data.arrayBuffer();
                ipcRenderer.send('audio-chunk', Buffer.from(buffer));
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

    } catch (err) {
        console.error("Microphone access denied or error:", err);
        transcriptionDiv.innerText = "Please grant microphone permissions in System Settings.";
    }
}

startAudioCapture();

ipcRenderer.on('transcription-chunk-result', (event, text) => {
    if (text) {
        accumulatedText += text + " ";
        updateDisplay();
    }
});

// Handle request from main process to get transcription for Groq
ipcRenderer.on('get-transcription', () => {
    const fullText = accumulatedText.trim();
    ipcRenderer.send('transcription-result', fullText);
    accumulatedText = ""; // Clear buffer
    updateDisplay();
});
