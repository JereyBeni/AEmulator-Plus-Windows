<div align="center">

# AEmulator Plus for Windows

**A standalone Windows desktop frontend for Android firmware experiments.**

Material-inspired interface · Firmware library · QEMU Android-x86 backend

</div>

---

AEmulator Plus for Windows is built with **Electron, React and TypeScript**. It is a native Windows desktop application, not an Android APK wrapper.

## Current features

- Firmware library with import, search, folders, reorder and remove.
- Material-inspired desktop interface with light/dark themes.
- Dalvik JIT and phone GPU preferences enabled by default.
- About page linking AEmulator Plus, AEmulator Sunset and the original AEmulator.
- **QEMU x86_64 backend:** boots Android-x86 ISO images, creates a persistent 8 GB QCOW2 disk, and boots the installed system from disk on later launches.
- Configurable QEMU executable and guest RAM (1, 1.5 or 2 GB).

## Run Android

The first working backend targets **Android-x86**. QEMU emulates a standard x86 PC, which Android-x86 is designed to boot on.

1. Install a [Windows build of QEMU](https://www.qemu.org/download/) that includes both `qemu-system-x86_64.exe` and `qemu-img.exe`.
2. Download an [Android-x86 ISO](https://www.android-x86.org/download).
3. Open AEmulator Plus and go to **Settings → QEMU para Android-x86**.
4. Select `qemu-system-x86_64.exe`. Keep `qemu-img.exe` in the same folder.
5. Import the Android-x86 ISO using **Add firmware**.
6. Press **Iniciar**. On first boot, choose the Android-x86 installation option and install to the offered 8 GB virtual disk.
7. Shut down the guest normally. Later launches boot from its persistent virtual disk.

Virtual disks are stored under the app's user-data folder in `vms/`. Removing a firmware entry from the library does not delete its virtual disk.

### QEMU configuration

- Machine: PC/i440FX
- CPU: QEMU x86_64
- Accelerator: TCG by default; optional WHPX hardware virtualization on supported Windows/QEMU installations
- RAM: 1.5 GB by default, configurable up to 2 GB
- Graphics: standard VGA
- Storage: persistent QCOW2 disk + source ISO
- Network: user-mode networking with an emulated Intel E1000 adapter
- Input: USB tablet

TCG can be slow because it emulates the CPU in software. WHPX can accelerate CPU virtualization when the Windows Hypervisor Platform feature and a WHPX-enabled QEMU build are available. Neither option provides phone-GPU passthrough; standard VGA is not 3D acceleration.

## Important compatibility boundary

QEMU supports different CPU architectures and virtual boards, but an Android firmware must contain a kernel and drivers for the machine being emulated. An Android-x86 ISO can boot as a PC guest. A random ARM phone ROM (`.zip`, `.sbf`, `.pac`, `.nbh`, or a vendor `.img`) cannot be passed to the x86 PC machine and expected to boot.

Running ARM phone firmware needs a compatible ARM board model, matching kernel/device drivers, boot image unpacking, and Android hardware services. QEMU's generic ARM `virt` board is not a drop-in replacement for a real phone motherboard. The Android emulator's Goldfish/Ranchu device models are a separate integration target.

The Dalvik JIT and phone GPU switches remain saved guest preferences. They are not currently wired to Android-x86's guest properties or to 3D acceleration.

## Development

Requirements: Windows 10/11 x64, Node.js 20+, npm.

    cd windows
    npm install
    npm start

Build a portable Windows ZIP:

    npm run dist:win

## Related projects

- [AEmulator Plus (original Android fork)](https://github.com/somerandomusernam2/AEmulator-Plus)
- [AEmulator Sunset](https://github.com/drel4/AEmulator-Sunset)
- [Original AEmulator](https://github.com/uxazu/AEmulator)

This Windows frontend is a separate desktop implementation. Firmware images are not bundled; use files you are permitted to use.

## License

GPL-3.0. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).
