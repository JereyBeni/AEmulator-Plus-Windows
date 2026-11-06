<div align="center">

<img src="docs/assets/logo.png" width="128" alt="AEmulator Plus logo"/>

# AEmulator Plus for Windows

**Android firmware emulation, brought to the Windows desktop.**

A Windows-focused continuation of AEmulator Plus, preserving its firmware research and guest-compatibility work while building a native PC host around QEMU.

<sub>Windows 10 · Windows 11 · x64</sub>

</div>

---

> [!IMPORTANT]
> **Windows port status: early development.** The current repository is based on the Android application and its ARM guest support. A complete native Windows desktop application is not available yet. The QEMU launcher in `windows/qemu/` is an experimental starting point for booting Android-x86 images, not a replacement for the Android firmware engine.

## What is AEmulator Plus?

AEmulator Plus is a firmware-emulation project focused on running Android systems from firmware images. The Windows effort aims to bring that experience to a desktop PC: a resizable emulator window, configurable virtual hardware, keyboard and mouse input, and a managed library of Android devices.

The original Android implementation and its firmware research remain preserved in [README-ANDROID.md](README-ANDROID.md).

## Planned features

- **Android device profiles:** create, configure, duplicate and organize virtual devices.
- **QEMU backend:** use QEMU System Emulator to run supported Android guest images.
- **Desktop controls:** keyboard, mouse, display scaling, rotation and virtual device buttons.
- **PC-aware performance:** configurable CPU cores, memory, graphics backend and disk caching.
- **Firmware library:** import and inspect supported Android images without modifying the originals.
- **Device storage:** persistent virtual disks, snapshots and shared folders.
- **Diagnostics:** QEMU command line, boot logs and per-device configuration.

## Windows QEMU preview

The first experimental runner targets **Android-x86 / x86_64 bootable ISO and disk images**.

1. Install a Windows build of [QEMU](https://www.qemu.org/download/#windows).
2. If you want hardware-assisted virtualization, enable the **Windows Hypervisor Platform** optional feature and reboot.
3. Open PowerShell in the repository.
4. Run:

```powershell
.\windows\qemu\Start-AndroidVM.ps1 -BootIso "C:\Images\android-x86.iso"
```

To attach a persistent virtual disk as well:

```powershell
.\windows\qemu\Start-AndroidVM.ps1 `
  -BootIso "C:\Images\android-x86.iso" `
  -DiskImage "C:\VMs\Android\data.qcow2" `
  -MemoryMB 4096 -CpuCount 4
```

See [Windows QEMU instructions](windows/README.md) for options and limitations.

## PC optimization goals

| Area | Windows direction |
|---|---|
| CPU | WHPX acceleration when available; TCG fallback for compatibility |
| Memory | User-configurable guest RAM with conservative defaults |
| Graphics | VirtIO display first; optional accelerated display only when the QEMU build supports it |
| Storage | QCOW2 for expandable disks; raw images when throughput matters |
| Input | Native keyboard and mouse, with configurable Android key mapping |
| Background work | Avoid busy polling; use event-driven process and log handling |

The host should stay responsive while the guest runs. Settings will be per-device rather than global so lightweight Android builds do not need to reserve resources intended for larger guests.

## Supported systems

- **Host:** Windows 10/11 x64 (target)
- **QEMU preview guest:** Android-x86 / x86_64 images
- **ARM Android firmware:** research and integration work remains; arbitrary phone firmware is not currently bootable through the Windows preview runner.

QEMU machine compatibility depends on the guest kernel, bootloader, device tree and virtual hardware drivers. A phone's vendor firmware is not automatically compatible with a generic PC virtual machine.

## Project layout

```text
windows/
  README.md
  qemu/
    Start-AndroidVM.ps1
docs/
  windows-architecture.md
README-ANDROID.md
```

## Build status

The existing Android app uses Kotlin, Jetpack Compose, Android NDK components and Android-specific guest bridges. Those components cannot be turned into a Windows executable by changing the Gradle target alone.

The Windows desktop host will need its own UI/process layer and a Windows-compatible QEMU integration. The current work establishes the Windows documentation and a small PowerShell QEMU proof of concept; it does not yet build a native desktop GUI.

## Credits

AEmulator Plus builds on the work of the [original AEmulator project](https://github.com/uxazu/AEmulator) and [AEmulator-Sunset](https://github.com/drel4/AEmulator-Sunset). See [NOTICE.md](NOTICE.md) for modification and attribution details.

## License

GPL-3.0. Android, QEMU, trademarks, firmware and other third-party components remain subject to their respective owners' licenses. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).
