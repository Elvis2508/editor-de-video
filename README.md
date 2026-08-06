# Studio Obra Pro

Editor y conversor de video profesional en el navegador.

## Privacidad

**Los videos se procesan localmente en este dispositivo y no se envían a servidores externos.**

No hay backend, ni cuenta, ni subida a la nube. Los archivos se leen con APIs del navegador (`File` / `Blob`) y el resultado se descarga desde memoria local.

## Publicar en GitHub Pages

1. Suba este repositorio a GitHub (vea la lista en `docs/GITHUB-PAGES.md`).
2. Settings → Pages → Source: Deploy from branch.
3. Branch: `main` (o `master`), folder: `/` (raíz).
4. URL: `https://SU-USUARIO.github.io/SU-REPO/`

Requisitos en el repo:

- `index.html` en la raíz
- `.nojekyll`
- carpeta `vendor/ffmpeg11/` completa (incluye `ffmpeg-core.wasm` ~24 MB)

## Uso local (desarrollo)

```bash
npm start
```

O doble clic en `abrir-studio.bat` (abre `http://127.0.0.1:8765`).

El usuario final **no necesita Node.js** ni FFmpeg instalado: solo un navegador moderno.

## Funciones

- Edición en línea de tiempo (clips, recortes, títulos, color, audio)
- Transiciones (vista previa + exportación)
- Imágenes superpuestas (también durante transiciones)
- Exportación WebM / conversión a MP4 H.264 vía FFmpeg.wasm
- Pestaña Conversión: cualquier video compatible → MP4 H.264
- H.265 solo si el encoder `libx265` está realmente disponible (en la compilación actual **no** lo está)

## Limitaciones

Vea `docs/LIMITATIONS.md`.

## Licencia

Uso del proyecto según el propietario del repositorio. FFmpeg.wasm / librerías de terceros conservan sus propias licencias.
