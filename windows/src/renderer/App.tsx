import React, { useEffect, useMemo, useState } from "react";
import { materialPalette } from "./material";

declare global {
  interface Window {
    aemu: any;
  }
}

type Firmware = {
  id: string; name: string; file: string; format: string;
  androidVersion: string; folder: string | null; addedAt: number;
};
type Settings = {
  seedColor: string; dark: boolean; vmTheme: string; engineDir: string;
  qemuPath: string; memoryMb: number;
  dalvikJit: boolean; phoneGpu: boolean;
};

const VM_THEMES = ["Original", "Sunset", "Gingerbread 2.x", "Honeycomb 3.x", "Holo 4.x", "Lollipop 5.x"];
const api = window.aemu;

export default function App() {
  const [tab, setTab] = useState<"library" | "settings" | "engine" | "about">("library");
  const [items, setItems] = useState<Firmware[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const [toast, setToast] = useState<string>("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.library.list().then(setItems);
    api.settings.get().then(setSettings);
  }, []);

  useEffect(() => {
    if (!settings) return;
    const palette = materialPalette(settings.seedColor, settings.dark);
    const root = document.documentElement;
    Object.entries(palette).forEach(([k, v]) => root.style.setProperty(k, v));
    root.dataset.theme = settings.dark ? "dark" : "light";
  }, [settings]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const folders = useMemo(
    () => Array.from(new Set(items.map((f) => f.folder).filter(Boolean) as string[])),
    [items]
  );

  const visible = items
    .filter((f) => (folderFilter ? f.folder === folderFilter : true))
    .filter((f) => f.name.toLowerCase().includes(query.toLowerCase()));

  async function importFirmware() {
    setItems(await api.library.import());
  }
  async function remove(id: string) {
    setItems(await api.library.remove(id));
  }
  async function move(id: string, folder: string | null) {
    setItems(await api.library.move(id, folder));
  }
  async function newFolder(id: string) {
    const name = window.prompt("Nombre de la carpeta");
    if (name && name.trim()) await move(id, name.trim());
  }
  async function shift(id: string, dir: -1 | 1) {
    const ids = items.map((f) => f.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setItems(await api.library.reorder(ids));
  }
  async function start(id: string) {
    const res = await api.engine.start(id);
    setToast(res.message);
  }
  async function patch(p: Partial<Settings>) {
    setSettings(await api.settings.set(p));
  }

  if (!settings) return <div className="splash">Cargando…</div>;

  return (
    <div className="shell">
      <nav className="rail">
        <div className="brand">AEmulator<span> Plus</span></div>
        {(["library", "settings", "engine", "about"] as const).map((t) => (
          <button key={t} className={`nav ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "library" ? "Biblioteca" : t === "settings" ? "Ajustes" : t === "engine" ? "Motor" : "Acerca de"}
          </button>
        ))}
      </nav>

      <main className="content">
        {tab === "library" && (
          <section>
            <header className="top">
              <h1>Biblioteca</h1>
              <div className="row">
                <input
                  className="search"
                  placeholder="Buscar firmware"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button className="filled" onClick={importFirmware}>Add firmware</button>
              </div>
            </header>

            <div className="chips">
              <button className={`chip ${folderFilter === null ? "on" : ""}`} onClick={() => setFolderFilter(null)}>Todos</button>
              {folders.map((f) => (
                <button key={f} className={`chip ${folderFilter === f ? "on" : ""}`} onClick={() => setFolderFilter(f)}>{f}</button>
              ))}
            </div>

            {visible.length === 0 ? (
              <div className="empty">
                <p>No hay firmwares todavía.</p>
                <p className="muted">Formatos: ISO, ZIP, IMG, TAR.MD5, TGZ, SBF, PAC, NBH, RUU.exe. Ideal: Android 2.3 a 3.0.</p>
              </div>
            ) : (
              <ul className="list">
                {visible.map((f) => (
                  <li key={f.id} className="card">
                    <div className="card-main">
                      <div className="title">{f.name}</div>
                      <div className="muted">
                        {f.format} · Android {f.androidVersion}
                        {f.folder ? ` · ${f.folder}` : ""}
                      </div>
                    </div>
                    <div className="actions">
                      <button className="filled small" onClick={() => start(f.id)}>Iniciar</button>
                      <button className="tonal small" onClick={() => shift(f.id, -1)} title="Subir">↑</button>
                      <button className="tonal small" onClick={() => shift(f.id, 1)} title="Bajar">↓</button>
                      <button className="tonal small" onClick={() => newFolder(f.id)}>Carpeta</button>
                      {f.folder && <button className="tonal small" onClick={() => move(f.id, null)}>Quitar carpeta</button>}
                      <button className="text small" onClick={() => remove(f.id)}>Quitar</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === "settings" && (
          <section>
            <header className="top"><h1>Ajustes</h1></header>

            <div className="group">
              <h2>Opciones del sistema invitado</h2>
              <label className="field">
                <span>Dalvik JIT</span>
                <input type="checkbox" checked={settings.dalvikJit} onChange={(e) => patch({ dalvikJit: e.target.checked })} />
              </label>
              <label className="field">
                <span>Aceleración de GPU del teléfono</span>
                <input type="checkbox" checked={settings.phoneGpu} onChange={(e) => patch({ phoneGpu: e.target.checked })} />
              </label>
              <p className="muted">Ambas opciones están activadas de forma predeterminada. Por ahora se guardan como preferencias; todavía no están conectadas al motor QEMU de Windows.</p>
            </div>

            <div className="group">
              <label className="field">
                <span>Color base</span>
                <input type="color" value={settings.seedColor} onChange={(e) => patch({ seedColor: e.target.value })} />
              </label>
              <label className="field">
                <span>Tema oscuro</span>
                <input type="checkbox" checked={settings.dark} onChange={(e) => patch({ dark: e.target.checked })} />
              </label>
            </div>

            <div className="group">
              <label className="field">
                <span>Tema de la pantalla de la VM</span>
                <select value={settings.vmTheme} onChange={(e) => patch({ vmTheme: e.target.value })}>
                  {VM_THEMES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <p className="muted">Los temas personalizados (.aetheme) llegan en una versión posterior.</p>
            </div>

            <div className="group">
              <h2>QEMU para Android-x86</h2>
              <div className="field">
                <span>Ejecutable qemu-system-x86_64.exe</span>
                <span className="muted path">{settings.qemuPath || "No configurado"}</span>
              </div>
              <div className="row">
                <button className="tonal" onClick={async () => {
                  const exe = await api.app.pickQemuFile();
                  if (exe) patch({ qemuPath: exe });
                }}>Seleccionar QEMU</button>
                <label className="field">
                  <span>RAM de la VM</span>
                  <select value={settings.memoryMb} onChange={(e) => patch({ memoryMb: Number(e.target.value) })}>
                    <option value={1024}>1 GB</option>
                    <option value={1536}>1.5 GB</option>
                    <option value={2048}>2 GB</option>
                  </select>
                </label>
              </div>
              <p className="muted">QEMU debe incluir qemu-img.exe en la misma carpeta. Este perfil usa emulación TCG y VGA estándar para máxima compatibilidad, sin aceleración 3D de GPU.</p>
            </div>

            <div className="group">
              <div className="field">
                <span>Carpeta del motor heredado</span>
                <span className="muted path">{settings.engineDir || "No configurada"}</span>
              </div>
              <div className="row">
                <button className="tonal" onClick={async () => {
                  const dir = await api.app.pickEngineDir();
                  if (dir) patch({ engineDir: dir });
                }}>Elegir carpeta</button>
                <button className="text" onClick={() => api.app.openDataFolder()}>Abrir carpeta de datos</button>
              </div>
            </div>
          </section>
        )}

        {tab === "engine" && <EnginePanel />}
        {tab === "about" && <AboutPanel />}
      </main>

      {toast && <div className="snackbar" role="status">{toast}</div>}
    </div>
  );
}

function EnginePanel() {
  const [status, setStatus] = useState<{ available: boolean; diskToolAvailable: boolean; running: boolean; path: string; target: string } | null>(null);
  useEffect(() => {
    api.engine.status().then(setStatus);
  }, []);
  return (
    <section>
      <header className="top"><h1>Motor</h1></header>
      <div className="group">
        <p>
          <strong>Estado:</strong>{" "}
          {status === null ? "Revisando…" : status.available && status.diskToolAvailable ? "QEMU x86_64 listo" : status.available ? "Falta qemu-img.exe" : "QEMU no configurado"}
        </p>
        {status?.path && <p className="muted path">{status.path}</p>}
        <p className="muted">
          Este backend inicia ISOs Android-x86 con qemu-system-x86_64, crea un disco qcow2 persistente de 8 GB y conserva la instalación entre arranques. En el primer inicio arranca el instalador desde la ISO; los siguientes arrancan desde el disco virtual.
        </p>
        <p className="muted">Este modo es x86/x86_64. No arranca directamente ROMs ZIP, SBF, PAC, NBH ni imágenes ARM de teléfonos. Tampoco ofrece aceleración 3D ni GPU passthrough en esta configuración TCG.</p>
        <div className="row">
          <button className="tonal" onClick={() => api.engine.stop()}>Detener VM</button>
          <button className="text" onClick={() => api.app.openDataFolder()}>Ver discos virtuales</button>
        </div>
      </div>
    </section>
  );
}


function AboutPanel() {
  const links = [
    ["AEmulator Plus original", "https://github.com/somerandomusernam2/AEmulator-Plus"],
    ["AEmulator Sunset", "https://github.com/drel4/AEmulator-Sunset"],
    ["Original AEmulator", "https://github.com/uxazu/AEmulator"],
  ];
  return (
    <section>
      <header className="top"><h1>Acerca de AEmulator Plus</h1></header>
      <div className="group">
        <h2>Proyectos relacionados</h2>
        <p className="muted">Este es un frontend de escritorio independiente para Windows, inspirado en la familia AEmulator.</p>
        {links.map(([label, url]) => (
          <div className="field" key={url}>
            <span>{label}</span>
            <button className="tonal" onClick={() => api.app.openExternal(url)}>Abrir proyecto ↗</button>
          </div>
        ))}
      </div>
      <p className="muted">Los firmwares no se incluyen. Usá imágenes que tengas derecho a utilizar. El motor de emulación Android todavía necesita un port nativo para Windows.</p>
    </section>
  );
}
