# Interview Copilot

A Windows-first desktop MVP for interview practice. The Electron app talks to a local ASP.NET Core API, which stores interview session metadata in SQLite and streams mock answers over a WebSocket.

## Requirements

- Windows 10 or later
- Node.js 20.19+ (or 22.12+) and npm
- .NET 10 SDK

## Install

From the repository root, install the desktop dependencies and restore the .NET projects:

```powershell
npm install
dotnet restore backend/InterviewCopilot.Tests/InterviewCopilot.Tests.csproj
```

## Run the desktop app

```powershell
npm run dev
```

This starts the Vite UI, the local API at `http://127.0.0.1:5187`, and the Electron desktop window. The API binds to loopback only. The first run creates `%LOCALAPPDATA%\InterviewCopilot\interviews.db`.

## Run checks

```powershell
npm test
npm run typecheck
npm run build
```

## MVP behavior and privacy

- Select a target role and optionally choose a PDF, DOCX, or TXT resume up to 10 MB.
- The resume file is not uploaded or copied: only its filename is included in the locally stored interview metadata.
- Starting practice creates a SQLite session and retrieves role-specific mock questions from the local API.
- Sample AI answers are streamed into the interview screen over WebSockets.
- Audio recording and transcription are not enabled. The speech-to-text provider interface is a future integration point; microphone access is not requested.
- OpenAI and AssemblyAI credentials are not required or stored by this MVP. Future provider implementations should read credentials from user-managed configuration or environment variables.

## Project layout

```text
backend/
  InterviewCopilot.Api/       ASP.NET Core API, SQLite repository, provider interfaces
  InterviewCopilot.Tests/     Automated .NET tests
electron/                     Main process and context-isolated preload
src/                          React desktop interface
```
