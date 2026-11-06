# Windows QEMU preview

This folder contains the first Windows-side proof of concept for launching an Android guest through QEMU.

## Requirements

- Windows 10 or Windows 11, 64-bit.
- A Windows x64 build of QEMU with `qemu-system-x86_64.exe`.
- An Android-x86 / x86_64 bootable ISO.
- Optional: Windows Hypervisor Platform for WHPX acceleration.

## Start an Android ISO

From the repository root:

```powershell
.\windows\qemu\Start-AndroidVM.ps1 -BootIso "C:\Images\android-x86.iso"
```

Attach an existing virtual disk:

```powershell
.\windows\qemu\Start-AndroidVM.ps1 `
  -BootIso "C:\Images\android-x86.iso" `
  -DiskImage "C:\VMs\Android\data.qcow2" `
  -MemoryMB 4096 -CpuCount 4
```

If QEMU is not in PATH, provide its executable explicitly:

```powershell
.\windows\qemu\Start-AndroidVM.ps1 `
  -QemuPath "C:\Program Files\qemu\qemu-system-x86_64.exe" `
  -BootIso "C:\Images\android-x86.iso"
```

## Acceleration

The runner defaults to `WHPX`. If the Windows Hypervisor Platform or the installed QEMU build does not support it, select software emulation:

```powershell
.\windows\qemu\Start-AndroidVM.ps1 -BootIso "C:\Images\android-x86.iso" -Acceleration tcg
```

WHPX uses the Windows hypervisor interface. TCG is more portable but can be substantially slower. Guest performance also depends on the Android image and its drivers.

## Current limits

- This runner boots x86_64 Android images. It does not boot arbitrary ARM phone firmware.
- The ISO is attached as a virtual CD-ROM. The script does not install Android or create a disk image automatically.
- If you provide `-DiskImage`, that existing disk is attached as a VirtIO block device. Create it separately with `qemu-img` if needed.
- VirtIO graphics are exposed as a basic virtual display. 3D acceleration is not guaranteed.
- Networking uses QEMU user-mode NAT. It is not bridged networking.
- Snapshot management, USB passthrough, audio tuning and a graphical device manager are future work.

Keep a backup of important virtual disks. Do not point the runner at a physical disk or a real phone's storage.
