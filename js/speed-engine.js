/**
 * Control de velocidad: rate, inversa, rampas, mapeo timeline ↔ source.
 */
(function (global) {
  function ensureClip(clip) {
    if (!clip) return clip;
    if (!clip.speed || typeof clip.speed !== "object") {
      clip.speed = {
        rate: 1,
        reverse: false,
        keepPitch: true,
        muteAudio: false,
        ramp: null
      };
    }
    if (clip.speed.rate == null) clip.speed.rate = 1;
    if (clip.speed.reverse == null) clip.speed.reverse = false;
    if (clip.speed.keepPitch == null) clip.speed.keepPitch = true;
    return clip;
  }

  function hasRamp(clip) {
    ensureClip(clip);
    return Array.isArray(clip.speed.ramp) && clip.speed.ramp.length >= 2;
  }

  function rateAtLocal(clip, localTimeline) {
    ensureClip(clip);
    const d = Math.max(0.001, clip.duration || 1);
    const t = Math.min(1, Math.max(0, localTimeline / d));
    if (!hasRamp(clip)) return Math.max(0.05, Number(clip.speed.rate) || 1);

    const ramp = [...clip.speed.ramp].sort((a, b) => a.t - b.t);
    if (t <= ramp[0].t) return Math.max(0.05, ramp[0].rate);
    if (t >= ramp[ramp.length - 1].t) return Math.max(0.05, ramp[ramp.length - 1].rate);
    for (let i = 0; i < ramp.length - 1; i++) {
      const a = ramp[i];
      const b = ramp[i + 1];
      if (t >= a.t && t <= b.t) {
        const u = (t - a.t) / Math.max(0.001, b.t - a.t);
        const smooth = u * u * (3 - 2 * u);
        return Math.max(0.05, a.rate + (b.rate - a.rate) * smooth);
      }
    }
    return Math.max(0.05, Number(clip.speed.rate) || 1);
  }

  /**
   * Integra velocidad a lo largo del clip timeline → offset en tiempo de fuente (desde sourceStart).
   * Para rate constante: sourceOffset = local * rate
   * Para rampas: integra rate(t)*dt
   */
  function sourceOffsetForLocal(clip, localTimeline) {
    ensureClip(clip);
    const local = Math.max(0, localTimeline);
    if (!hasRamp(clip)) {
      return local * Math.max(0.05, Number(clip.speed.rate) || 1);
    }
    /* Integración por pasos */
    const steps = Math.max(8, Math.ceil(local * 60));
    const dt = local / steps;
    let acc = 0;
    for (let i = 0; i < steps; i++) {
      const tMid = (i + 0.5) * dt;
      acc += rateAtLocal(clip, tMid) * dt;
    }
    return acc;
  }

  /**
   * Tiempo de media (currentTime del video) para un instante de timeline.
   */
  function mapTimelineToSource(clip, timelineTime) {
    ensureClip(clip);
    if (clip.type === "image" || clip.freezeFrame) {
      if (clip.freezeSourceTime != null) return clip.freezeSourceTime;
      return clip.sourceStart || 0;
    }
    const local = Math.min(
      Math.max(timelineTime - clip.start, 0),
      Math.max(0, (clip.duration || 0) - 0.01)
    );
    const offset = sourceOffsetForLocal(clip, local);
    const mediaDur = clip._mediaDuration || clip.sourceDuration || 1e9;
    const base = clip.sourceStart || 0;

    if (clip.speed.reverse) {
      const span = sourceOffsetForLocal(clip, clip.duration || local);
      const src = base + Math.max(0, span - offset);
      return Math.min(Math.max(0, src), Math.max(0, mediaDur - 0.01));
    }
    return Math.min(Math.max(0, base + offset), Math.max(0, mediaDur - 0.01));
  }

  /** Duración en timeline dada una duración de fuente efectiva a rate constante */
  function timelineDurationFromSource(sourceLen, rate) {
    const r = Math.max(0.05, rate || 1);
    return sourceLen / r;
  }

  /**
   * Aplica rate constante: ajusta duración del clip y desplaza clips posteriores en la misma pista.
   * sourceContentLen = duración del medio usado (media.duration - sourceStart) a rate 1.
   */
  function applyConstantRate(clip, newRate, allClips, mediaDuration) {
    ensureClip(clip);
    const rate = Math.max(0.05, Math.min(16, Number(newRate) || 1));
    const srcLen = Math.max(
      0.1,
      (mediaDuration != null ? mediaDuration : (clip._mediaDuration || clip.duration)) - (clip.sourceStart || 0)
    );
    /* Conservar contenido fuente visible: duration_timeline = srcLen / rate */
    const oldEnd = clip.start + clip.duration;
    const newDur = timelineDurationFromSource(srcLen, rate);
    const delta = newDur - clip.duration;
    clip.speed.rate = rate;
    clip.speed.ramp = null;
    clip.duration = Math.max(0.1, newDur);
    clip._mediaDuration = mediaDuration != null ? mediaDuration : clip._mediaDuration;

    if (Math.abs(delta) > 0.001 && Array.isArray(allClips)) {
      allClips.forEach((c) => {
        if (c.id === clip.id) return;
        if (c.track !== clip.track) return;
        if (c.start >= oldEnd - 0.001) c.start += delta;
      });
    }
    return clip;
  }

  function setReverse(clip, reverse) {
    ensureClip(clip);
    clip.speed.reverse = Boolean(reverse);
  }

  function setKeepPitch(clip, keep) {
    ensureClip(clip);
    clip.speed.keepPitch = Boolean(keep);
  }

  function setRamp(clip, points) {
    ensureClip(clip);
    if (!points || points.length < 2) {
      clip.speed.ramp = null;
      return;
    }
    clip.speed.ramp = points.map((p) => ({
      t: Math.min(1, Math.max(0, p.t)),
      rate: Math.max(0.05, Math.min(16, p.rate))
    })).sort((a, b) => a.t - b.t);
  }

  function rampPresets() {
    return [
      { id: "slow-center", name: "Cámara lenta central", points: [{ t: 0, rate: 1 }, { t: 0.35, rate: 0.35 }, { t: 0.65, rate: 0.35 }, { t: 1, rate: 1 }] },
      { id: "fast-in", name: "Entrada rápida", points: [{ t: 0, rate: 2.5 }, { t: 0.4, rate: 1 }, { t: 1, rate: 1 }] },
      { id: "fast-out", name: "Salida rápida", points: [{ t: 0, rate: 1 }, { t: 0.6, rate: 1 }, { t: 1, rate: 2.5 }] },
      { id: "slow-to-fast", name: "Lento a rápido", points: [{ t: 0, rate: 0.4 }, { t: 1, rate: 2 }] },
      { id: "fast-to-slow", name: "Rápido a lento", points: [{ t: 0, rate: 2 }, { t: 1, rate: 0.4 }] },
      { id: "cinematic", name: "Cinematográfico", points: [{ t: 0, rate: 1 }, { t: 0.25, rate: 0.55 }, { t: 0.75, rate: 0.55 }, { t: 1, rate: 1.2 }] }
    ];
  }

  function instantRate(clip, timelineTime) {
    ensureClip(clip);
    const local = Math.max(0, timelineTime - clip.start);
    let r = rateAtLocal(clip, local);
    if (clip.speed.reverse) r = -Math.abs(r);
    return r;
  }

  global.StudioSpeed = {
    ensureClip,
    hasRamp,
    rateAtLocal,
    sourceOffsetForLocal,
    mapTimelineToSource,
    timelineDurationFromSource,
    applyConstantRate,
    setReverse,
    setKeepPitch,
    setRamp,
    rampPresets,
    instantRate
  };
})(typeof window !== "undefined" ? window : globalThis);
