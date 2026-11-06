import { app, BrowserWindow, dialog, ipcMain, nativeTheme, shell } from "electron";
import * as fs from "fs";
import * as path from "path";
import { spawn, spawnSync, ChildProcess } from "child_process";
import { randomUUID } from "crypto";

interface Firmware {
  id: string;
  name: string;
  file: string;
  format: string;
  androidVersion: string;
  folder: string | null;
  addedAt: number;
}

interface Settings {
  seedColor: string;
  dark: boolean;
  vmTheme: string;
  engineDir: string;
  qemuPath: string;
  memoryMb: number;
  accelerator: string;
  dalvikJit: boolean;
  phoneGpu: boolean;
}

const DATA_DIR = app.getPath("userData");
const LIBRARY_FILE = path.join(DATA_DIR, "library.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

const DEFAULT_SETTINGS: Settings = {
  seedColor: "#3DDC84",
  dark: true,
  vmTheme: "Original",
  engineDir: "",
  qemuPath: "",
  memoryMb: 1536,
  accelerator: "tcg",
  dalvikJit: true,
  phoneGpu: true,
};

const SUPPORTED_EXT = [".iso", ".zip", ".img", ".tar.md5", ".tgz", ".sbf", ".pac", ".nbh", ".exe", ".dat.br"];

let win: BrowserWindow | null = null;
let engineProcess: ChildProcess | null = null;

function readJson<T>(file: string, fallback: T): T {
  try {
    return { ...fallback, ...JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch {
    return fallback;
  }
}

function writeJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}

function loadLibrary(): Firmware[] {
  return readJson<{ items: Firmware[] }>(LIBRARY_FILE, { items: [] }).items;
}

function saveLibrary(items: Firmware[]) {
  writeJson(LIBRARY_FILE, { items });
}

function detectFormat(file: string): string {
  const lower = file.toLowerCase();
  const hit = SUPPORTED_EXT.find((ext) => lower.endsWith(ext));
  return hit ? hit.replace(".", "").toUpperCase() : "Desconocido";
}

// Heurística simple: intenta leer la versión desde el nombre del archivo.
function guessAndroidVersion(name: string): string {
  const m = name.match(/(2\.3|3\.0|2\.2|2\.1|2\.0|1\.\d)/);
  return m ? m[1] : "Sin detectar";
}

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 760,
    minHeight: 520,
    title: "AEmulator Plus",
    backgroundColor: "#101412",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setMenuBarVisibility(false);

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  }
}

