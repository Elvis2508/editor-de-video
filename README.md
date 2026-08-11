# Studio Obra Pro

Editor y conversor de video profesional en el navegador.

## Privacidad

**Los videos se procesan localmente en este dispositivo y no se envían a servidores externos.**

## Publicar en GitHub Pages

1. Suba este repositorio a GitHub.
2. Settings → Pages → Source: Deploy from branch.
3. Branch: `main` (o `master`), folder: `/` (raíz).
4. URL: `https://SU-USUARIO.github.io/SU-REPO/`

Requisitos: `index.html` en la raíz, `.nojekyll`, carpeta `vendor/ffmpeg11/` completa.

Detalle: `docs/GITHUB-PAGES.md`.

## Uso local (desarrollo)

```bash
npm start
```

Abre `http://127.0.0.1:8765` en el navegador.

En **GitHub Pages** el visitante solo abre la URL HTTPS; no necesita Node.

## Funciones

- Edición en línea de tiempo (clips, recortes, títulos, color, audio)
- Transiciones (vista previa + exportación)
- Imágenes superpuestas
- Efectos visuales y control de velocidad
- Exportación determinista CFR (procesamiento 100% local)
- Pestaña Conversión → MP4 H.264

## Licencia

Uso del proyecto según el propietario del repositorio. FFmpeg.wasm / librerías de terceros: ver `THIRD_PARTY_LICENSES.md`.
