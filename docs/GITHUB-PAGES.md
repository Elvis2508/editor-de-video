# Publicación en GitHub Pages

## Configuración

| Campo | Valor |
|--------|--------|
| Branch | `main` |
| Folder | `/` (raíz) |
| Entrada | `index.html` |
| URL | `https://USUARIO.github.io/NOMBRE-REPO/` |

GitHub Pages sirve **archivos estáticos**. No ejecuta Node ni FFmpeg del sistema. El editor corre en el navegador del visitante.

## Subir a GitHub

```text
index.html
app.js
styles.css
manifest.webmanifest
service-worker.js
.nojekyll
.gitignore
README.md
THIRD_PARTY_LICENSES.md
favicon.ico
assets/icons/
js/
docs/
vendor/ffmpeg11/   (ffmpeg.min.js, ffmpeg-core.js, ffmpeg-core.wasm, ffmpeg-core.worker.js)
package.json         (opcional; solo para npm start en PC)
scripts/local-server.mjs
```

## No subir

- `node_modules/`
- `test-output/`, `exports/`, `backups/`
- videos personales (`*.mp4`, etc.)
- `.env`, credenciales

## Service Worker

Si ve una versión antigua: DevTools → Application → Service Workers → Unregister → Ctrl+F5.

## FFmpeg.wasm

Consola (F12): no debe haber 404 de `ffmpeg-core.wasm`. Origen esperado: **local** (`vendor/ffmpeg11/`).
