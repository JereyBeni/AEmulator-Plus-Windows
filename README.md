<div align="center">

# AEmulator Plus for Windows

**A standalone Windows desktop frontend for managing Android firmware experiments.**

Material-inspired interface · Firmware library · QEMU integration groundwork

</div>

---

AEmulator Plus for Windows is a desktop application built with **Electron, React and TypeScript**. It is a separate Windows application, not an Android APK running inside a wrapper.

The goal is to bring the AEmulator family workflow to Windows: keep firmware files in a local library, configure guest preferences, and provide a desktop interface for a future Windows-native Android emulation engine.

## Current features

- **Firmware library:** add and remove firmware files, search the collection, create folders, and reorder entries.
- **Material-inspired interface:** tonal colors, rounded controls, responsive navigation, and light/dark appearance.
- **Settings:** configurable accent color, dark theme, VM screen theme, engine directory, and guest preferences.
- **Dalvik JIT:** enabled by default.
- **Phone GPU acceleration:** enabled by default.
- **Related projects:** direct links to AEmulator Plus, AEmulator Sunset, and the original AEmulator.
- **Local data:** firmware library and settings are stored in the Windows user-data directory.

> **Emulation status:** the Windows UI and firmware library are desktop-native. The Android guest engine is not yet fully ported from Android. The current QEMU process hook is experimental; it does not establish compatibility with arbitrary Android firmware. The Dalvik JIT and phone-GPU switches are saved preferences and are not yet wired into a Windows guest engine.

## Run on Windows

### Requirements

- Windows 10 or Windows 11 (64-bit)
- Node.js 20 or newer
- npm (included with Node.js)

### Start the application

PowerShell:

    cd windows
    npm install
    npm start

### Build a portable Windows package

    cd windows
    npm install
    npm run dist:win

The portable ZIP is generated in `windows/dist/`.

## Project structure

- `windows/src/main/`: Electron main process, local persistence, file dialogs and IPC.
- `windows/src/renderer/`: React interface and Material-inspired styling.
- `windows/package.json`: dependencies and Windows packaging configuration.

## Roadmap

1. Complete the Windows firmware inspection and import pipeline.
2. Port the patched QEMU guest engine and Android-specific host bridges.
3. Connect Dalvik JIT and GPU preferences to the guest configuration.
4. Implement reliable VM lifecycle, display, input, audio and storage integration.
5. Add Windows packaging and automated smoke tests.

## Related projects and credits

- **AEmulator Plus (original Android fork):** https://github.com/somerandomusernam2/AEmulator-Plus
- **AEmulator Sunset:** https://github.com/drel4/AEmulator-Sunset
- **Original AEmulator:** https://github.com/uxazu/AEmulator

AEmulator Plus is derived from the AEmulator family. This Windows desktop frontend is a separate implementation and does not claim authorship of the upstream Android engine.

## License

This project is distributed under GPL-3.0. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md). Firmware images are not included and remain the responsibility of their respective owners.
