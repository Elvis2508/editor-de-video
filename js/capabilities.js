/**
 * Detección centralizada de capacidades del navegador.
 * Basada en APIs reales (no en el nombre del User-Agent).
 */
(function (global) {
  function canPlay(type) {
    try {
      const v = document.createElement("video");
      const r = v.canPlayType(type);
      return r === "probably" || r === "maybe";
    } catch {
      return false;
    }
  }

  function canPlayAudio(type) {
    try {
      const a = document.createElement("audio");
      const r = a.canPlayType(type);
      return r === "probably" || r === "maybe";
    } catch {
      return false;
    }
  }

  function detectWebGL() {
    const canvas = document.createElement("canvas");
    let webgl2 = false;
    let webgl = false;
    try {
      webgl2 = Boolean(canvas.getContext("webgl2"));
    } catch { /* ignore */ }
    try {
      webgl = webgl2 || Boolean(
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
      );
    } catch { /* ignore */ }
    return { webgl, webgl2 };
  }

  function detectWasmSimd() {
    try {
      /* Validación mínima de SIMD: módulo con opcode SIMD (i8x16.splat). */
      return WebAssembly.validate(new Uint8Array([
        0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11
      ]));
    } catch {
      return false;
    }
  }

  function detect() {
    const { webgl, webgl2 } = detectWebGL();
    const canvas2d = (() => {
      try {
        return Boolean(document.createElement("canvas").getContext("2d"));
      } catch {
        return false;
      }
    })();

    return {
      webgl,
      webgl2,
      webgpu: Boolean(navigator.gpu),
      webCodecs: "VideoEncoder" in global && "VideoDecoder" in global,
      canvas2d,
      offscreenCanvas: typeof OffscreenCanvas !== "undefined",
      wasm: typeof WebAssembly !== "undefined",
      wasmSimd: typeof WebAssembly !== "undefined" && detectWasmSimd(),
      sharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
      crossOriginIsolated: Boolean(global.crossOriginIsolated),
      workers: typeof Worker !== "undefined",
      audioWorklet: typeof AudioWorkletNode !== "undefined",
      mediaSource: typeof MediaSource !== "undefined" || typeof ManagedMediaSource !== "undefined",
      fileSystemAccess: typeof showSaveFilePicker === "function",
      indexedDB: typeof indexedDB !== "undefined",
      pointerEvents: global.PointerEvent != null,
      hardwareConcurrency: Number(navigator.hardwareConcurrency) || 1,
      deviceMemoryGb: Number(navigator.deviceMemory) || null,
      codecH264: canPlay('video/mp4; codecs="avc1.42E01E"') || canPlay('video/mp4; codecs="avc1.4D401E"'),
      codecH265: canPlay('video/mp4; codecs="hev1.1.6.L93.B0"') || canPlay('video/mp4; codecs="hvc1.1.6.L93.B0"'),
      codecVP8: canPlay('video/webm; codecs="vp8"'),
      codecVP9: canPlay('video/webm; codecs="vp9"'),
      codecAV1: canPlay('video/mp4; codecs="av01.0.01M.08"') || canPlay('video/webm; codecs="av01.0.01M.08"'),
      codecAAC: canPlayAudio('audio/mp4; codecs="mp4a.40.2"') || canPlay('audio/mp4; codecs="mp4a.40.2"'),
      codecOpus: canPlayAudio('audio/webm; codecs="opus"') || canPlay('audio/webm; codecs="opus"'),
      codecMP3: canPlayAudio("audio/mpeg"),
      codecWAV: canPlayAudio("audio/wav") || canPlayAudio('audio/wav; codecs="1"')
    };
  }

  global.StudioCapabilitiesDetect = { detect };
})(window);
