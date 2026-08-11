# Licencias de terceros

Este proyecto no utiliza APIs de IA comerciales ni servicios de pago para efectos.

## Dependencias distribuidas / usadas

| Nombre | Versión | Autor / Origen | Licencia | Uso | ¿Se distribuye? |
|--------|---------|----------------|----------|-----|-----------------|
| @ffmpeg/ffmpeg | 0.11 | ffmpeg.wasm | MIT | Conversión/export local | Sí (`vendor/ffmpeg11/`) |
| @ffmpeg/core-st | 0.11.1 | ffmpeg.wasm | MIT / LGPL (FFmpeg) | Motor FFmpeg monohilo | Sí (`.js` / `.wasm`) |
| Playwright | ^1.54 (dev) | Microsoft | Apache-2.0 | Solo pruebas locales | No (`devDependency`) |

## Algoritmos propios (sin dependencia externa)

Los efectos visuales de Fase 1/2 se implementan con:

- Canvas 2D del navegador
- Filtros CSS nativos (`blur`, `grayscale`, `sepia`, etc.)
- Muestreo multipasada (desenfoque direccional / zoom / radial)
- Remapeo de píxeles (distorsión de lente, mediotono, deband)
- Gradientes y composición (`screen`, `multiply`, etc.)

No se incluyen OpenCV.js, MediaPipe, ONNX Runtime ni modelos de segmentación en esta entrega.

## Modelos de IA

**Ninguno.** Las funciones de máscara semiautomática, segmentación automática y profundidad automática (Fases 5–7 del plan largo) quedan documentadas como futuras y **solo** se añadirán si existe un modelo abierto con licencia clara, ejecución 100 % local y sin envío de archivos a Internet.

## Avisos FFmpeg

FFmpeg y las bibliotecas que incorpora pueden estar bajo LGPL/GPL según la compilación. Consulte la documentación oficial de [FFmpeg](https://ffmpeg.org/) y del paquete `@ffmpeg/core-st` antes de redistribuir en productos comerciales.
