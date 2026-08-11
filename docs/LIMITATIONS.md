# Limitaciones conocidas

## Efectos y velocidad (Fase 1+ / Fase 2)

Hay pestañas **Efectos visuales** y **Control de velocidad** con efectos reales en preview/export (Canvas 2D / CSS). Sin APIs de IA de pago.

Pendiente: máscaras Bézier, tracking optical flow, segmentación experimental. Ver `INFORME_EFECTOS.md` y `THIRD_PARTY_LICENSES.md`.

## Procesamiento local

Todo el trabajo multimedia ocurre en el navegador del usuario (CPU/RAM). No hay servidor de renderizado.

## GitHub Pages y FFmpeg

- Se usa **@ffmpeg/ffmpeg 0.11 + @ffmpeg/core-st 0.11.1** (monohilo).
- Compatible con Pages **sin** encabezados COOP/COEP.
- El archivo `ffmpeg-core.wasm` pesa ~24 MB: la primera carga puede tardar según la red.

## Códecs

| Códec | Estado en esta compilación |
|--------|----------------------------|
| H.264 (`libx264`) | Disponible |
| H.265 (`libx265`) | **No incluido** — la opción permanece deshabilitada; no se genera un falso HEVC |

Firefox puede no reproducir H.265 aunque el archivo sea válido; validar con FFprobe/VLC.

## Hardware

Laptops con poca RAM (< 4 GB estimados) o pocos núcleos pueden:

- Fallar con 1080p/60 o archivos muy grandes
- Necesitar 720p, CRF más alto o clips más cortos

La UI muestra advertencias y capacidades del dispositivo.

## CDN de respaldo

Solo se usa CDN (jsDelivr) si:

- Se abre como `file://`, o
- Fallan los archivos locales de `vendor/ffmpeg11/`

En GitHub Pages lo normal es **origen local**.

## PWA

El Service Worker cachea HTML/CSS/JS/WASM. **No** almacena videos del usuario.

## Transiciones / export

La exportación del timeline es **determinista CFR**:

- Reloj: `timelineTime = frameIndex / fps` (no `performance.now` / MediaRecorder).
- Composición: `drawExportFrame` (mismas transiciones/FX que el compositor de export).
- Codificación: secuencia JPEG → FFmpeg.wasm (`-vsync cfr`).

Una PC lenta tarda más en exportar, pero genera la **misma duración y el mismo número de fotogramas**.

Detalle técnico: `INFORME_EXPORTACION.md`. Ver también `npm run test:export-cfr`.

Algunos presets (blur / dissolve-bright) en export omiten filtros pesados de canvas para evitar congelamientos; la disolvencia estándar se exporta.
