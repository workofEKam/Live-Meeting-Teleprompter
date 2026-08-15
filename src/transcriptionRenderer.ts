import { ipcRenderer } from 'electron';

const transcriptionDiv = document.getElementById('transcription-text') as HTMLDivElement;

let accumulatedText = "";
let currentInterim = "";

function updateDisplay() {
    transcriptionDiv.innerHTML = accumulatedText + '<span class="interim">' + currentInterim + '</span>';
    window.scrollTo(0, document.body.scrollHeight);
}

// Check for Web Speech API support
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

async function startSpeechRecognition() {
    if (!SpeechRecognition) {
        transcriptionDiv.innerText = "Web Speech API is not supported in this environment.";
        return;
    }

    try {
        // Explicitly request microphone access to trigger macOS permission prompt and initialize audio engine properly
        await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
        console.error("Microphone access denied or error:", err);
        transcriptionDiv.innerText = "Please grant microphone permissions in System Settings.";
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        if (finalTranscript) {
            accumulatedText += finalTranscript + " ";
        }
        currentInterim = interimTranscript;
        updateDisplay();
    };

    recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        // Do not display error text for common non-fatal errors like 'no-speech'
        if (event.error !== 'no-speech') {
            console.warn(`Speech recognition stopped due to error: ${event.error}`);
        }
    };

    recognition.onend = () => {
        // Automatically restart if it stops
        console.log("Speech recognition ended, restarting...");
        try {
            recognition.start();
        } catch(e) {
            console.error("Failed to restart recognition", e);
        }
    };

    // Start immediately
    try {
        recognition.start();
    } catch(e) {
        console.error("Failed to start recognition", e);
    }
}

startSpeechRecognition();

// Handle request from main process to get transcription for Groq
ipcRenderer.on('get-transcription', () => {
    // Combine accumulated and current interim text
    const fullText = (accumulatedText + currentInterim).trim();

    // Send back to main process
    ipcRenderer.send('transcription-result', fullText);

    // Clear buffer for the next question
    accumulatedText = "";
    currentInterim = "";
    updateDisplay();
});