function registerIpc() {
  ipcMain.handle("library:list", () => loadLibrary());

  ipcMain.handle("library:import", async () => {
    if (!win) return [];
    const res = await dialog.showOpenDialog(win, {
      title: "Elegí un firmware",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Firmwares", extensions: ["iso", "zip", "img", "md5", "tgz", "sbf", "pac", "nbh", "exe", "br"] }],
    });
    if (res.canceled) return loadLibrary();
    const items = loadLibrary();
    for (const file of res.filePaths) {
      const name = path.basename(file);
      items.push({
        id: randomUUID(),
        name: name.replace(/\.[^.]+$/, ""),
        file,
        format: detectFormat(name),
        androidVersion: guessAndroidVersion(name),
        folder: null,
        addedAt: Date.now(),
      });
    }
    saveLibrary(items);
    return items;
  });

  ipcMain.handle("library:remove", (_e, id: string) => {
    const items = loadLibrary().filter((f) => f.id !== id);
    saveLibrary(items);
    return items;
  });

  ipcMain.handle("library:move", (_e, id: string, folder: string | null) => {
    const items = loadLibrary().map((f) => (f.id === id ? { ...f, folder } : f));
    saveLibrary(items);
    return items;
  });

  ipcMain.handle("library:reorder", (_e, ids: string[]) => {
    const current = loadLibrary();
    const byId = new Map(current.map((f) => [f.id, f]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as Firmware[];
    const rest = current.filter((f) => !ids.includes(f.id));
    saveLibrary([...ordered, ...rest]);
    return [...ordered, ...rest];
  });

  ipcMain.handle("settings:get", () => readJson<Settings>(SETTINGS_FILE, DEFAULT_SETTINGS));

  ipcMain.handle("settings:set", (_e, patch: Partial<Settings>) => {
    const next = { ...readJson<Settings>(SETTINGS_FILE, DEFAULT_SETTINGS), ...patch };
    writeJson(SETTINGS_FILE, next);
    return next;
  });

  ipcMain.handle("engine:status", () => {
    const settings = readJson<Settings>(SETTINGS_FILE, DEFAULT_SETTINGS);
    const exe = settings.qemuPath || (settings.engineDir ? path.join(settings.engineDir, "qemu-system-x86_64.exe") : "");
    const imageTool = exe ? path.join(path.dirname(exe), "qemu-img.exe") : "";
    return {
      available: !!exe && fs.existsSync(exe),
      diskToolAvailable: !!imageTool && fs.existsSync(imageTool),
      running: !!engineProcess,
      path: exe,
      target: "x86_64",
    };
  });

  ipcMain.handle("engine:start", async (_e, firmwareId: string) => {
    const fw = loadLibrary().find((f) => f.id === firmwareId);
    if (!fw) return { ok: false, message: "Firmware no encontrado" };
    if (path.extname(fw.file).toLowerCase() !== ".iso") {
      return {
        ok: false,
        message: "Este primer backend arranca ISOs Android-x86. Los ZIP/IMG de teléfonos ARM necesitan un kernel y una placa QEMU compatibles; no se pueden arrancar como si fueran una ISO de PC.",
      };
    }
    if (!fs.existsSync(fw.file)) return { ok: false, message: "No se encuentra el archivo ISO." };
    if (engineProcess) return { ok: false, message: "Ya hay una máquina virtual corriendo." };

    const settings = readJson<Settings>(SETTINGS_FILE, DEFAULT_SETTINGS);
    const exe = settings.qemuPath || (settings.engineDir ? path.join(settings.engineDir, "qemu-system-x86_64.exe") : "");
    if (!exe || !fs.existsSync(exe)) {
      return { ok: false, message: "No encuentro qemu-system-x86_64.exe. Seleccionalo en Ajustes." };
    }

    const imageTool = path.join(path.dirname(exe), "qemu-img.exe");
    if (!fs.existsSync(imageTool)) {
      return { ok: false, message: "Falta qemu-img.exe en la misma carpeta que QEMU. Se necesita para crear el disco virtual persistente." };
    }

    const vmDir = path.join(DATA_DIR, "vms");
    fs.mkdirSync(vmDir, { recursive: true });
    const disk = path.join(vmDir, `${fw.id}.qcow2`);
    const isFirstBoot = !fs.existsSync(disk);
    if (isFirstBoot) {
      const create = spawnSync(imageTool, ["create", "-f", "qcow2", disk, "8G"], {
        encoding: "utf8",
        windowsHide: true,
      });
      if (create.error || create.status !== 0) {
        return { ok: false, message: `No pude crear el disco virtual: ${create.stderr || create.error?.message || "qemu-img failed"}` };
      }
    }

    const memory = Math.max(1024, Math.min(2048, Number(settings.memoryMb) || 1536));
    const args = [
      "-name", `AEmulator Plus - ${fw.name}`,
      "-machine", `pc,accel=${settings.accelerator === "whpx" ? "whpx" : "tcg"}`,
      "-cpu", "qemu64",
      "-smp", "2",
      "-m", String(memory),
      "-vga", "std",
      "-usb",
      "-device", "usb-tablet",
      "-netdev", "user,id=net0",
      "-device", "e1000,netdev=net0",
      "-drive", `file=${disk},if=ide,index=0,media=disk,format=qcow2`,
      "-cdrom", fw.file,
      "-boot", isFirstBoot ? "order=d" : "order=c",
      "-rtc", "base=localtime",
    ];

    try {
      const child = spawn(exe, args, { stdio: "ignore", windowsHide: false });
      engineProcess = child;
      child.once("error", (error) => {
        engineProcess = null;
        win?.webContents.send("engine:error", error.message);
      });
      child.once("exit", () => {
        if (engineProcess === child) engineProcess = null;
      });
      return {
        ok: true,
        message: isFirstBoot
          ? "QEMU iniciado. Instalá Android-x86 en el disco virtual de 8 GB; en los próximos arranques iniciará desde ese disco."
          : `Android iniciado desde el disco virtual de ${fw.name}.`,
      };
    } catch (error) {
      engineProcess = null;
      return { ok: false, message: `No pude iniciar QEMU: ${String(error)}` };
    }
  });

  ipcMain.handle("engine:stop", () => {
    engineProcess?.kill();
    engineProcess = null;
    return { ok: true };
  });

  ipcMain.handle("app:openDataFolder", () => shell.openPath(DATA_DIR));
  ipcMain.handle("app:openExternal", (_e, url: string) => {
    const allowed = [
      "https://github.com/somerandomusernam2/AEmulator-Plus",
      "https://github.com/drel4/AEmulator-Sunset",
      "https://github.com/uxazu/AEmulator",
    ];
    if (!allowed.includes(url)) return false;
    return shell.openExternal(url).then(() => true);
  });
  ipcMain.handle("app:pickEngineDir", async () => {
    if (!win) return null;
    const res = await dialog.showOpenDialog(win, { properties: ["openDirectory"] });
    return res.canceled ? null : res.filePaths[0];
  });
  ipcMain.handle("app:pickQemuFile", async () => {
    if (!win) return null;
    const res = await dialog.showOpenDialog(win, {
      title: "Seleccionar QEMU para x86_64",
      properties: ["openFile"],
      filters: [{ name: "QEMU system emulator", extensions: ["exe"] }],
    });
    return res.canceled ? null : res.filePaths[0];
  });
  ipcMain.handle("app:systemDark", () => nativeTheme.shouldUseDarkColors);
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  engineProcess?.kill();
  if (process.platform !== "darwin") app.quit();
});
