# Windows port architecture

## Current baseline

The repository currently contains an Android application built with Kotlin and Jetpack Compose, Android SDK/NDK components, and bundled guest-side engine assets. The Android app build configuration targets Android API 26+ and packages ARM64 native libraries. This is not a Windows desktop application.

The Windows port should be treated as a separate host implementation that reuses compatible firmware parsing and research where licensing and platform dependencies allow it.

## Proposed layers

```text
Windows desktop UI
       |
Device/profile manager
       |
VM lifecycle + configuration
       |
QEMU process adapter
       |
QEMU System Emulator
       |
Android guest (initially Android-x86_64)
```

### 1. Desktop UI

A native Windows desktop shell should own the device library, settings, display window, keyboard/mouse mapping and log viewer. The UI must not block while QEMU boots or runs.

### 2. Device profiles

Store each VM's configuration separately: guest architecture, machine type, CPU count, RAM, display, disk paths, network mode and QEMU arguments. Validate paths and numeric limits before launching a process.

### 3. QEMU process adapter

Start QEMU as a child process with an argument array, not by concatenating user input into a shell command. Track process exit, capture stdout/stderr, support graceful shutdown, and terminate only the process owned by the selected VM.

### 4. Guest compatibility

The first Windows proof of concept targets Android-x86_64 on a PC-style virtual machine. ARM Android firmware is a separate compatibility problem: phone images may depend on a vendor boot chain, device tree, proprietary drivers, modem interfaces and board-specific hardware. A generic QEMU `virt` machine is not a drop-in replacement for a phone.

## PC performance policy

- Prefer WHPX when the installed QEMU build and Windows configuration support it.
- Keep TCG as a compatibility fallback.
- Make guest RAM and vCPU count configurable; do not allocate all host resources by default.
- Use VirtIO devices where the guest has suitable drivers.
- Prefer QCOW2 for convenient expandable disks and snapshots; allow raw disks for users who prioritize simple, direct image access.
- Keep the UI responsive with asynchronous process and log handling.
- Avoid permanent high-frequency polling. Use process events and bounded log buffers.
- Make graphics acceleration optional and detect whether the installed QEMU build supports it.

## Phased implementation

1. **QEMU proof of concept:** launch Android-x86_64 from an ISO, attach a persistent disk and expose NAT networking.
2. **Device manager:** create/edit profiles, validate configuration and save per-VM settings.
3. **Desktop display and input:** embed or manage the QEMU display window, map keyboard/mouse and expose power/rotation controls where supported.
4. **Performance and diagnostics:** WHPX detection, resource limits, logs, graceful shutdown and benchmark profiles.
5. **ARM guest research:** evaluate QEMU system-aarch64 and the existing ARM firmware engine separately. Do not advertise vendor phone firmware compatibility until it is demonstrated on real images.

## Non-goals for the first preview

- Claiming that every Android 1–17 phone firmware boots.
- Reusing Android-only JNI/HAL bridges as if they were Windows libraries.
- Requiring a specific GPU vendor.
- Silently modifying imported firmware images.
