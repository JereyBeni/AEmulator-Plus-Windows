#requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
    [string]$BootIso,

    [string]$DiskImage,

    [string]$QemuPath = "qemu-system-x86_64.exe",

    [ValidateRange(512, 32768)]
    [int]$MemoryMB = 3072,

    [ValidateRange(1, 32)]
    [int]$CpuCount = 2,

    [ValidateSet("whpx", "tcg")]
    [string]$Acceleration = "whpx",

    [ValidateSet("sdl", "default")]
    [string]$Display = "sdl"
)

$ErrorActionPreference = "Stop"

$resolvedQemu = Get-Command $QemuPath -ErrorAction SilentlyContinue
if ($resolvedQemu) {
    $QemuExecutable = $resolvedQemu.Source
} elseif (Test-Path -LiteralPath $QemuPath -PathType Leaf) {
    $QemuExecutable = (Resolve-Path -LiteralPath $QemuPath).Path
} else {
    throw "QEMU executable not found: $QemuPath. Install QEMU or pass -QemuPath."
}

$iso = (Resolve-Path -LiteralPath $BootIso).Path
$argsList = @(
    "-machine", "q35",
    "-accel", $Acceleration,
    "-cpu", "max",
    "-smp", "cores=$CpuCount,threads=1,sockets=1",
    "-m", "$MemoryMB",
    "-boot", "order=d",
    "-cdrom", $iso,
    "-device", "virtio-vga",
    "-netdev", "user,id=net0",
    "-device", "virtio-net-pci,netdev=net0"
)

if ($DiskImage) {
    if (-not (Test-Path -LiteralPath $DiskImage -PathType Leaf)) {
        throw "Disk image does not exist: $DiskImage. Create it first with qemu-img."
    }

    $disk = (Resolve-Path -LiteralPath $DiskImage).Path
    $extension = [IO.Path]::GetExtension($disk).ToLowerInvariant()
    $format = switch ($extension) {
        ".qcow2" { "qcow2" }
        ".qcow"  { "qcow2" }
        ".raw"   { "raw" }
        ".img"   { "raw" }
        default  { throw "Unsupported disk extension '$extension'. Use .qcow2, .qcow or .raw/.img." }
    }
    $argsList += @("-drive", "file=$disk,if=virtio,format=$format")
}

if ($Display -eq "sdl") {
    $argsList += @("-display", "sdl")
}

Write-Host "AEmulator Plus Windows QEMU preview"
Write-Host "QEMU: $QemuExecutable"
Write-Host "Acceleration: $Acceleration | vCPU: $CpuCount | RAM: $MemoryMB MB"
Write-Host "Boot ISO: $iso"
if ($DiskImage) { Write-Host "Disk: $disk ($format)" }

& $QemuExecutable @argsList
exit $LASTEXITCODE
