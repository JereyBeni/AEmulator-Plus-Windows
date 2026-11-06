# AEmulator Plus for Windows

A standalone Windows desktop application built with Electron, React and TypeScript. It is not an Android APK wrapper.

## Requirements

- Windows 10 or Windows 11, 64-bit
- Node.js 20 or newer
- npm

## Development

    cd windows
    npm install
    npm start

## Build

    npm run dist:win

The portable Windows ZIP is written to `dist/`.

## Included desktop features

- Firmware library with Add firmware, search, folders, reorder and remove.
- Material-inspired responsive interface.
- Settings for accent color, dark mode and VM screen theme.
- Dalvik JIT enabled by default.
- Phone GPU acceleration enabled by default.
- Persistent firmware library and settings.
- About page with links to AEmulator Plus, AEmulator Sunset and original AEmulator.

## QEMU and guest-engine status

The Electron main process includes an experimental external QEMU process hook. The complete Android guest engine has **not** been ported to Windows yet. The current launcher is not proof that every firmware format boots correctly.

The Dalvik JIT and phone-GPU settings are persisted as defaults for the planned Windows guest engine. They are not yet connected to a Windows-native guest runtime or graphics bridge.

The Android application depends on patched QEMU binaries, firmware extraction and repair code, Binder compatibility, and graphics/audio bridges. These Android-host-specific components need Windows-native replacements before the same ARM firmware can boot reliably on Windows.

Firmware is not bundled. Import only files you are permitted to use.
