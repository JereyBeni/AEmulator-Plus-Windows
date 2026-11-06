# AEmulator Plus for Windows

Electron + React + TypeScript desktop frontend with an initial QEMU Android-x86 backend.

## Requirements

- Windows 10/11 x64
- Node.js 20+
- A Windows QEMU build containing `qemu-system-x86_64.exe` and `qemu-img.exe`

## Run

    cd windows
    npm install
    npm start

## Configure QEMU

1. Install [QEMU for Windows](https://www.qemu.org/download/) with `qemu-system-x86_64.exe` and `qemu-img.exe`.
2. Download an [Android-x86 ISO](https://www.android-x86.org/download).
3. In Settings, choose `qemu-system-x86_64.exe`.
4. Keep `qemu-img.exe` in the same directory.
5. Import the Android-x86 ISO and press Start.
6. First boot creates an 8 GB QCOW2 disk and boots the ISO installer.
7. Install Android-x86 to that virtual disk. Subsequent launches boot from the disk.

The disk is stored in Electron's user-data directory under `vms/<firmware-id>.qcow2`.

## Virtual hardware

- x86_64 PC machine
- TCG software CPU emulation by default, optional WHPX acceleration
- 1.5 GB RAM default (configurable 1-2 GB)
- Standard VGA
- IDE QCOW2 disk
- E1000 user-mode networking
- USB tablet input

TCG favors compatibility but can be slow. WHPX can accelerate CPU virtualization if enabled in Windows and supported by the QEMU build. Standard VGA does not provide 3D acceleration.

## Compatibility

This backend boots Android-x86 PC ISO images. It does **not** directly boot arbitrary ARM phone firmware archives such as ZIP, SBF, PAC, NBH or vendor IMG files. Those require an appropriate emulated phone board, matching kernel/drivers, and Android boot-image integration. QEMU's generic ARM `virt` board is not interchangeable with a real phone motherboard.

Dalvik JIT and phone GPU preferences are persisted, but they are not yet applied to guest Android settings or hardware acceleration.

## Related projects

- https://github.com/somerandomusernam2/AEmulator-Plus
- https://github.com/drel4/AEmulator-Sunset
- https://github.com/uxazu/AEmulator
