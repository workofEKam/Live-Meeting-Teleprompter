"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const transcriptionDiv = document.getElementById('transcription-text');
let accumulatedText = "";
let currentInterim = "";
function updateDisplay() {
    transcriptionDiv.innerHTML = accumulatedText + '<span class="interim">' + currentInterim + '</span>';
    window.scrollTo(0, document.body.scrollHeight);
}
// Check for Web Speech API support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            }
            else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        if (finalTranscript) {
            accumulatedText += finalTranscript + " ";
        }
        currentInterim = interimTranscript;
        updateDisplay();
    };
    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
    };
    recognition.onend = () => {
        // Automatically restart if it stops (unless we intentionally stopped it, but we won't for this use case)
        console.log("Speech recognition ended, restarting...");
        recognition.start();
    };
    // Start immediately
    recognition.start();
}
else {
    transcriptionDiv.innerText = "Web Speech API is not supported in this environment.";
}
// Handle request from main process to get transcription for Groq
electron_1.ipcRenderer.on('get-transcription', () => {
    // Combine accumulated and current interim text
    const fullText = (accumulatedText + currentInterim).trim();
    // Send back to main process
    electron_1.ipcRenderer.send('transcription-result', fullText);
    // Clear buffer for the next question
    accumulatedText = "";
    currentInterim = "";
    updateDisplay();
});
