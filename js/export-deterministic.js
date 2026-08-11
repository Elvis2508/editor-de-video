/**
 * Codificación determinista frame-a-frame (CFR).
 * Reloj: timelineTime = frameIndex / fps — nunca performance.now()/rAF como PTS.
 */
(function (global) {
  function pad(n, w) {
    return String(n).padStart(w, "0");
  }

  function canvasToJpegBytes(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("toBlob falló"));
          blob.arrayBuffer().then((ab) => resolve(new Uint8Array(ab)), reject);
        },
        "image/jpeg",
        quality
      );
    });
  }

  /** WAV PCM 16-bit little-endian desde AudioBuffer */
  function audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    const samples = buffer.length;
    const blockAlign = (numChannels * bitDepth) / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samples * blockAlign;
    const headerSize = 44;
    const out = new ArrayBuffer(headerSize + dataSize);
    const view = new DataView(out);
    const writeStr = (offset, str) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeStr(36, "data");
    view.setUint32(40, dataSize, true);

    const channels = [];
    for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));
    let offset = 44;
    for (let i = 0; i < samples; i++) {
      for (let c = 0; c < numChannels; c++) {
        let s = Math.max(-1, Math.min(1, channels[c][i]));
        s = s < 0 ? s * 0x8000 : s * 0x7fff;
        view.setInt16(offset, s, true);
        offset += 2;
      }
    }
    return new Uint8Array(out);
  }

  /**
   * WebCodecs path (cuando el códec esté soportado): timestamps explícitos en µs.
   * Devuelve chunks EncodedVideoChunk + config; el host los muxea con FFmpeg.
   */
  async function tryConfigureVideoEncoder(width, height, fps, bitrate) {
    if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") {
      return null;
    }
    const w = width - (width % 2);
    const h = height - (height % 2);
    const candidates = [
      { codec: "avc1.42E01E", ext: "h264", avc: { format: "annexb" } },
      { codec: "avc1.42001E", ext: "h264", avc: { format: "annexb" } },
      { codec: "avc1.4D401E", ext: "h264", avc: { format: "annexb" } },
      { codec: "vp8", ext: "ivf" }
    ];
    for (const cand of candidates) {
      try {
        const config = {
          codec: cand.codec,
          width: w,
          height: h,
          bitrate: Math.max(500_000, bitrate || 2_000_000),
          framerate: fps
        };
        if (cand.avc) config.avc = cand.avc;
        const support = await VideoEncoder.isConfigSupported(config);
        if (!support?.supported) continue;
        return { ...cand, width: w, height: h };
      } catch {
        /* next */
      }
    }
    return null;
  }

  /**
   * Codifica canvas→H.264 Annex-B (o VP8) frame a frame.
   * encodeNext(frameIndex) debe dibujar el canvas antes de devolver.
   */
  async function encodeCanvasSequenceWebCodecs({
    canvas,
    totalFrames,
    fps,
    bitrate,
    encodeNext,
    onProgress
  }) {
    const cand = await tryConfigureVideoEncoder(canvas.width, canvas.height, fps, bitrate);
    if (!cand || cand.ext !== "h264") return null;

    const chunks = [];
    let errored = null;
    const encoder = new VideoEncoder({
      output: (chunk) => {
        const buf = new Uint8Array(chunk.byteLength);
        chunk.copyTo(buf);
        chunks.push(buf);
      },
      error: (err) => { errored = err; }
    });

    try {
      encoder.configure({
        codec: cand.codec,
        width: cand.width,
        height: cand.height,
        bitrate: Math.max(500_000, bitrate || 4_000_000),
        framerate: fps,
        avc: { format: "annexb" },
        latencyMode: "quality"
      });
    } catch (cfgErr) {
      try { encoder.close(); } catch { /* ignore */ }
      return null;
    }

    const frameDuration = Math.round(1_000_000 / Math.max(1, fps));
    try {
      for (let i = 0; i < totalFrames; i++) {
        if (errored) throw errored;
        await encodeNext(i);
        const ts = Math.round((i * 1_000_000) / Math.max(1, fps));
        const frame = new VideoFrame(canvas, {
          timestamp: ts,
          duration: frameDuration
        });
        const keyFrame = i % Math.max(1, Math.round(fps * 2)) === 0;
        encoder.encode(frame, { keyFrame });
        frame.close();
        if (encoder.encodeQueueSize > 4) {
          await new Promise((r) => {
            const start = performance.now();
            const check = () => {
              if (encoder.encodeQueueSize <= 2 || performance.now() - start > 2000) r();
              else setTimeout(check, 8);
            };
            check();
          });
        }
        if (i % 8 === 0) onProgress?.(i / totalFrames);
      }
      await Promise.race([
        encoder.flush(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("webcodecs flush timeout")), 15000))
      ]);
    } catch (err) {
      try { encoder.close(); } catch { /* ignore */ }
      return null;
    }
    try { encoder.close(); } catch { /* ignore */ }

    if (!chunks.length) return null;
    let total = 0;
    for (const c of chunks) total += c.byteLength;
    const out = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      out.set(c, off);
      off += c.byteLength;
    }
    return { annexB: out, codec: cand.codec, width: cand.width, height: cand.height };
  }

  /** JPEG más rápido: preferir convertToBlob en OffscreenCanvas cuando exista */
  function canvasToJpegBytesFast(canvas, quality) {
    if (canvas.convertToBlob) {
      return canvas.convertToBlob({ type: "image/jpeg", quality })
        .then((blob) => blob.arrayBuffer())
        .then((ab) => new Uint8Array(ab));
    }
    return canvasToJpegBytes(canvas, quality);
  }

  /** PNG sin pérdida (calidad máxima / alta — evita doble compresión JPEG→H.264 borrosa) */
  function canvasToPngBytes(canvas) {
    const toAb = (blob) => blob.arrayBuffer().then((ab) => new Uint8Array(ab));
    if (canvas.convertToBlob) {
      return canvas.convertToBlob({ type: "image/png" }).then(toAb);
    }
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("toBlob PNG falló"));
        toAb(blob).then(resolve, reject);
      }, "image/png");
    });
  }

  global.StudioExportDeterministic = {
    pad,
    canvasToJpegBytes,
    canvasToJpegBytesFast,
    canvasToPngBytes,
    audioBufferToWav,
    tryConfigureVideoEncoder,
    encodeCanvasSequenceWebCodecs,
    frameTime(frameIndex, fps) {
      return frameIndex / Math.max(1, fps);
    },
    frameTimestampUs(frameIndex, fps) {
      return Math.round((frameIndex * 1_000_000) / Math.max(1, fps));
    },
    totalFrames(duration, fps) {
      return Math.max(1, Math.ceil(Math.max(0.1, duration) * Math.max(1, fps)));
    }
  };
})(window);
