# Mock Test Hub for Windows

A Tauri 2 app that shows https://mocktesthub.vercel.app in its own window, for
Windows x64 (Intel/AMD) and ARM64 (Snapdragon X).

## What it adds to the website

- **Exam mode** while a mock test, CBAT or typing test runs (the website calls
  `set_exam_mode`): full screen, hidden from screenshots and screen recording, and
  refresh / back / zoom / find / print keys switched off. Every new page load
  switches it off again; test pages switch it back on.
- **Notifications**, even with the window closed (the app stays in the tray):
  new job notices (checked every 30 minutes) and saved jobs whose last date is
  within 3 days. Logic lives in `web/app/components/DesktopBridge.tsx`.
- **Tray icon**: Open, Reload, Start with Windows, Quit. Closing the window hides it.
- One copy at a time; other websites open in the normal browser; Google sign-in
  opens in an in-app popup.
- A start page (`dist/index.html`) with an offline screen and Retry.

The website gets only two app features (`src-tauri/capabilities/site.json`):
exam mode and notifications. No file or shell access.

## Requirements

- Node.js, Rust (`rustup`) with targets `aarch64-pc-windows-msvc` and `x86_64-pc-windows-msvc`
- Visual Studio Build Tools with "MSVC C++ x64/x86" and "MSVC C++ ARM64" build tools

## Commands

```
npm install
npm run build:arm64      # Snapdragon X  -> src-tauri/target/aarch64-pc-windows-msvc/release/bundle/nsis/
npm run build:x64        # Intel / AMD   -> src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/
npm run icons            # regenerate icons from app-icon.svg
```

### QA test app (local website, nothing goes live)

`npm run build:qa` builds **Mock Test Hub QA** (`src-tauri/tauri.qa.conf.json`): a separate app
(own name, data and tray icon) that opens the website running on this PC, `http://localhost:3000`.
Start the website first (`cd web && npm run dev`); if it isn't running, the app says so.
Installer: `src-tauri/target/aarch64-pc-windows-msvc/release/bundle/nsis/Mock Test Hub QA_*_arm64-setup.exe`.
`MTH_QA_URL` overrides the address. It uses the real database, so data changes are real.

Testing a debug build against a local copy of the website:

```
cd src-tauri
set MTH_DEV_URL=http://localhost:3000/
cargo run
```

## Releasing

- The website's desktop features (`desktopApp.ts`, `DesktopBridge.tsx`) must be deployed
  before they work in the app — the app loads the live site.
- Unsigned installers show a Windows SmartScreen "unknown publisher" warning. Sign them
  with a code-signing certificate, or publish through the Microsoft Store.
