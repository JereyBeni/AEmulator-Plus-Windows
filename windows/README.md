# AEmulator Plus para Windows (versión preliminar)

App de escritorio con Electron + React y estilo Material You.

## Qué incluye
- Biblioteca de firmwares: agregar, buscar, carpetas, reordenar y quitar.
- Ajustes: color base (paleta tonal generada), tema claro/oscuro, tema de la pantalla de la VM.
- Panel de motor: lanza un `qemu-system-arm.exe` externo que indiques.

## Qué todavía NO funciona
- El motor de emulación Android no está portado a Windows. Sin un `qemu-system-arm.exe` configurado, "Iniciar" sólo muestra un aviso.
- Temas `.aetheme` personalizados, arrastrar para reordenar y audio/GPU no están implementados.
- Los firmwares no se validan ni se extraen todavía; sólo se registra su ruta.

## Desarrollo
```bash
cd windows
npm install
npm start          # compila y abre la app
npm run dist:win   # genera dist/AEmulator Plus-0.1.0-win.zip
```

El instalador NSIS requiere Wine al compilar desde Linux, así que el paquete es un ZIP portable.
Para un instalador, compilar en Windows con `npm run dist:win` y cambiar `target` a `nsis`.
