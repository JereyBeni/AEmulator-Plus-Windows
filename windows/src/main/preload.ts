import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("aemu", {
  library: {
    list: () => ipcRenderer.invoke("library:list"),
    import: () => ipcRenderer.invoke("library:import"),
    remove: (id: string) => ipcRenderer.invoke("library:remove", id),
    move: (id: string, folder: string | null) => ipcRenderer.invoke("library:move", id, folder),
    reorder: (ids: string[]) => ipcRenderer.invoke("library:reorder", ids),
  },
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    set: (patch: Record<string, unknown>) => ipcRenderer.invoke("settings:set", patch),
  },
  engine: {
    status: () => ipcRenderer.invoke("engine:status"),
    start: (id: string) => ipcRenderer.invoke("engine:start", id),
    stop: () => ipcRenderer.invoke("engine:stop"),
  },
  app: {
    openDataFolder: () => ipcRenderer.invoke("app:openDataFolder"),
    pickEngineDir: () => ipcRenderer.invoke("app:pickEngineDir"),
    systemDark: () => ipcRenderer.invoke("app:systemDark"),
  },
});
