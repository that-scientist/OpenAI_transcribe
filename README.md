# Transcribe Audio

A modern web UI for OpenAI's Whisper API that allows you to transcribe audio files to text.

## Features

- **Current API Support**: Uses the latest OpenAI Whisper API (whisper-1 model)
- **Multiple Formats**: Supports mp3, mp4, mpeg, mpga, m4a, wav, webm audio/video files
- **Language Support**: Automatic language detection or manual selection from 50+ languages
- **Output Formats**: Normal text, SRT subtitles, or VTT captions
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **File Validation**: Automatic file size validation (25MB limit)
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Mode**: Automatic dark mode support

## Usage

1. Get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/account/api-keys)
2. Enter your API key in the application
3. Select your preferred language (optional)
4. Choose output format
5. Upload an audio file (max 25MB)
6. View your transcription

## Technical Details

- **API Endpoint**: `https://api.openai.com/v1/audio/transcriptions`
- **Model**: `whisper-1` (latest stable version)
- **File Size Limit**: 25MB per file
- **Supported Languages**: 50+ languages including automatic detection

## Security

- API keys are stored locally in your browser's localStorage
- No server-side processing - all requests go directly to OpenAI
- API keys are never sent to any third-party servers

## Development

This is a client-side only application. To run locally:

1. Clone the repository
2. Open `src/index.html` in a web browser
3. Or serve the files using a local web server

## API Documentation

For more information about the Whisper API, visit the [OpenAI Speech-to-Text documentation](https://platform.openai.com/docs/guides/speech-to-text).