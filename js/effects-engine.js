/**
 * Motor de efectos compartido (preview CSS + canvas pixel pass / export).
 */
(function (global) {
  const uid = () => `fx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  function catalog() {
    return global.StudioEffectsCatalog;
  }

  function ensureClip(clip) {
    if (!clip) return clip;
    if (!Array.isArray(clip.effects)) clip.effects = [];
    return clip;
  }

  function defaultParams(def) {
    const out = {};
    (def.params || []).forEach((p) => { out[p.key] = p.default; });
    return out;
  }

  function createInstance(type, params) {
    const def = catalog()?.byType(type);
    if (!def) return null;
    return {
      id: uid(),
      type,
      name: def.name,
      enabled: true,
      opacity: 1,
      blendMode: "normal",
      keyframes: [],
      params: { ...defaultParams(def), ...(params || {}) }
    };
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeInOut(t) {
    return t * t * (3 - 2 * t);
  }

  function localNorm(clip, timelineTime) {
    const d = Math.max(0.001, clip.duration || 1);
    return Math.min(1, Math.max(0, (timelineTime - clip.start) / d));
  }

  function resolveParams(effect, clip, timelineTime) {
    const p = { ...(effect.params || {}) };
    const kfs = effect.keyframes;
    if (!kfs || !kfs.length) return p;
    const t = localNorm(clip, timelineTime);
    // keyframes: [{ t:0..1, params:{...} }] sorted
    const sorted = [...kfs].sort((a, b) => a.t - b.t);
    if (t <= sorted[0].t) return { ...p, ...sorted[0].params };
    if (t >= sorted[sorted.length - 1].t) return { ...p, ...sorted[sorted.length - 1].params };
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (t >= a.t && t <= b.t) {
        const u = easeInOut((t - a.t) / Math.max(0.001, b.t - a.t));
        const out = { ...p };
        const keys = new Set([...Object.keys(a.params || {}), ...Object.keys(b.params || {})]);
        keys.forEach((k) => {
          const av = (a.params && a.params[k] != null) ? a.params[k] : p[k];
          const bv = (b.params && b.params[k] != null) ? b.params[k] : p[k];
          if (typeof av === "number" && typeof bv === "number") out[k] = lerp(av, bv, u);
          else out[k] = u < 0.5 ? av : bv;
        });
        return out;
      }
    }
    return p;
  }

  function enabledEffects(clip) {
    ensureClip(clip);
    return (clip.effects || []).filter((e) => e && e.enabled !== false);
  }

  function needsPixelPass(clip) {
    return enabledEffects(clip).some((e) => catalog()?.byType(e.type)?.pixel);
  }

  function needsTransformPass(clip) {
    return enabledEffects(clip).some((e) => catalog()?.byType(e.type)?.transform);
  }

  function hasAnyEffects(clip) {
    return enabledEffects(clip).length > 0;
  }

  /** Transform overrides from Ken Burns / pan / camera shake */
  function transformOverride(clip, timelineTime) {
    const list = enabledEffects(clip);
    let scale = clip.scale != null ? clip.scale : 1;
    let x = clip.x || 0;
    let y = clip.y || 0;
    let rotation = clip.rotation || 0;
    let touched = false;
    const t = localNorm(clip, timelineTime);
    const u = easeInOut(t);
    for (const fx of list) {
      const p = resolveParams(fx, clip, timelineTime);
      if (fx.type === "kenburns") {
        scale = lerp(p.scaleStart ?? 1, p.scaleEnd ?? 1.35, u);
        x = lerp(p.xStart ?? 0, p.xEnd ?? 0, u);
        y = lerp(p.yStart ?? 0, p.yEnd ?? 0, u);
        touched = true;
      } else if (fx.type === "pan") {
        scale = p.scale ?? 1.15;
        x = lerp(p.xStart ?? -120, p.xEnd ?? 120, u);
        y = p.y ?? 0;
        touched = true;
      } else if (fx.type === "camerashake") {
        const seed = (p.seed || 7) * 12.9898;
        const freq = (p.frequency || 12) * Math.PI * 2;
        const timeSec = (timelineTime || 0) + seed * 0.01;
        const inten = (p.intensity || 18) * (fx.opacity ?? 1);
        x += Math.sin(timeSec * freq) * inten;
        y += Math.cos(timeSec * freq * 1.31 + seed) * inten * 0.85;
        rotation += Math.sin(timeSec * freq * 0.73 + 1.7) * (p.rotation || 1.5) * (fx.opacity ?? 1);
        touched = true;
      }
    }
    if (!touched) return null;
    return { scale, x, y, rotation };
  }

  /**
   * CSS filter string for enabled css-capable effects (+ color remains in app visualFilter).
   */
  function cssEffectsFilter(clip, timelineTime) {
    const parts = [];
    for (const fx of enabledEffects(clip)) {
      const def = catalog()?.byType(fx.type);
      if (!def?.css) continue;
      const p = resolveParams(fx, clip, timelineTime ?? clip.start);
      switch (fx.type) {
        case "blur":
          parts.push(`blur(${Math.max(0, p.amount || 0)}px)`);
          break;
        case "sharpen": {
          const a = p.amount || 0;
          const c = 1 + (p.contrastBoost || 0) + a * 0.35;
          parts.push(`contrast(${c})`);
          break;
        }
        case "glow": {
          const r = p.radius || 8;
          const a = p.amount || 0.45;
          parts.push(`brightness(${1 + a * 0.35}) drop-shadow(0 0 ${r}px rgba(255,255,255,${a * 0.65}))`);
          break;
        }
        case "bw":
          parts.push(`grayscale(${p.amount ?? 1})`);
          break;
        case "sepia":
          parts.push(`sepia(${p.amount ?? 0.7})`);
          break;
        case "vintage":
          parts.push(`sepia(${(p.amount || 0.7) * 0.85}) contrast(${1 + (p.amount || 0.7) * 0.15})`);
          break;
        case "highcontrast":
          parts.push(`contrast(${1 + (p.amount || 0.55)})`);
          break;
        case "cold":
          parts.push(`hue-rotate(${(-35 * (p.amount || 0.45)).toFixed(1)}deg) saturate(${1 + (p.amount || 0.45) * 0.15})`);
          break;
        case "warm":
          parts.push(`sepia(${(p.amount || 0.45) * 0.35}) saturate(${1 + (p.amount || 0.45) * 0.2})`);
          break;
        case "shadow": {
          const d = p.distance || 8;
          const b = p.blur || 12;
          const o = p.opacity ?? 0.45;
          parts.push(`drop-shadow(${d}px ${d}px ${b}px rgba(0,0,0,${o}))`);
          break;
        }
        default:
          break;
      }
    }
    return parts.length ? parts.join(" ") : "";
  }

  function hashNoise(x, y, seed) {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43758.5453) * 43758.5453;
    return n - Math.floor(n);
  }

  /**
   * Pixel / overlay pass on an already-drawn canvas context (full frame).
   * Solo algoritmos locales (Canvas 2D). Sin APIs ni modelos de pago.
   */
  function applyPixelEffects(ctx, width, height, clip, timelineTime) {
    const list = enabledEffects(clip).filter((e) => catalog()?.byType(e.type)?.pixel);
    if (!list.length) return;

    if (!applyPixelEffects._scratch) applyPixelEffects._scratch = document.createElement("canvas");
    const scratch = applyPixelEffects._scratch;
    if (scratch.width !== width || scratch.height !== height) {
      scratch.width = width;
      scratch.height = height;
    }
    const sctx = scratch.getContext("2d");

    for (const fx of list) {
      const p = resolveParams(fx, clip, timelineTime);
      const op = Math.min(1, Math.max(0, fx.opacity ?? 1));
      if (op <= 0.001) continue;
      const blend = toCanvasBlend(fx.blendMode || "normal");

      if (fx.type === "vignette") {
        const intensity = (p.intensity ?? 0.55) * op;
        const size = p.size ?? 0.65;
        const soft = p.softness ?? 0.45;
        const bright = p.brightness ?? -1;
        const g = ctx.createRadialGradient(
          width / 2, height / 2, Math.min(width, height) * size * 0.25,
          width / 2, height / 2, Math.min(width, height) * (size + soft)
        );
        if (bright < 0) {
          g.addColorStop(0, "rgba(0,0,0,0)");
          g.addColorStop(1, `rgba(0,0,0,${intensity})`);
        } else {
          g.addColorStop(0, "rgba(255,255,255,0)");
          g.addColorStop(1, `rgba(255,255,255,${intensity * bright})`);
        }
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = blend;
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
        continue;
      }

      if (fx.type === "scanlines") {
        ctx.save();
        ctx.globalAlpha = (p.amount ?? 0.35) * op;
        ctx.globalCompositeOperation = blend;
        ctx.fillStyle = "#000";
        const gap = Math.max(2, p.gap || 3);
        for (let y = 0; y < height; y += gap) ctx.fillRect(0, y, width, 1);
        ctx.restore();
        continue;
      }

      if (fx.type === "lensflare") {
        const cx = (p.x ?? 0.7) * width;
        const cy = (p.y ?? 0.3) * height;
        const size = (p.size ?? 0.45) * Math.min(width, height);
        const bright = (p.brightness ?? 0.7) * op;
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size);
        g.addColorStop(0, `rgba(255,255,230,${bright})`);
        g.addColorStop(0.2, `rgba(255,200,120,${bright * 0.55})`);
        g.addColorStop(1, "rgba(255,180,80,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
        const ax = width - cx;
        const ay = height - cy;
        const g2 = ctx.createRadialGradient(ax, ay, 0, ax, ay, size * 0.35);
        g2.addColorStop(0, `rgba(120,180,255,${bright * 0.35})`);
        g2.addColorStop(1, "rgba(120,180,255,0)");
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(ax, ay, size * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }

      if (fx.type === "softlight") {
        const cx = (p.x ?? 0.3) * width;
        const cy = (p.y ?? 0.25) * height;
        const rad = (p.radius ?? 0.7) * Math.max(width, height);
        const inten = (p.intensity ?? 0.4) * op;
        const temp = p.temperature || 0;
        const r = Math.round(255 + temp * 40);
        const g = Math.round(240 - Math.abs(temp) * 20);
        const b = Math.round(220 - temp * 50);
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        grd.addColorStop(0, `rgba(${r},${g},${b},${inten})`);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
        continue;
      }

      if (fx.type === "lightrays") {
        const inten = (p.intensity ?? 0.45) * op;
        const ang = ((p.angle || 45) * Math.PI) / 180;
        const len = (p.length ?? 0.55) * Math.max(width, height);
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.translate(width / 2, height / 2);
        ctx.rotate(ang);
        for (let i = -6; i <= 6; i++) {
          const alpha = inten * (1 - Math.abs(i) / 7) * 0.35;
          ctx.fillStyle = `rgba(255,240,200,${alpha})`;
          ctx.fillRect(-4 + i * 14, -len, 3, len * 2);
        }
        ctx.restore();
        continue;
      }

      if (fx.type === "directionalblur" || fx.type === "zoomblur" || fx.type === "radialblur" || fx.type === "blankingfill") {
        sctx.clearRect(0, 0, width, height);
        sctx.drawImage(ctx.canvas, 0, 0);
        if (fx.type === "blankingfill") {
          const sc = Math.min(1, Math.max(0.5, p.scale ?? 0.82));
          const blurPx = p.blur ?? 18;
          ctx.save();
          ctx.filter = `blur(${blurPx}px)`;
          ctx.drawImage(scratch, 0, 0, width, height);
          ctx.filter = "none";
          ctx.fillStyle = `rgba(0,0,0,${(p.darken ?? 0.35) * op})`;
          ctx.fillRect(0, 0, width, height);
          const dw = width * sc;
          const dh = height * sc;
          ctx.drawImage(scratch, (width - dw) / 2, (height - dh) / 2, dw, dh);
          ctx.restore();
          continue;
        }
        const samples = Math.max(3, Math.min(16, Math.round(p.samples || 8)));
        const amount = (p.amount ?? 0.45) * op;
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.clearRect(0, 0, width, height);
        ctx.globalAlpha = 1 / samples;
        for (let i = 0; i < samples; i++) {
          const t = (i / (samples - 1) - 0.5) * 2;
          if (fx.type === "directionalblur") {
            const len = (p.length || 12) * amount;
            const rad = ((p.angle || 0) * Math.PI) / 180;
            const dx = Math.cos(rad) * len * t;
            const dy = Math.sin(rad) * len * t;
            ctx.drawImage(scratch, dx, dy);
          } else if (fx.type === "zoomblur") {
            const cx = (p.centerX ?? 0.5) * width;
            const cy = (p.centerY ?? 0.5) * height;
            const scale = 1 + amount * 0.25 * t;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(scale, scale);
            ctx.translate(-cx, -cy);
            ctx.drawImage(scratch, 0, 0);
            ctx.restore();
          } else if (fx.type === "radialblur") {
            const cx = (p.centerX ?? 0.5) * width;
            const cy = (p.centerY ?? 0.5) * height;
            const rot = (amount * 0.12 * t);
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rot);
            ctx.translate(-cx, -cy);
            ctx.drawImage(scratch, 0, 0);
            ctx.restore();
          }
        }
        ctx.restore();
        continue;
      }

      /* getImageData effects */
      let img;
      try {
        img = ctx.getImageData(0, 0, width, height);
      } catch {
        continue;
      }
      const data = img.data;
      const seed = (timelineTime || 0) * 10;

      if (fx.type === "grain" || (fx.type === "vintage" && (p.grain || 0) > 0.01)) {
        const amount = (fx.type === "vintage" ? (p.grain || 0.25) * (p.amount || 0.7) : (p.amount || 0.35)) * op;
        const size = p.size || 1.5;
        for (let y = 0; y < height; y += Math.max(1, Math.floor(size))) {
          for (let x = 0; x < width; x += Math.max(1, Math.floor(size))) {
            const n = (hashNoise(x, y, seed) - 0.5) * 255 * amount;
            for (let dy = 0; dy < size && y + dy < height; dy++) {
              for (let dx = 0; dx < size && x + dx < width; dx++) {
                const i = ((y + dy) * width + (x + dx)) * 4;
                data[i] = Math.min(255, Math.max(0, data[i] + n));
                data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
                data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
              }
            }
          }
        }
      }

      if (fx.type === "posterize") {
        const levels = Math.max(2, Math.round(p.levels || 6));
        const step = 255 / (levels - 1);
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.round(data[i] / step) * step;
          data[i + 1] = Math.round(data[i + 1] / step) * step;
          data[i + 2] = Math.round(data[i + 2] / step) * step;
        }
      }

      if (fx.type === "pixelate") {
        const block = Math.max(2, Math.round(p.block || 12));
        const copy = new Uint8ClampedArray(data);
        for (let y = 0; y < height; y += block) {
          for (let x = 0; x < width; x += block) {
            let r = 0, g = 0, b = 0, a = 0, n = 0;
            for (let dy = 0; dy < block && y + dy < height; dy++) {
              for (let dx = 0; dx < block && x + dx < width; dx++) {
                const i = ((y + dy) * width + (x + dx)) * 4;
                r += copy[i]; g += copy[i + 1]; b += copy[i + 2]; a += copy[i + 3]; n++;
              }
            }
            r /= n; g /= n; b /= n; a /= n;
            for (let dy = 0; dy < block && y + dy < height; dy++) {
              for (let dx = 0; dx < block && x + dx < width; dx++) {
                const i = ((y + dy) * width + (x + dx)) * 4;
                data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a;
              }
            }
          }
        }
      }

      if (fx.type === "rgbsplit") {
        const amt = Math.round((p.amount || 4) * op);
        const copy = new Uint8ClampedArray(data);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const xl = Math.max(0, x - amt);
            const xr = Math.min(width - 1, x + amt);
            data[i] = copy[(y * width + xl) * 4];
            data[i + 2] = copy[(y * width + xr) * 4 + 2];
          }
        }
      }

      if (fx.type === "glitch") {
        const amount = (p.amount || 0.35) * op;
        const slices = Math.max(2, Math.round(p.slices || 6));
        const copy = new Uint8ClampedArray(data);
        const sliceH = Math.floor(height / slices);
        for (let s = 0; s < slices; s++) {
          const shift = Math.round((hashNoise(s, 1, seed) - 0.5) * width * amount * 0.15);
          const y0 = s * sliceH;
          const y1 = s === slices - 1 ? height : y0 + sliceH;
          for (let y = y0; y < y1; y++) {
            for (let x = 0; x < width; x++) {
              const sx = Math.min(width - 1, Math.max(0, x + shift));
              const i = (y * width + x) * 4;
              const j = (y * width + sx) * 4;
              data[i] = copy[j];
              data[i + 1] = copy[j + 1];
              data[i + 2] = copy[j + 2];
              data[i + 3] = copy[j + 3];
            }
          }
        }
      }

      if (fx.type === "filmdamage") {
        const amount = (p.amount || 0.4) * op;
        const scratches = p.scratches ?? 0.35;
        const dust = p.dust ?? 0.3;
        const flicker = (p.flicker ?? 0.2) * (hashNoise(1, 2, seed) - 0.5) * 40 * amount;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, Math.max(0, data[i] + flicker));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + flicker));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + flicker));
        }
        const nScr = Math.floor(scratches * amount * 12);
        for (let s = 0; s < nScr; s++) {
          const x = Math.floor(hashNoise(s, 9, seed) * width);
          const bright = hashNoise(s, 3, seed) > 0.5 ? 220 : 20;
          for (let y = 0; y < height; y++) {
            if (hashNoise(x, y, seed + s) > 0.35) continue;
            const i = (y * width + x) * 4;
            data[i] = data[i + 1] = data[i + 2] = bright;
          }
        }
        const nDust = Math.floor(dust * amount * width * height * 0.0004);
        for (let d = 0; d < nDust; d++) {
          const x = Math.floor(hashNoise(d, 4, seed) * width);
          const y = Math.floor(hashNoise(d, 5, seed) * height);
          const i = (y * width + x) * 4;
          const v = hashNoise(d, 6, seed) > 0.5 ? 255 : 0;
          data[i] = data[i + 1] = data[i + 2] = v;
        }
      }

      if (fx.type === "halftone") {
        const size = Math.max(2, Math.round(p.size || 6));
        const contrast = p.contrast || 1.2;
        const copy = new Uint8ClampedArray(data);
        for (let y = 0; y < height; y += size) {
          for (let x = 0; x < width; x += size) {
            let lum = 0; let n = 0;
            for (let dy = 0; dy < size && y + dy < height; dy++) {
              for (let dx = 0; dx < size && x + dx < width; dx++) {
                const i = ((y + dy) * width + (x + dx)) * 4;
                lum += 0.299 * copy[i] + 0.587 * copy[i + 1] + 0.114 * copy[i + 2];
                n++;
              }
            }
            lum = Math.min(255, Math.max(0, (lum / n - 128) * contrast + 128));
            const radius = (1 - lum / 255) * (size / 2) * op;
            for (let dy = 0; dy < size && y + dy < height; dy++) {
              for (let dx = 0; dx < size && x + dx < width; dx++) {
                const dist = Math.hypot(dx - size / 2, dy - size / 2);
                const i = ((y + dy) * width + (x + dx)) * 4;
                const v = dist <= radius ? 0 : 255;
                data[i] = data[i + 1] = data[i + 2] = v;
              }
            }
          }
        }
      }

      if (fx.type === "deband") {
        const amount = (p.amount || 0.35) * op;
        const dither = (p.dither || 0.45) * amount * 12;
        for (let i = 0; i < data.length; i += 4) {
          const n = (hashNoise(i, 1, seed) - 0.5) * dither;
          data[i] = Math.min(255, Math.max(0, data[i] + n));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
        }
      }

      if (fx.type === "lensdistort") {
        const amt = (p.amount || 0.25) * op;
        const scale = p.scale || 1.05;
        const chroma = (p.chroma || 0.15) * op;
        const copy = new Uint8ClampedArray(data);
        const cx = width / 2;
        const cy = height / 2;
        const maxR = Math.hypot(cx, cy);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const dx = (x - cx) / maxR;
            const dy = (y - cy) / maxR;
            const r2 = dx * dx + dy * dy;
            const f = 1 + amt * r2;
            const sx = Math.round(cx + (dx * f * maxR) / scale);
            const sy = Math.round(cy + (dy * f * maxR) / scale);
            const i = (y * width + x) * 4;
            if (sx < 0 || sy < 0 || sx >= width || sy >= height) {
              data[i] = data[i + 1] = data[i + 2] = 0;
              continue;
            }
            const j = (sy * width + sx) * 4;
            const sxR = Math.min(width - 1, Math.max(0, sx + Math.round(chroma * 3)));
            const sxB = Math.min(width - 1, Math.max(0, sx - Math.round(chroma * 3)));
            data[i] = copy[(sy * width + sxR) * 4];
            data[i + 1] = copy[j + 1];
            data[i + 2] = copy[(sy * width + sxB) * 4 + 2];
          }
        }
      }

      try { ctx.putImageData(img, 0, 0); } catch { /* ignore */ }
    }
  }

  function toCanvasBlend(mode) {
    const map = {
      normal: "source-over",
      multiply: "multiply",
      screen: "screen",
      overlay: "overlay",
      "soft-light": "soft-light",
      "hard-light": "hard-light",
      lighten: "lighten",
      darken: "darken",
      difference: "difference",
      exclusion: "exclusion",
      color: "color",
      luminosity: "luminosity"
    };
    return map[mode] || "source-over";
  }

  function addKeyframe(clip, effectId, timelineTime, paramsPatch) {
    const fx = (clip.effects || []).find((e) => e.id === effectId);
    if (!fx) return;
    const t = localNorm(clip, timelineTime);
    if (!Array.isArray(fx.keyframes)) fx.keyframes = [];
    const existing = fx.keyframes.find((k) => Math.abs(k.t - t) < 0.01);
    const patch = paramsPatch || { ...fx.params };
    if (existing) existing.params = { ...existing.params, ...patch };
    else fx.keyframes.push({ t, params: { ...patch } });
    fx.keyframes.sort((a, b) => a.t - b.t);
  }

  function removeKeyframeNear(clip, effectId, timelineTime) {
    const fx = (clip.effects || []).find((e) => e.id === effectId);
    if (!fx || !fx.keyframes) return;
    const t = localNorm(clip, timelineTime);
    fx.keyframes = fx.keyframes.filter((k) => Math.abs(k.t - t) >= 0.01);
  }

  function addEffectToClip(clip, type, params) {
    ensureClip(clip);
    const inst = createInstance(type, params);
    if (!inst) return null;
    clip.effects.push(inst);
    return inst;
  }

  function removeEffect(clip, effectId) {
    ensureClip(clip);
    clip.effects = clip.effects.filter((e) => e.id !== effectId);
  }

  function resetEffect(clip, effectId) {
    const fx = (clip.effects || []).find((e) => e.id === effectId);
    if (!fx) return;
    const def = catalog()?.byType(fx.type);
    if (def) fx.params = defaultParams(def);
    fx.opacity = 1;
    fx.blendMode = "normal";
  }

  function reorderEffect(clip, effectId, dir) {
    ensureClip(clip);
    const i = clip.effects.findIndex((e) => e.id === effectId);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= clip.effects.length) return;
    const tmp = clip.effects[i];
    clip.effects[i] = clip.effects[j];
    clip.effects[j] = tmp;
  }

  function applyPreset(clip, presetId) {
    const preset = catalog()?.PRESETS?.find((p) => p.id === presetId);
    if (!preset) return;
    ensureClip(clip);
    preset.effects.forEach((e) => addEffectToClip(clip, e.type, e.params));
  }

  function duplicateEffect(clip, effectId) {
    ensureClip(clip);
    const fx = clip.effects.find((e) => e.id === effectId);
    if (!fx) return null;
    const copy = JSON.parse(JSON.stringify(fx));
    copy.id = uid();
    copy.name = `${fx.name || fx.type} (copia)`;
    const i = clip.effects.findIndex((e) => e.id === effectId);
    clip.effects.splice(i + 1, 0, copy);
    return copy;
  }

  global.StudioEffects = {
    ensureClip,
    createInstance,
    addEffectToClip,
    removeEffect,
    resetEffect,
    reorderEffect,
    applyPreset,
    duplicateEffect,
    addKeyframe,
    removeKeyframeNear,
    enabledEffects,
    needsPixelPass,
    needsTransformPass,
    hasAnyEffects,
    transformOverride,
    cssEffectsFilter,
    applyPixelEffects,
    resolveParams,
    localNorm,
    defaultParams,
    toCanvasBlend
  };
})(typeof window !== "undefined" ? window : globalThis);
