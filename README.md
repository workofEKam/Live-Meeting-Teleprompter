# Teleprompter App with Live AI Assistant

This is an Electron-based teleprompter application that integrates a local speech-to-text engine and the Groq LLM API to provide live AI assistance during your meetings or recordings.

## Features
- **Transparent & Frameless Teleprompter**: Stays on top and visible across all macOS spaces.
- **Live Local Transcription**: Captures your audio locally using the `whisper-node` wrapper around `whisper.cpp`. No audio is sent to the cloud for transcription.
- **Ask Groq**: A customizable hotkey allows you to send the recently transcribed text to the Groq API (using Llama 3) along with a custom system prompt. The AI's response is instantly displayed on your teleprompter.
- **Dark Mode Settings UI**: A high-fidelity, glassmorphic settings panel to configure transparency, colors, hotkeys, and API keys.

## Setup Instructions

### 1. Install Dependencies
Ensure you have Node.js installed.
```bash
npm install
```

### 2. Setup Local Whisper Model
This app uses a local Whisper model to transcribe audio. To initialize the C++ bindings and download the required tiny English model, you must run the provided script from `whisper-node`:

```bash
# Navigate to the whisper.cpp lib folder inside node_modules
cd node_modules/whisper-node/lib/whisper.cpp

# Download the tiny.en model (approx 75MB)
bash ./models/download-ggml-model.sh tiny.en

# Go back to the project root
cd ../../../..

# Copy the model to the expected directory at the project root
mkdir -p models
cp node_modules/whisper-node/lib/whisper.cpp/models/ggml-tiny.en.bin models/
```

*Note: The app specifically looks for the model at `./models/ggml-tiny.en.bin` relative to the execution directory.*

### 3. Build & Run
Compile the TypeScript code and start the Electron app:
```bash
npm run build
npm start &
```

### 4. Configuration
1. Press `Cmd+Opt+S` (default) to open the Settings window.
2. Enter your Groq API Key.
3. Configure your System Prompt (Context) for how the AI should answer.
4. Record your custom hotkeys, particularly the "Ask Groq" hotkey.

## How to use the Live Assistant
1. Ensure the "Live Transcription" window is visible and updating as you speak.
2. When a question is asked during your meeting, press your configured "Ask Groq" hotkey.
3. The app will grab the current transcription buffer, send it to Groq, and display the answer directly on your teleprompter screen.
