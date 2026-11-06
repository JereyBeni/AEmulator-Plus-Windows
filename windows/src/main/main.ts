import { app, BrowserWindow, dialog, ipcMain, nativeTheme, shell } from "electron";
import * as fs from "fs";
import * as path from "path";
import { spawn, ChildProcess } from "child_process";
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
    const { engineDir } = readJson<Settings>(SETTINGS_FILE, DEFAULT_SETTINGS);
    const exe = engineDir ? path.join(engineDir, "qemu-system-arm.exe") : "";
    return {
      available: !!exe && fs.existsSync(exe),
      running: !!engineProcess,
      path: exe,
    };
  });

  // El motor todavía no está portado: sólo lanza un qemu-system-arm externo si el usuario lo apunta.
  ipcMain.handle("engine:start", (_e, firmwareId: string) => {
    const fw = loadLibrary().find((f) => f.id === firmwareId);
    if (!fw) return { ok: false, message: "Firmware no encontrado" };
    const { engineDir } = readJson<Settings>(SETTINGS_FILE, DEFAULT_SETTINGS);
    const exe = engineDir ? path.join(engineDir, "qemu-system-arm.exe") : "";
    if (!exe || !fs.existsSync(exe)) {
      return { ok: false, message: "Motor no instalado: indicá la carpeta del motor en Ajustes" };
    }
    if (engineProcess) return { ok: false, message: "Ya hay una máquina virtual corriendo" };
    engineProcess = spawn(exe, ["-M", "versatilepb", "-m", "256", "-cpu", "arm1176", "-cdrom", fw.file], { stdio: "ignore" });
    engineProcess.on("exit", () => (engineProcess = null));
    return { ok: true, message: `Iniciado: ${fw.name}` };
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
