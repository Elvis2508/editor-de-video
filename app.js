"use strict";

const $ = (id) => document.getElementById(id);

const ui = {
  video: $("programVideo"),
  videoSecondary: $("programVideoSecondary"),
  image: $("programImage"),
  imageSecondary: $("programImageSecondary"),
  imageOverlay: $("programImageOverlay"),
  transitionOverlay: $("transitionOverlay"),
  text: $("programTextLayer"),
  empty: $("programEmpty"),
  play: $("playBtn"),
  centerPlay: $("centerPlayBtn"),
  status: $("status"),
  time: $("timeDisplay"),
  timeCurrent: $("timeCurrent"),
  timeTotal: $("timeTotal"),
  overlayTimeCurrent: $("overlayTimeCurrent"),
  overlayTimeTotal: $("overlayTimeTotal"),
  overlayTimeRemain: $("overlayTimeRemain"),
  transportTimeCurrent: $("transportTimeCurrent"),
  transportTimeTotal: $("transportTimeTotal"),
  seek: $("seekBar"),
  ruler: $("ruler"),
  timeline: $("timeline"),
  playhead: $("playhead"),
  tracks: $("tracksContainer"),
  mediaLibrary: $("mediaLibrary"),
  transitionsCatalog: $("transitionsCatalog"),
  textSelectionBox: $("textSelectionBox"),
  textSelectionLabel: $("textSelectionLabel"),
  selectionOverlay: $("selectionOverlay"),
  guideVertical: $("guideVertical"),
  guideHorizontal: $("guideHorizontal"),
  canvas: $("programCanvas"),
  downloadLink: $("downloadLink"),
  exportProgress: $("exportProgress"),
  exportStatus: $("exportStatus")
};

const TRANSITION_PRESETS = [
  /* Corte */
  { id: "cut", name: "Corte directo", category: "Corte", direction: "left", defaultDuration: 0.08, easing: "linear", hint: "Cambio instantáneo" },

  /* Fundido (Fade) */
  { id: "fade-black", name: "Fundido a negro", category: "Fundido (Fade)", direction: "left", hint: "Fade through black" },
  { id: "fade-white", name: "Fundido a blanco", category: "Fundido (Fade)", direction: "left", hint: "Fade through white" },
  { id: "fade-soft", name: "Fundido suave", category: "Fundido (Fade)", direction: "left", hint: "Dip to dark gray" },

  /* Disolvencia (Crossfade / Dissolve) */
  { id: "dissolve", name: "Disolvencia (Crossfade)", category: "Disolvencia", direction: "left", hint: "Mezcla entre clips" },
  { id: "dissolve-soft", name: "Disolvencia suave", category: "Disolvencia", direction: "left", easing: "ease-in-out", hint: "Crossfade suave" },
  { id: "dissolve-bright", name: "Disolvencia luminosa", category: "Disolvencia", direction: "left", hint: "Mezcla brillante" },
  { id: "blur", name: "Disolvencia con desenfoque", category: "Disolvencia", direction: "left", hint: "Blur dissolve" },

  /* Barrido (Wipe) */
  { id: "wipe", name: "Barrido izquierda", category: "Barrido (Wipe)", direction: "left", hint: "Wipe left" },
  { id: "wipe-right", name: "Barrido derecha", category: "Barrido (Wipe)", direction: "right", effect: "wipe", hint: "Wipe right" },
  { id: "wipe-up", name: "Barrido arriba", category: "Barrido (Wipe)", direction: "up", effect: "wipe", hint: "Wipe up" },
  { id: "wipe-down", name: "Barrido abajo", category: "Barrido (Wipe)", direction: "down", effect: "wipe", hint: "Wipe down" },
  { id: "wipe-iris", name: "Iris circular", category: "Barrido (Wipe)", direction: "left", hint: "Apertura circular" },
  { id: "wipe-diagonal", name: "Barrido diagonal", category: "Barrido (Wipe)", direction: "left", hint: "Wipe diagonal" },
  { id: "wipe-barn", name: "Barrido central", category: "Barrido (Wipe)", direction: "left", hint: "Barn doors" },

  /* Movimiento */
  { id: "slide", name: "Empuje (Push)", category: "Movimiento", direction: "left", hint: "Ambos clips se desplazan" },
  { id: "slide-right", name: "Empuje derecha", category: "Movimiento", direction: "right", effect: "slide", hint: "Push right" },
  { id: "slide-up", name: "Empuje arriba", category: "Movimiento", direction: "up", effect: "slide", hint: "Push up" },
  { id: "slide-down", name: "Empuje abajo", category: "Movimiento", direction: "down", effect: "slide", hint: "Push down" },
  { id: "slide-cover", name: "Cubrir (Cover)", category: "Movimiento", direction: "left", hint: "El nuevo cubre al anterior" },
  { id: "slide-reveal", name: "Revelar (Reveal)", category: "Movimiento", direction: "left", hint: "El anterior se retira" },
  { id: "zoom", name: "Zoom acercamiento", category: "Movimiento", direction: "left", hint: "Zoom in" },
  { id: "zoom-out", name: "Zoom alejamiento", category: "Movimiento", direction: "left", hint: "Zoom out" },
  { id: "spin", name: "Giro", category: "Movimiento", direction: "left", hint: "Rotación entre clips" },

  /* Ópticos */
  { id: "flash", name: "Flash", category: "Ópticos", direction: "left", hint: "Destello blanco" }
];

function transitionEffectId(typeOrPreset) {
  if (!typeOrPreset) return "dissolve";
  if (typeof typeOrPreset === "object") return typeOrPreset.effect || typeOrPreset.id;
  const preset = transitionPresetById(typeOrPreset);
  return preset.effect || preset.id || typeOrPreset;
}

/** Ancho del encabezado de pista; debe coincidir con CSS (.track-label-spacer / grid 72px). */
const TRACK_LABEL_WIDTH = 72;
/** Tolerancia visual del pegado magnético (píxeles → tiempo vía pixelsPerSecond). */
const MAGNETIC_SNAP_PX = 12;

const state = {
  media: [],
  clips: [],
  tracks: [
    { id: "V1", type: "video", name: "Video 1" },
    { id: "V2", type: "video", name: "Imagen" },
    { id: "FX1", type: "transition", name: "Transiciones" },
    { id: "V3", type: "text", name: "Títulos" },
    { id: "A1", type: "audio", name: "Audio 1" },
    { id: "A2", type: "audio", name: "Música" }
  ],
  selectedId: null,
  currentTime: 0,
  playing: false,
  pixelsPerSecond: 90,
  tool: "select",
  masterVolume: 1,
  exportQueue: [],
  exporting: false,
  selectedTransitionPreset: "dissolve",
  effectsCompare: false,
  effectsClipboard: null,
  magneticSnap: true,
  exportDeterministic: false,
  exportDebug: false
};

let animationFrame = 0;
let previousFrameTime = 0;
let activeVideoMediaId = null;
let activeVideoClipId = null;
let activeSecondaryMediaId = null;
let activeAudio = null;
let objectUrls = [];
let playheadDragging = false;
let textDragging = null;
let textResizing = null;
let imageDragging = null;
let imageResizing = null;
let suppressMonitorClick = false;
let previewSeq = 0;
let lastPreviewHadTransition = false;

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const selectedClip = () => state.clips.find((clip) => clip.id === state.selectedId) || null;
const mediaById = (id) => state.media.find((media) => media.id === id) || null;
const projectDuration = () => {
  if (!state.clips.length) return 0;
  return Math.max(0, ...state.clips.map((clip) => clip.start + clip.duration));
};

function setStatus(message) {
  ui.status.textContent = message;
}

function formatTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = String(Math.floor(safe / 60)).padStart(2, "0");
  const secs = String(Math.floor(safe % 60)).padStart(2, "0");
  return `${minutes}:${secs}`;
}

/** Timecode de edición con centésimas (más preciso al scrubear/reproducir) */
function formatTimecode(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const centis = Math.floor((safe % 1) * 100);
  const mm = String(minutes).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  const cc = String(centis).padStart(2, "0");
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${mm}:${ss}.${cc}`;
  }
  return `${mm}:${ss}.${cc}`;
}

function updatePlayhead() {
  const total = projectDuration();
  /* Origen lógico y visual: tiempo 0 → left = TRACK_LABEL_WIDTH (sin margen fantasma). */
  const current = Math.max(0, Math.min(total || 0, state.currentTime));
  state.currentTime = current;
  const remain = Math.max(0, total - current);
  const currentLabel = formatTimecode(current);
  const totalLabel = formatTimecode(total);
  const remainLabel = `−${formatTimecode(remain)}`;

  ui.playhead.style.left = `${TRACK_LABEL_WIDTH + current * state.pixelsPerSecond}px`;
  if (ui.timeCurrent) ui.timeCurrent.textContent = currentLabel;
  if (ui.timeTotal) ui.timeTotal.textContent = totalLabel;
  if (ui.time && !ui.timeCurrent) ui.time.textContent = `${formatTime(current)} / ${formatTime(total)}`;

  if (ui.overlayTimeCurrent) ui.overlayTimeCurrent.textContent = currentLabel;
  if (ui.overlayTimeTotal) ui.overlayTimeTotal.textContent = totalLabel;
  if (ui.overlayTimeRemain) ui.overlayTimeRemain.textContent = remainLabel;

  if (ui.transportTimeCurrent) ui.transportTimeCurrent.textContent = currentLabel;
  if (ui.transportTimeTotal) ui.transportTimeTotal.textContent = totalLabel;

  ui.seek.value = total ? Math.round((current / total) * 1000) : 0;
}

/** Tiempo de timeline → píxeles dentro del área de pista (sin encabezado). */
function timeToTrackPixels(time) {
  return Math.max(0, Number(time) || 0) * state.pixelsPerSecond;
}

/** Píxeles en área de pista → tiempo (origen = 0). */
function trackPixelsToTime(px) {
  return Math.max(0, (Number(px) || 0) / state.pixelsPerSecond);
}

/** Fin efectivo del clip en la línea de tiempo (duración de visualización). */
function clipTimelineEnd(clip) {
  return (Number(clip?.start) || 0) + (Number(clip?.duration) || 0);
}

/**
 * Pegado magnético: alinea inicio (o fin) del clip en movimiento con bordes de otros clips o t=0.
 * La posición final se guarda en tiempo exacto; la tolerancia solo es visual (px).
 */
function applyMagneticSnap(clip, proposedStart, excludeId = clip?.id) {
  const start0 = Math.max(0, Number(proposedStart) || 0);
  if (!state.magneticSnap || !clip) {
    return { start: start0, snapped: false, guideTime: null };
  }
  const tol = MAGNETIC_SNAP_PX / Math.max(1, state.pixelsPerSecond);
  const duration = Math.max(0, Number(clip.duration) || 0);
  const candidates = [0];
  for (const other of state.clips) {
    if (!other || other.id === excludeId) continue;
    candidates.push(Number(other.start) || 0);
    candidates.push(clipTimelineEnd(other));
  }

  let best = start0;
  let bestDist = Infinity;
  let guideTime = null;

  for (const edge of candidates) {
    const d = Math.abs(start0 - edge);
    if (d <= tol && d < bestDist) {
      bestDist = d;
      best = edge;
      guideTime = edge;
    }
  }

  const proposedEnd = start0 + duration;
  for (const edge of candidates) {
    const alignedStart = edge - duration;
    if (alignedStart < -1e-9) continue;
    const d = Math.abs(proposedEnd - edge);
    if (d <= tol && d < bestDist) {
      bestDist = d;
      best = Math.max(0, alignedStart);
      guideTime = edge;
    }
  }

  const snapped = bestDist < Infinity && bestDist <= tol;
  /* Cuantiza a milisegundos para igualdad exacta entre bordes (inicio2 = fin1). */
  const quantized = Math.round(Math.max(0, best) * 1000) / 1000;
  return {
    start: quantized,
    snapped,
    guideTime: snapped && guideTime != null ? Math.round(guideTime * 1000) / 1000 : null
  };
}

function showMagneticGuide(time) {
  const el = $("magneticGuide");
  if (!el) return;
  if (time == null || !Number.isFinite(time)) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.style.left = `${TRACK_LABEL_WIDTH + timeToTrackPixels(time)}px`;
}

function hideMagneticGuide() {
  const el = $("magneticGuide");
  if (el) el.hidden = true;
}

function syncMagneticToggleUi() {
  const btn = $("magneticSnapBtn");
  if (!btn) return;
  btn.classList.toggle("active", Boolean(state.magneticSnap));
  btn.setAttribute("aria-pressed", state.magneticSnap ? "true" : "false");
  btn.title = state.magneticSnap
    ? "Pegado magnético activo (clic para desactivar)"
    : "Pegado magnético desactivado (clic para activar)";
}

function activeClip(type, time = state.currentTime) {
  return state.clips
    .filter((clip) => clip.type === type && time >= clip.start && time < clip.start + clip.duration)
    .sort((a, b) => b.start - a.start)[0] || null;
}

/** Opacidad visual con fundidos de entrada/salida (imagen/video/texto) */
function clipVisualOpacity(clip, time = state.currentTime) {
  if (!clip) return 0;
  let opacity = clip.opacity ?? 1;
  const local = time - clip.start;
  const fadeIn = Number(clip.fadeIn) || 0;
  const fadeOut = Number(clip.fadeOut) || 0;
  if (fadeIn > 0 && local >= 0 && local < fadeIn) opacity *= local / fadeIn;
  if (fadeOut > 0 && local >= 0 && clip.duration - local < fadeOut) {
    opacity *= Math.max(0, (clip.duration - local) / fadeOut);
  }
  return Math.max(0, Math.min(1, opacity));
}

/**
 * Imágenes V2 que deben superponerse (no son extremos de la transición activa).
 * Así la imagen permanece visible encima del crossfade.
 */
function overlayImageClipsAt(time = state.currentTime, transition = null) {
  const tr = transition || activeClip("transition", time);
  const skip = new Set();
  if (tr?.fromClipId) skip.add(tr.fromClipId);
  if (tr?.toClipId) skip.add(tr.toClipId);
  return state.clips
    .filter((clip) => clip.type === "image"
      && time >= clip.start
      && time < clip.start + clip.duration
      && !skip.has(clip.id))
    .sort((a, b) => a.start - b.start);
}

function trackFor(type) {
  if (type === "video") return "V1";
  if (type === "image") return "V2";
  if (type === "text") return "V3";
  if (type === "transition") return "FX1";
  return "A2";
}

function getMediaDuration(file, type) {
  if (type === "image") return Promise.resolve(5);
  return new Promise((resolve) => {
    const element = document.createElement(type === "audio" ? "audio" : "video");
    const url = URL.createObjectURL(file);
    const finish = (value) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(value) && value > 0 ? value : 5);
    };
    element.preload = "metadata";
    element.onloadedmetadata = () => finish(element.duration);
    element.onerror = () => finish(5);
    element.src = url;
  });
}

async function importFiles(files, type) {
  for (const file of files) {
    const url = URL.createObjectURL(file);
    objectUrls.push(url);
    state.media.push({
      id: uid(),
      type,
      name: file.name,
      url,
      duration: await getMediaDuration(file, type)
    });
  }
  renderMediaLibrary();
  setStatus(`${files.length} archivo(s) importado(s).`);
}

function renderMediaLibrary() {
  ui.mediaLibrary.innerHTML = "";
  if (!state.media.length) {
    ui.mediaLibrary.innerHTML = '<p class="muted">No hay medios importados.</p>';
    return;
  }

  for (const media of state.media) {
    const row = document.createElement("div");
    row.className = "media-item";
    row.innerHTML = `
      <span>${media.type.toUpperCase()}</span>
      <div><strong></strong><small>${formatTime(media.duration)}</small></div>
      <button type="button">＋</button>
    `;
    row.querySelector("strong").textContent = media.name;
    row.querySelector("button").addEventListener("click", () => addMedia(media));
    ui.mediaLibrary.appendChild(row);
  }
}

async function addMedia(media) {
  const visuals = state.clips.filter((clip) => clip.type === "video" || clip.type === "image");
  let start = state.currentTime;

  /* Video y foto se encadenan en secuencia para que las transiciones encuentren cortes */
  if (media.type === "video" || media.type === "image") {
    start = visuals.length
      ? Math.round(Math.max(...visuals.map((clip) => clip.start + clip.duration)) * 1000) / 1000
      : 0;
  } else if (state.magneticSnap) {
    const snap = applyMagneticSnap(
      { id: "__pending__", duration: media.duration || 1, start: 0 },
      start,
      "__pending__"
    );
    start = snap.start;
  }

  const clip = {
    id: uid(),
    mediaId: media.id,
    type: media.type,
    track: trackFor(media.type),
    name: media.name,
    start,
    duration: media.duration,
    sourceStart: 0,
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    opacity: 1,
    brightness: 1,
    contrast: 1,
    saturation: 1,
    temperature: 0,
    volume: media.type === "audio" ? 0.7 : 1,
    muted: false,
    fadeIn: 0,
    fadeOut: 0,
    effects: [],
    speed: { rate: 1, reverse: false, keepPitch: true, muteAudio: false, ramp: null },
    _mediaDuration: media.duration
  };
  if (window.StudioEffects) window.StudioEffects.ensureClip(clip);
  if (window.StudioSpeed) window.StudioSpeed.ensureClip(clip);

  state.clips.push(clip);
  state.selectedId = clip.id;
  state.currentTime = clip.start;
  await renderAll();
  setStatus(`${media.name} agregado en secuencia (${formatTime(start)}).`);
}

function addText(kind, content) {
  const config = {
    title: { name: "Título", y: -180, size: 52 },
    subtitle: { name: "Subtítulo", y: -100, size: 32 },
    footer: { name: "Pie corporativo", y: 260, size: 22 }
  }[kind];

  const clip = {
    id: uid(),
    type: "text",
    track: "V3",
    name: config.name,
    text: content,
    start: state.currentTime,
    duration: 5,
    x: 0,
    y: config.y,
    scale: 1,
    rotation: 0,
    opacity: 1,
    fontSize: config.size,
    color: "#ffffff",
    background: "#0a3768",
    backgroundTransparent: false,
    layerPosition: "front"
  };

  state.clips.push(clip);
  state.selectedId = clip.id;
  renderAll();
}

function easeProgress(value, easing = "linear") {
  const t = Math.min(1, Math.max(0, value));
  if (easing === "ease-in") return t * t;
  if (easing === "ease-out") return 1 - (1 - t) * (1 - t);
  if (easing === "ease-in-out") return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
  return t;
}

function visualClips() {
  return state.clips
    .filter((clip) => clip.type === "video" || clip.type === "image")
    .sort((a, b) => a.start - b.start || a.duration - b.duration);
}

function findNearestCut(time = state.currentTime) {
  const clips = visualClips();
  if (!clips.length) return null;

  /* Un solo video o foto: fundido de entrada o salida */
  if (clips.length === 1) {
    const only = clips[0];
    const start = only.start;
    const end = only.start + only.duration;
    if (Math.abs(time - start) <= Math.abs(time - end)) {
      return { from: null, to: only, cut: start, mode: "in" };
    }
    return { from: only, to: null, cut: end, mode: "out" };
  }

  let best = null;
  let bestScore = Infinity;

  const consider = (from, to, cut, mode = "pair") => {
    const gap = to.start - cut;
    /* Permite solapes de disolvenias (~2–3 s); evita pares absurdos */
    if (gap < -4.5 || gap > 10) return;
    const distance = Math.abs(time - cut);
    const score = distance + Math.max(0, gap) * 0.12;
    if (score < bestScore) {
      bestScore = score;
      best = { from, to, cut, mode };
    }
  };

  /* Pares consecutivos en el tiempo (video↔foto en cualquier pista) */
  for (let index = 0; index < clips.length - 1; index += 1) {
    const from = clips[index];
    const to = clips[index + 1];
    consider(from, to, from.start + from.duration);
  }

  /* Cualquier par secuencia (mezcla foto + video con distinto espaciado) */
  for (const from of clips) {
    for (const to of clips) {
      if (from.id === to.id) continue;
      if (to.start + 0.001 < from.start) continue;
      consider(from, to, from.start + from.duration);
    }
  }

  /* Si el cabezal está al inicio o final del primer/último clip, permitir fundido */
  if (!best || bestScore > 2.5) {
    const first = clips[0];
    const last = clips[clips.length - 1];
    const firstStart = first.start;
    const lastEnd = last.start + last.duration;
    if (Math.abs(time - firstStart) <= 1.25) {
      const score = Math.abs(time - firstStart);
      if (score < bestScore) {
        bestScore = score;
        best = { from: null, to: first, cut: firstStart, mode: "in" };
      }
    }
    if (Math.abs(time - lastEnd) <= 1.25) {
      const score = Math.abs(time - lastEnd);
      if (score < bestScore) {
        best = { from: last, to: null, cut: lastEnd, mode: "out" };
      }
    }
  }

  return best;
}

function transitionPresetById(id) {
  return TRANSITION_PRESETS.find((item) => item.id === id)
    || TRANSITION_PRESETS.find((item) => item.id === "dissolve")
    || TRANSITION_PRESETS[0];
}

/**
 * Crossfade/wipe necesitan solape temporal real de clips A y B.
 * Sin solape, en export un lado queda fuera de rango o congelado → parece un corte.
 * No extender un clip más allá del media disponible (evita “freeze” de último frame).
 */
function mediaPlayableDuration(clip) {
  if (!clip) return 0;
  const media = mediaById(clip.mediaId);
  const md = Number(media?.duration);
  if (Number.isFinite(md) && md > 0.05) {
    return Math.max(0.05, md - (Number(clip.sourceStart) || 0));
  }
  return Math.max(0.05, Number(clip.duration) || 0.05);
}

function ensureTransitionClipOverlap(from, to, trStart, trDuration) {
  if (!from || !to || !(trDuration > 0)) return;
  const trEnd = trStart + trDuration;
  const fromMax = mediaPlayableDuration(from);
  const toMax = mediaPlayableDuration(to);

  /* Extender A hasta el final de la transición, sin pasar el media */
  const wantFromDur = Math.min(fromMax, Math.max(from.duration, trEnd - from.start));
  if (wantFromDur > from.duration) from.duration = wantFromDur;

  /* Adelantar B para cubrir el inicio de la transición */
  if (to.start > trStart + 0.0005) {
    const shift = to.start - trStart;
    const newStart = trStart;
    const newDur = Math.min(toMax, to.duration + shift);
    to.start = newStart;
    to.duration = Math.max(0.05, newDur);
  }

  /* Garantizar cobertura de trEnd sin exceder media de B */
  if (to.start + to.duration < trEnd - 0.0005) {
    to.duration = Math.min(toMax, Math.max(to.duration, trEnd - to.start));
  }
}

function ensureAllTransitionsOverlap() {
  for (const tr of state.clips) {
    if (tr.type !== "transition") continue;
    if ((tr.transitionType || "dissolve") === "cut") continue;
    const from = tr.fromClipId ? state.clips.find((c) => c.id === tr.fromClipId) : null;
    const to = tr.toClipId ? state.clips.find((c) => c.id === tr.toClipId) : null;
    ensureTransitionClipOverlap(from, to, tr.start, tr.duration);
  }
}

function insertTransition(presetId, atTime = state.currentTime) {
  const pair = findNearestCut(atTime);
  if (!pair) {
    setStatus("Agregue al menos un video o una foto a la línea de tiempo.");
    return null;
  }

  const preset = transitionPresetById(presetId);
  const fallbackDuration = Number($("transitionDefaultDuration")?.value) || 1;
  const requested = preset.defaultDuration != null ? preset.defaultDuration : fallbackDuration;
  const minDuration = preset.id === "cut" ? 0.05 : 0.2;
  const duration = Math.max(minDuration, requested);

  const fromDur = pair.from ? pair.from.duration : Infinity;
  const toDur = pair.to ? pair.to.duration : Infinity;
  const maxSpan = Math.max(minDuration, Math.min(duration, fromDur, toDur));

  let start;
  if (pair.mode === "in") start = Math.max(0, pair.cut);
  else if (pair.mode === "out") start = Math.max(0, pair.cut - maxSpan);
  else start = Math.max(0, pair.cut - maxSpan / 2);

  const fromId = pair.from ? pair.from.id : null;
  const toId = pair.to ? pair.to.id : null;

  /* Solo sustituye la transición del mismo empalme; el resto se conserva (ilimitadas) */
  state.clips = state.clips.filter((clip) => {
    if (clip.type !== "transition") return true;
    const sameFrom = (clip.fromClipId || null) === fromId;
    const sameTo = (clip.toClipId || null) === toId;
    return !(sameFrom && sameTo);
  });

  /* Solape obligatorio para disolvenias / wipes (no para corte) */
  if (preset.id !== "cut" && pair.from && pair.to) {
    ensureTransitionClipOverlap(pair.from, pair.to, start, maxSpan);
  }

  const clip = {
    id: uid(),
    type: "transition",
    track: "FX1",
    name: preset.name,
    transitionType: preset.id,
    start,
    duration: maxSpan,
    intensity: 1,
    direction: preset.direction || "left",
    easing: preset.easing || "ease-in-out",
    fromClipId: fromId,
    toClipId: toId,
    scale: 1,
    opacity: 1,
    x: 0,
    y: 0,
    rotation: 0
  };

  state.clips.push(clip);
  state.selectedId = clip.id;
  state.currentTime = start + maxSpan / 2;
  renderAll();

  const count = state.clips.filter((item) => item.type === "transition").length;
  setStatus(`Transición «${preset.name}» aplicada. Total en proyecto: ${count}.`);
  return clip;
}

function ensureTransitionTypeOptions() {
  const selects = [$("propTransitionType"), $("inlineTransitionType")].filter(Boolean);
  for (const typeSelect of selects) {
    if (typeSelect.options.length) continue;
    typeSelect.innerHTML = TRANSITION_PRESETS.map((preset) =>
      `<option value="${preset.id}">${preset.category}: ${preset.name}</option>`
    ).join("");
  }
}

function seekIntoTransition(clip) {
  if (!clip || clip.type !== "transition") return;
  state.currentTime = clip.start + Math.max(0.01, clip.duration * 0.5);
  updatePlayhead();
}

function openModulePanel(panelId) {
  document.querySelectorAll(".module-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.panel === panelId);
  });
  document.querySelectorAll(".side-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === panelId);
  });
}

function applyEffectToSelectedTransition(presetId) {
  const clip = selectedClip();
  const preset = transitionPresetById(presetId);
  if (!clip || clip.type !== "transition") return false;

  clip.transitionType = preset.id;
  clip.name = preset.name;
  if (preset.direction) clip.direction = preset.direction;
  if (preset.easing) clip.easing = preset.easing;
  seekIntoTransition(clip);
  renderAll();
  setStatus(`Efecto actualizado: «${preset.name}».`);
  return true;
}

function syncTransitionEditors(clip) {
  if (!clip || clip.type !== "transition") {
    if ($("transitionInlineEditor")) $("transitionInlineEditor").hidden = true;
    return;
  }

  ensureTransitionTypeOptions();

  $("propName").value = clip.name || "";
  $("propStart").value = Number(clip.start).toFixed(2);
  $("propDuration").value = Number(clip.duration).toFixed(2);

  if ($("propTransitionStart")) $("propTransitionStart").value = Number(clip.start).toFixed(2);
  if ($("propTransitionDuration")) $("propTransitionDuration").value = Number(clip.duration).toFixed(2);
  $("propTransitionType").value = clip.transitionType || "dissolve";
  $("propTransitionIntensity").value = clip.intensity ?? 1;
  $("propTransitionDirection").value = clip.direction || "left";
  $("propTransitionEasing").value = clip.easing || "ease-in-out";

  if ($("transitionInlineEditor")) {
    $("transitionInlineEditor").hidden = false;
    $("transitionInlineLabel").textContent = clip.name || "Transición";
    $("inlineTransitionStart").value = Number(clip.start).toFixed(2);
    $("inlineTransitionDuration").value = Number(clip.duration).toFixed(2);
    $("inlineTransitionType").value = clip.transitionType || "dissolve";
    $("inlineTransitionIntensity").value = clip.intensity ?? 1;
    $("inlineTransitionDirection").value = clip.direction || "left";
    $("inlineTransitionEasing").value = clip.easing || "ease-in-out";
  }
}

function updateSelectedTransitionFromEditors(source = "prop") {
  const clip = selectedClip();
  if (!clip || clip.type !== "transition") return;

  const useInline = source === "inline";
  const startEl = $(useInline ? "inlineTransitionStart" : "propTransitionStart") || $("propStart");
  const durationEl = $(useInline ? "inlineTransitionDuration" : "propTransitionDuration") || $("propDuration");
  const typeEl = $(useInline ? "inlineTransitionType" : "propTransitionType");
  const intensityEl = $(useInline ? "inlineTransitionIntensity" : "propTransitionIntensity");
  const directionEl = $(useInline ? "inlineTransitionDirection" : "propTransitionDirection");
  const easingEl = $(useInline ? "inlineTransitionEasing" : "propTransitionEasing");

  const minDuration = (typeEl?.value || clip.transitionType) === "cut" ? 0.05 : 0.1;
  clip.start = Math.max(0, Number(startEl?.value) || 0);
  clip.duration = Math.max(minDuration, Number(durationEl?.value) || minDuration);

  if (typeEl) {
    const previousType = clip.transitionType;
    clip.transitionType = typeEl.value;
    const preset = transitionPresetById(clip.transitionType);
    clip.name = preset.name;
    if (previousType !== clip.transitionType) {
      if (preset.direction) clip.direction = preset.direction;
      if (preset.easing) clip.easing = preset.easing;
    }
  }

  if (intensityEl) clip.intensity = Number(intensityEl.value);
  if (directionEl) clip.direction = directionEl.value;
  if (easingEl) clip.easing = easingEl.value;

  seekIntoTransition(clip);
  syncTransitionEditors(clip);
  renderTimeline();
  renderPreview();
  setStatus(`Transición editada: ${clip.name} · ${clip.duration.toFixed(2)}s`);
}

function renderTransitionsCatalog() {
  if (!ui.transitionsCatalog) return;
  ui.transitionsCatalog.innerHTML = "";
  ensureTransitionTypeOptions();

  const groups = {};
  for (const preset of TRANSITION_PRESETS) {
    if (!groups[preset.category]) groups[preset.category] = [];
    groups[preset.category].push(preset);
  }

  for (const [category, presets] of Object.entries(groups)) {
    const title = document.createElement("h3");
    title.className = "transition-group-title";
    title.textContent = category;
    ui.transitionsCatalog.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "transitions-grid";

    for (const preset of presets) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `transition-card ${state.selectedTransitionPreset === preset.id ? "selected" : ""}`;
      card.draggable = true;
      card.dataset.transition = preset.id;
      card.innerHTML = `
        <span class="transition-preview-icon" data-fx="${preset.effect || preset.id}"></span>
        <strong></strong>
        <small></small>
      `;
      card.querySelector("strong").textContent = preset.name;
      card.querySelector("small").textContent = preset.hint || "Clic: editar · Doble: agregar";

      card.addEventListener("click", () => {
        state.selectedTransitionPreset = preset.id;
        if (!applyEffectToSelectedTransition(preset.id)) {
          renderTransitionsCatalog();
          setStatus(`Transición lista para aplicar: ${preset.name}`);
        } else {
          renderTransitionsCatalog();
        }
      });

      card.addEventListener("dblclick", (event) => {
        event.preventDefault();
        state.selectedTransitionPreset = preset.id;
        insertTransition(preset.id);
      });

      card.addEventListener("dragstart", (event) => {
        state.selectedTransitionPreset = preset.id;
        event.dataTransfer.setData("application/x-transition", preset.id);
        event.dataTransfer.effectAllowed = "copy";
      });

      grid.appendChild(card);
    }

    ui.transitionsCatalog.appendChild(grid);
  }
}

function clearTransitionVisuals() {
  if (!ui.videoSecondary) return;

  document.querySelector(".program-monitor")?.classList.remove("transitioning");

  [ui.videoSecondary, ui.imageSecondary].forEach((el) => {
    if (!el) return;
    if (el.pause) el.pause();
    el.style.display = "none";
    el.style.opacity = "0";
    el.style.filter = "";
    el.style.transform = "";
    el.style.clipPath = "";
    el.style.zIndex = "";
  });

  ui.transitionOverlay.hidden = true;
  ui.transitionOverlay.style.opacity = "0";
  ui.transitionOverlay.style.background = "#000";
  ui.transitionOverlay.style.clipPath = "";

  ui.video.style.opacity = "1";
  ui.video.style.clipPath = "";
  ui.video.style.transform = "";
  ui.video.style.zIndex = "";

  ui.image.style.opacity = "1";
  ui.image.style.clipPath = "";
  ui.image.style.transform = "";
  ui.image.style.zIndex = "";
  ui.image.style.filter = ui.image.style.filter || "";
}

async function loadImageForTransition(element, clip) {
  const media = mediaById(clip.mediaId);
  if (!media || !element) return false;

  const changed = element.dataset.mediaId !== media.id || !element.getAttribute("src");
  if (changed) {
    await new Promise((resolve, reject) => {
      const done = () => {
        element.onload = null;
        element.onerror = null;
        resolve();
      };
      const fail = () => {
        element.onload = null;
        element.onerror = null;
        reject(new Error("No se pudo cargar la imagen"));
      };
      element.onload = done;
      element.onerror = fail;
      element.src = media.url;
      if (element.complete && element.naturalWidth > 0) done();
    });
    element.dataset.mediaId = media.id;
  }

  element.style.display = "block";
  element.style.filter = visualFilter(clip);
  /* No resetear opacity/transform/clipPath cada frame: lo controla applyTransitionEffect */
  if (changed) {
    element.style.opacity = "1";
    element.style.transform = "";
    element.style.clipPath = "";
  }
  return true;
}

async function ensureMediaOnElement(clip, element, kind) {
  const media = mediaById(clip.mediaId);
  if (!media) return false;

  if (clip.type === "video") {
    const targetElement = kind === "secondary" ? ui.videoSecondary : ui.video;
    const changed = targetElement.dataset.mediaId !== media.id;
    if (changed) {
      targetElement.pause();
      targetElement.src = media.url;
      targetElement.load();
      targetElement.dataset.mediaId = media.id;
      if (targetElement === ui.video) {
        activeVideoMediaId = media.id;
        activeVideoClipId = clip.id;
      }
      await new Promise((resolve, reject) => {
        if (targetElement.readyState >= 2) return resolve();
        let done = false;
        const ok = () => { if (!done) { done = true; cleanup(); resolve(); } };
        const fail = () => { if (!done) { done = true; cleanup(); reject(new Error("load")); } };
        const cleanup = () => {
          targetElement.removeEventListener("loadeddata", ok);
          targetElement.removeEventListener("error", fail);
        };
        targetElement.addEventListener("loadeddata", ok);
        targetElement.addEventListener("error", fail);
        setTimeout(() => (targetElement.readyState >= 2 ? ok() : fail()), 3000);
      });
    } else if (targetElement === ui.video) {
      activeVideoClipId = clip.id;
    }

    const target = clipLocalTime(clip, state.currentTime);
    const skew = Math.abs(targetElement.currentTime - target);
    /* En export: menos seeks (evitan micro-parones) */
    const seekTol = state.playing
      ? (state.exporting ? 0.85 : 0.45)
      : 0.04;
    if (skew > seekTol) {
      if (state.exporting && !state.playing) {
        await awaitVideoSeek(targetElement, target);
      } else {
        try {
          targetElement.currentTime = Math.min(target, Math.max(0, (targetElement.duration || target) - 0.01));
        } catch {}
      }
    }

    targetElement.style.display = "block";
    targetElement.style.filter = visualFilter(clip, state.currentTime);
    /* Solo al cambiar medio: estado neutro. El efecto de transición pinta opacity/clip/transform */
    if (changed) {
      targetElement.style.opacity = "1";
      targetElement.style.transform = "";
      targetElement.style.clipPath = "";
    } else if (!state.exporting) {
      targetElement.style.transform = visualTransform(clip, state.currentTime);
    }
    applyClipAudioToElement(clip, targetElement, kind === "secondary" ? 0 : 1);
    if (state.playing && targetElement.paused) {
      /* En export no await play(): evita micro-parones en el reloj de grabación */
      if (state.exporting) targetElement.play().catch(() => {});
      else await safePlayVideo(targetElement);
    }
    if (!state.playing && !targetElement.paused) targetElement.pause();
    return true;
  }

  /* Foto / imagen: primaria o secundaria */
  if (kind === "secondary") {
    return loadImageForTransition(ui.imageSecondary, clip);
  }
  return loadImageForTransition(ui.image, clip);
}

function getTransitionLayers() {
  const primary = ui.video.style.display === "block"
    ? ui.video
    : ui.image.style.display === "block"
      ? ui.image
      : null;
  const secondary = ui.videoSecondary.style.display === "block"
    ? ui.videoSecondary
    : ui.imageSecondary.style.display === "block"
      ? ui.imageSecondary
      : null;
  return { primary, secondary };
}

function applyTransitionEffect(type, progress, intensity, direction) {
  const effect = transitionEffectId(type);
  const p = Math.min(1, Math.max(0, progress)) * intensity;
  const overlay = ui.transitionOverlay;
  const { primary, secondary } = getTransitionLayers();

  if (primary) {
    primary.style.opacity = "1";
    primary.style.transform = "";
    primary.style.clipPath = "";
    primary.style.zIndex = "3";
  }
  if (secondary) {
    secondary.style.opacity = "1";
    secondary.style.transform = "";
    secondary.style.clipPath = "";
    secondary.style.zIndex = "5";
  }

  overlay.hidden = true;
  overlay.style.opacity = "0";
  overlay.style.clipPath = "";
  overlay.style.zIndex = "6";

  const hasPrimary = Boolean(primary);
  const hasSecondary = Boolean(secondary);

  /* Fundido con un solo clip (entrada o salida a negro) — video o foto */
  if (hasPrimary && !hasSecondary) {
    overlay.hidden = false;
    overlay.style.background = effect === "fade-white" ? "#ffffff" : "#000000";
    if (effect === "cut") {
      primary.style.opacity = progress < 0.5 ? "1" : "0";
      overlay.style.opacity = progress < 0.5 ? "0" : "1";
    } else {
      primary.style.opacity = String(1 - p);
      overlay.style.opacity = String(p);
    }
    return;
  }

  if (!hasPrimary && hasSecondary) {
    overlay.hidden = false;
    overlay.style.background = effect === "fade-white" ? "#ffffff" : "#000000";
    if (effect === "cut") {
      secondary.style.opacity = progress < 0.5 ? "0" : "1";
      overlay.style.opacity = progress < 0.5 ? "1" : "0";
    } else {
      secondary.style.opacity = String(p);
      overlay.style.opacity = String(1 - p);
    }
    return;
  }

  if (!hasPrimary || !hasSecondary) return;

  /* Corte directo */
  if (effect === "cut") {
    if (progress < 0.5) {
      primary.style.opacity = "1";
      secondary.style.opacity = "0";
    } else {
      primary.style.opacity = "0";
      secondary.style.opacity = "1";
    }
    return;
  }

  /* Disolvencia / Crossfade — funciona igual con foto y video */
  if (effect === "dissolve" || effect === "dissolve-soft" || effect === "blur" || effect === "dissolve-bright") {
    let mix = p;
    if (effect === "dissolve-soft") {
      mix = progress * progress * (3 - 2 * progress) * intensity;
    }
    /* Inferior opaca + superior con mix (evita oscurecer el cruce sobre fondo negro) */
    primary.style.opacity = "1";
    secondary.style.opacity = String(mix);
    if (effect === "blur") {
      const blurOut = (1 - Math.abs(0.5 - progress) * 2) * 12 * intensity;
      primary.style.filter = `blur(${blurOut * (1 - progress)}px)`;
      secondary.style.filter = `blur(${blurOut * progress}px)`;
    }
    if (effect === "dissolve-bright") {
      const glow = Math.sin(progress * Math.PI) * 0.45 * intensity;
      primary.style.filter = `brightness(${1 + glow})`;
      secondary.style.filter = `brightness(${1 + glow})`;
    }
    return;
  }

  /* Fundido (Fade) */
  if (effect === "fade-black" || effect === "fade-white" || effect === "fade-soft") {
    overlay.hidden = false;
    overlay.style.background = effect === "fade-white" ? "#ffffff" : effect === "fade-soft" ? "#1a1a1a" : "#000000";
    if (progress < 0.5) {
      const local = progress * 2 * intensity;
      primary.style.opacity = String(1 - local);
      secondary.style.opacity = "0";
      overlay.style.opacity = String(local);
    } else {
      const local = (progress - 0.5) * 2 * intensity;
      primary.style.opacity = "0";
      secondary.style.opacity = String(local);
      overlay.style.opacity = String(1 - local);
    }
    return;
  }

  if (effect === "flash") {
    overlay.hidden = false;
    overlay.style.background = "#ffffff";
    const flash = Math.sin(progress * Math.PI) * intensity;
    primary.style.opacity = String(1 - progress);
    secondary.style.opacity = String(progress);
    overlay.style.opacity = String(flash);
    return;
  }

  /* Barrido (Wipe) */
  if (effect === "wipe") {
    secondary.style.opacity = "1";
    primary.style.opacity = "1";
    if (direction === "right") secondary.style.clipPath = `inset(0 0 0 ${(1 - p) * 100}%)`;
    else if (direction === "up") secondary.style.clipPath = `inset(${(1 - p) * 100}% 0 0 0)`;
    else if (direction === "down") secondary.style.clipPath = `inset(0 0 ${(1 - p) * 100}% 0)`;
    else secondary.style.clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`;
    return;
  }

  if (effect === "wipe-iris") {
    secondary.style.opacity = "1";
    primary.style.opacity = "1";
    secondary.style.clipPath = `circle(${p * 75}% at 50% 50%)`;
    return;
  }

  if (effect === "wipe-diagonal") {
    secondary.style.opacity = "1";
    primary.style.opacity = "1";
    const edge = p * 140;
    secondary.style.clipPath = `polygon(0 0, ${edge}% 0, ${edge - 40}% 100%, 0 100%)`;
    return;
  }

  if (effect === "wipe-barn") {
    secondary.style.opacity = "1";
    primary.style.opacity = "1";
    const side = (1 - p) * 50;
    secondary.style.clipPath = `inset(0 ${side}% 0 ${side}%)`;
    return;
  }

  /* Movimiento */
  if (effect === "slide") {
    secondary.style.opacity = "1";
    const offset = (1 - p) * 100;
    if (direction === "right") {
      primary.style.transform = `translateX(${-p * 100}%)`;
      secondary.style.transform = `translateX(${offset - 100}%)`;
    } else if (direction === "up") {
      primary.style.transform = `translateY(${-p * 100}%)`;
      secondary.style.transform = `translateY(${100 - offset}%)`;
    } else if (direction === "down") {
      primary.style.transform = `translateY(${p * 100}%)`;
      secondary.style.transform = `translateY(${offset - 100}%)`;
    } else {
      primary.style.transform = `translateX(${p * 100}%)`;
      secondary.style.transform = `translateX(${-offset}%)`;
    }
    return;
  }

  if (effect === "slide-cover") {
    secondary.style.opacity = "1";
    primary.style.opacity = "1";
    if (direction === "right") secondary.style.transform = `translateX(${(1 - p) * -100}%)`;
    else if (direction === "up") secondary.style.transform = `translateY(${(1 - p) * 100}%)`;
    else if (direction === "down") secondary.style.transform = `translateY(${(1 - p) * -100}%)`;
    else secondary.style.transform = `translateX(${(1 - p) * 100}%)`;
    return;
  }

  if (effect === "slide-reveal") {
    secondary.style.opacity = "1";
    primary.style.opacity = "1";
    if (direction === "right") primary.style.transform = `translateX(${p * 100}%)`;
    else if (direction === "up") primary.style.transform = `translateY(${-p * 100}%)`;
    else if (direction === "down") primary.style.transform = `translateY(${p * 100}%)`;
    else primary.style.transform = `translateX(${-p * 100}%)`;
    return;
  }

  if (effect === "zoom") {
    secondary.style.opacity = String(p);
    primary.style.opacity = String(1 - p * 0.85);
    primary.style.transform = `scale(${1 + p * 0.35})`;
    secondary.style.transform = `scale(${0.75 + p * 0.25})`;
    return;
  }

  if (effect === "zoom-out") {
    secondary.style.opacity = String(p);
    primary.style.opacity = String(1 - p * 0.85);
    primary.style.transform = `scale(${1 - p * 0.35})`;
    secondary.style.transform = `scale(${1.35 - p * 0.35})`;
    return;
  }

  if (effect === "spin") {
    const angle = p * 90;
    primary.style.opacity = String(1 - p);
    secondary.style.opacity = String(p);
    primary.style.transform = `rotate(${-angle}deg) scale(${1 - p * 0.2})`;
    secondary.style.transform = `rotate(${90 - angle}deg) scale(${0.8 + p * 0.2})`;
    return;
  }

  /* Fallback: disolvencia */
  primary.style.opacity = String(1 - p);
  secondary.style.opacity = String(p);
}

async function renderTransitionPreview(transition) {
  const fromClip = transition.fromClipId
    ? state.clips.find((clip) => clip.id === transition.fromClipId)
    : null;
  const toClip = transition.toClipId
    ? state.clips.find((clip) => clip.id === transition.toClipId)
    : null;

  if (!fromClip && !toClip) {
    clearTransitionVisuals();
    return false;
  }

  document.querySelector(".program-monitor")?.classList.add("transitioning");

  const raw = (state.currentTime - transition.start) / Math.max(0.001, transition.duration);
  const progress = easeProgress(raw, transition.easing || "linear");

  /* Cargar ambos lados; no forzar opacity=1 cada frame (evita flash en export) */
  if (fromClip) {
    if (fromClip.type === "video") {
      await ensureMediaOnElement(fromClip, ui.video, "primary");
      ui.image.style.display = "none";
    } else {
      ui.video.pause();
      ui.video.style.display = "none";
      await ensureMediaOnElement(fromClip, ui.image, "primary");
    }
  } else {
    ui.video.pause();
    ui.video.style.display = "none";
    ui.image.style.display = "none";
  }

  if (toClip) {
    if (toClip.type === "video") {
      await ensureMediaOnElement(toClip, ui.videoSecondary, "secondary");
      ui.imageSecondary.style.display = "none";
    } else {
      ui.videoSecondary.pause();
      ui.videoSecondary.style.display = "none";
      await ensureMediaOnElement(toClip, ui.imageSecondary, "secondary");
    }
  } else {
    ui.videoSecondary.pause();
    ui.videoSecondary.style.display = "none";
    ui.imageSecondary.style.display = "none";
  }

  applyTransitionEffect(
    transition.transitionType || "dissolve",
    progress,
    transition.intensity ?? 1,
    transition.direction || "left"
  );

  /* En exportación: no bloquear el reloj esperando RVFC (provoca latencias/paros) */
  if (state.exporting) {
    cacheMonitorVideoFrame(ui.video);
    cacheMonitorVideoFrame(ui.videoSecondary);
  }

  if (fromClip?.type === "video") applyClipAudioToElement(fromClip, ui.video, 1 - progress);
  else applyClipAudioToElement(null, ui.video, 0);
  if (toClip?.type === "video") applyClipAudioToElement(toClip, ui.videoSecondary, progress);
  else applyClipAudioToElement(null, ui.videoSecondary, 0);

  return true;
}

function renderTracks() {
  ui.tracks.innerHTML = "";
  for (const track of state.tracks) {
    const row = document.createElement("div");
    row.className = "track-row";
    row.innerHTML = `
      <div class="track-header"><span>${track.name}</span><small>${track.id}</small></div>
      <div class="track" id="track-${track.id}"></div>
    `;
    ui.tracks.appendChild(row);
  }
}

function renderTimeline() {
  renderTracks();
  const total = Math.max(projectDuration(), 10);
  const width = Math.max(1000, total * state.pixelsPerSecond);

  ui.ruler.style.width = `${width}px`;
  ui.timeline.style.width = `${width + TRACK_LABEL_WIDTH}px`;
  document.querySelectorAll(".track").forEach((track) => track.style.width = `${width}px`);

  ui.ruler.innerHTML = "";
  for (let second = 0; second <= total; second += 5) {
    const tick = document.createElement("div");
    tick.className = "tick";
    tick.style.left = `${second * state.pixelsPerSecond}px`;
    tick.textContent = formatTime(second);
    ui.ruler.appendChild(tick);
  }

  for (const clip of state.clips) {
    const track = $(`track-${clip.track}`);
    if (!track) continue;

    const element = document.createElement("div");
    element.className = `clip ${clip.type} ${clip.id === state.selectedId ? "selected" : ""}`;
    element.style.left = `${timeToTrackPixels(clip.start)}px`;
    element.style.width = `${Math.max(35, timeToTrackPixels(clip.duration))}px`;
    element.innerHTML = `
      <span class="resize-handle left"></span>
      <span class="clip-label"></span>
      <span class="resize-handle right"></span>
    `;
    element.querySelector(".clip-label").textContent = clip.name;

    let action = null;
    let startX = 0;
    let originalStart = 0;
    let originalDuration = 0;
    let originalSourceStart = 0;

    element.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      state.selectedId = clip.id;
      startX = event.clientX;
      originalStart = clip.start;
      originalDuration = clip.duration;
      originalSourceStart = clip.sourceStart || 0;
      action = event.target.classList.contains("left")
        ? "left"
        : event.target.classList.contains("right")
          ? "right"
          : "move";
      element.setPointerCapture(event.pointerId);
      if (clip.type === "transition") {
        renderProperties();
      }
    });

    element.addEventListener("pointermove", (event) => {
      if (!action) return;
      const delta = (event.clientX - startX) / state.pixelsPerSecond;
      const minDuration = clip.type === "transition"
        ? (clip.transitionType === "cut" ? 0.05 : 0.1)
        : 0.25;

      if (action === "move") {
        const raw = Math.max(0, originalStart + delta);
        const snap = applyMagneticSnap(clip, raw, clip.id);
        clip.start = snap.start;
        if (snap.snapped) showMagneticGuide(snap.guideTime);
        else hideMagneticGuide();
      }
      if (action === "right") clip.duration = Math.max(minDuration, originalDuration + delta);
      if (action === "left") {
        const nextStart = Math.max(0, originalStart + delta);
        const trimmed = nextStart - originalStart;
        clip.start = nextStart;
        clip.duration = Math.max(minDuration, originalDuration - trimmed);
        if (clip.type === "video" || clip.type === "audio") {
          clip.sourceStart = Math.max(0, originalSourceStart + trimmed);
        }
      }

      element.style.left = `${timeToTrackPixels(clip.start)}px`;
      element.style.width = `${Math.max(35, timeToTrackPixels(clip.duration))}px`;
      if (clip.type === "transition") {
        seekIntoTransition(clip);
        syncTransitionEditors(clip);
        renderPreview();
      }
      updatePlayhead();
    });

    element.addEventListener("pointerup", () => {
      action = null;
      hideMagneticGuide();
      if (clip.type === "transition") seekIntoTransition(clip);
      renderAll();
    });
    element.addEventListener("pointercancel", () => {
      action = null;
      hideMagneticGuide();
    });

    element.addEventListener("click", (event) => {
      event.stopPropagation();
      state.selectedId = clip.id;
      if (clip.type === "transition") seekIntoTransition(clip);
      if (clip.type === "image") {
        const t = state.currentTime;
        if (t < clip.start || t >= clip.start + clip.duration) {
          state.currentTime = clip.start + Math.min(0.05, clip.duration / 2);
        }
      }
      renderAll();
      if (clip.type === "image") {
        setStatus("Arrastre la imagen en el monitor o use las esquinas para cambiar el tamaño.");
      }
    });

    element.addEventListener("dblclick", (event) => {
      if (clip.type !== "transition") return;
      event.stopPropagation();
      state.selectedId = clip.id;
      seekIntoTransition(clip);
      openModulePanel("editPanel");
      renderAll();
      setStatus("Edite tiempo y efecto de la transición en Propiedades.");
    });

    track.appendChild(element);
  }

  updatePlayhead();
}

function visualTransform(clip, timelineTime) {
  /* % del propio layer (pantalla completa): coincide con coords de proyecto 1280×720 */
  let x = clip.x || 0;
  let y = clip.y || 0;
  let scale = clip.scale || 1;
  let rotation = clip.rotation || 0;
  if (window.StudioEffects && timelineTime != null) {
    const ov = window.StudioEffects.transformOverride(clip, timelineTime);
    if (ov) {
      x = ov.x;
      y = ov.y;
      scale = ov.scale;
      if (ov.rotation != null) rotation = ov.rotation;
    }
  }
  const xPct = (x / 1280) * 100;
  const yPct = (y / 720) * 100;
  return `translate(${xPct}%, ${yPct}%) scale(${scale}) rotate(${rotation}deg)`;
}

function visualFilter(clip, timelineTime) {
  const brightness = clip.brightness ?? 1;
  const contrast = clip.contrast ?? 1;
  const saturation = clip.saturation ?? 1;
  const sepia = Math.max(0, clip.temperature || 0) * 0.25;
  const parts = [];
  if (
    !(
      Math.abs(brightness - 1) < 0.001
      && Math.abs(contrast - 1) < 0.001
      && Math.abs(saturation - 1) < 0.001
      && sepia < 0.001
    )
  ) {
    parts.push(`brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) sepia(${sepia})`);
  }
  if (window.StudioEffects && !state.effectsCompare) {
    const fx = window.StudioEffects.cssEffectsFilter(clip, timelineTime ?? state.currentTime);
    if (fx) parts.push(fx);
  }
  return parts.length ? parts.join(" ") : "none";
}

function clipAudioGain(clip, gain = 1) {
  if (!clip) return 0;
  if (clip.muted) return 0;
  const local = state.currentTime - clip.start;
  let volume = (clip.volume ?? 1) * state.masterVolume * gain;
  if (clip.fadeIn && local >= 0 && local < clip.fadeIn) volume *= local / clip.fadeIn;
  if (clip.fadeOut && local >= 0 && clip.duration - local < clip.fadeOut) {
    volume *= Math.max(0, (clip.duration - local) / clip.fadeOut);
  }
  return Math.min(1, Math.max(0, volume));
}

function applyClipAudioToElement(clip, element, gain = 1) {
  if (!element) return;
  if (!clip) {
    element.muted = true;
    element.volume = 0;
    return;
  }
  if (clip.speed?.muteAudio) {
    element.muted = true;
    element.volume = 0;
    return;
  }
  const volume = clipAudioGain(clip, gain);
  element.muted = volume <= 0.001;
  try {
    element.volume = volume;
  } catch {}
}

/**
 * play() tras await (seek/load) pierde el gesto del usuario → NotAllowedError
 * si el video no está muted. Reintenta muted y restaura audio.
 */
async function safePlayVideo(element) {
  if (!element) return false;
  if (!element.paused) return true;
  try {
    await element.play();
    return true;
  } catch {
    const wantSound = !element.muted;
    try {
      element.muted = true;
      await element.play();
      if (wantSound) element.muted = false;
      return !element.paused;
    } catch {
      return false;
    }
  }
}

async function loadVideoClip(clip) {
  const media = mediaById(clip.mediaId);
  if (!media) return false;

  let sourceChanged = activeVideoMediaId !== media.id;
  const clipChanged = activeVideoClipId !== clip.id;
  const secondaryReady = Boolean(
    ui.videoSecondary?.src
    && ui.videoSecondary.dataset.mediaId === media.id
    && ui.videoSecondary.style.display === "block"
    && ui.videoSecondary.readyState >= 2
  );

  /* Tras transición: el secundario ya lleva el clip de entrada en tiempo correcto
     (también si ambos clips comparten el mismo mediaId). */
  if ((sourceChanged || clipChanged) && secondaryReady) {
    const secondaryTime = ui.videoSecondary.currentTime;
    if (sourceChanged || ui.video.src !== ui.videoSecondary.src) {
      ui.video.pause();
      ui.video.src = ui.videoSecondary.src;
      ui.video.load();
      activeVideoMediaId = media.id;
      ui.video.dataset.mediaId = media.id;
      await new Promise((resolve) => {
        if (ui.video.readyState >= 2) return resolve();
        const done = () => {
          ui.video.removeEventListener("loadeddata", done);
          resolve();
        };
        ui.video.addEventListener("loadeddata", done);
        setTimeout(done, 800);
      });
      sourceChanged = false;
    }
    try {
      ui.video.currentTime = secondaryTime;
    } catch {}
    activeVideoClipId = clip.id;
  }

  if (sourceChanged) {
    ui.video.pause();
    ui.video.src = media.url;
    ui.video.load();
    activeVideoMediaId = media.id;
    activeVideoClipId = clip.id;
    ui.video.dataset.mediaId = media.id;

    await new Promise((resolve, reject) => {
      if (ui.video.readyState >= 2) return resolve();
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        cleanup();
        resolve();
      };
      const fail = () => {
        if (finished) return;
        finished = true;
        cleanup();
        reject(new Error("No se pudo cargar el video"));
      };
      const cleanup = () => {
        ui.video.removeEventListener("loadeddata", done);
        ui.video.removeEventListener("canplay", done);
        ui.video.removeEventListener("error", fail);
      };
      ui.video.addEventListener("loadeddata", done);
      ui.video.addEventListener("canplay", done);
      ui.video.addEventListener("error", fail);
      setTimeout(() => ui.video.readyState >= 2 ? done() : fail(), 3000);
    });
  }

  const target = clipLocalTime(clip, state.currentTime);
  /* Durante play con reloj nativo: tolerancia amplia para no pelear con el decoder */
  const tolerance = state.playing
    ? (state.exporting ? 0.85 : (ui.video.paused ? 0.35 : 0.75))
    : 0.05;
  const needsSeek = sourceChanged
    || activeVideoClipId !== clip.id
    || Math.abs(ui.video.currentTime - target) > tolerance;

  const switchedClip = activeVideoClipId !== clip.id;
  activeVideoClipId = clip.id;
  if (needsSeek) {
    const seekTarget = Math.min(target, Math.max(0, (ui.video.duration || target) - 0.01));
    if (state.exporting && !state.playing) {
      await awaitVideoSeek(ui.video, seekTarget);
    } else if (state.playing && (switchedClip || sourceChanged)) {
      /* Cambio de clip: esperar seek antes del reloj nativo (evita saltos al final) */
      await awaitVideoSeek(ui.video, seekTarget);
    } else {
      try {
        ui.video.currentTime = seekTarget;
      } catch {}
    }
  }

  /* Velocidad de reproducción preview */
  try {
    if (window.StudioSpeed && state.playing && !state.exporting) {
      const rate = window.StudioSpeed.instantRate(clip, state.currentTime);
      ui.video.playbackRate = Math.min(16, Math.max(0.05, Math.abs(rate) || 1));
    } else {
      ui.video.playbackRate = 1;
    }
  } catch {}

  ui.video.style.display = "block";
  ui.video.style.opacity = String(clip.opacity ?? 1);
  ui.video.style.filter = visualFilter(clip, state.currentTime);
  ui.video.style.transform = visualTransform(clip, state.currentTime);
  ui.video.style.clipPath = "";
  applyClipAudioToElement(clip, ui.video, 1);
  if (ui.videoSecondary) applyClipAudioToElement(null, ui.videoSecondary, 0);

  if (state.playing && ui.video.paused) {
    if (state.exporting) ui.video.play().catch(() => {});
    else await safePlayVideo(ui.video);
  }
  if (!state.playing && !ui.video.paused) {
    ui.video.pause();
  }
  return true;
}

async function showImageClip(clip, targetEl = ui.image, time = state.currentTime) {
  const media = mediaById(clip.mediaId);
  if (!media || !targetEl) return false;

  if (targetEl.dataset.mediaId !== media.id) {
    await new Promise((resolve, reject) => {
      targetEl.onload = resolve;
      targetEl.onerror = reject;
      targetEl.src = media.url;
    });
    targetEl.dataset.mediaId = media.id;
  }

  targetEl.style.display = "block";
  targetEl.style.opacity = String(clipVisualOpacity(clip, time));
  targetEl.style.filter = visualFilter(clip, time);
  targetEl.style.transform = visualTransform(clip, time);
  return true;
}

async function showOverlayImages(transition = null) {
  const overlays = overlayImageClipsAt(state.currentTime, transition);
  const layer = ui.imageOverlay || ui.image;
  if (!overlays.length) {
    if (ui.imageOverlay) ui.imageOverlay.style.display = "none";
    return false;
  }
  const clip = overlays[overlays.length - 1];
  return showImageClip(clip, layer, state.currentTime);
}

function showTextClip(clip) {
  /* En export: reutilizar el span si el texto no cambió (evita reconstrucción DOM cada frame) */
  const sameClip = ui.text.dataset.clipId === clip.id && ui.text.style.display === "flex";
  let span = sameClip ? ui.text.querySelector("span") : null;
  if (!span) {
    ui.text.innerHTML = "";
    span = document.createElement("span");
    ui.text.appendChild(span);
  }
  if (!sameClip || span.textContent !== clip.text) span.textContent = clip.text;
  span.style.fontSize = `${clip.fontSize}px`;
  span.style.color = clip.color;
  span.style.background = clip.backgroundTransparent ? "transparent" : clip.background;
  ui.text.dataset.clipId = clip.id;
  ui.text.style.display = "flex";
  ui.text.style.opacity = String(clip.opacity ?? 1);
  ui.text.style.transform = visualTransform(clip);
  ui.text.style.zIndex = clip.layerPosition === "behind" ? "2" : "5";
  if (!state.exporting) requestAnimationFrame(updateTextSelectionBox);
}


function monitorToProjectPoint(clientX, clientY) {
  const rect = document.querySelector(".program-monitor").getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * 1280 - 640,
    y: ((clientY - rect.top) / rect.height) * 720 - 360
  };
}

function updateTextSelectionBox() {
  const clip = selectedClip();
  if (!clip || clip.type !== "text" || ui.text.style.display === "none") {
    ui.textSelectionBox.hidden = true;
    return;
  }

  const monitorRect = document.querySelector(".program-monitor").getBoundingClientRect();
  const textRect = ui.text.getBoundingClientRect();

  ui.textSelectionBox.style.left = `${textRect.left - monitorRect.left}px`;
  ui.textSelectionBox.style.top = `${textRect.top - monitorRect.top}px`;
  ui.textSelectionBox.style.width = `${Math.max(24, textRect.width)}px`;
  ui.textSelectionBox.style.height = `${Math.max(24, textRect.height)}px`;
  ui.textSelectionLabel.textContent = clip.name || "Texto";
  ui.textSelectionBox.hidden = false;
}

function hideAlignmentGuides() {
  ui.guideVertical.hidden = true;
  ui.guideHorizontal.hidden = true;
}

function applyTextSnap(clip) {
  const snapDistance = 12;

  if (Math.abs(clip.x || 0) <= snapDistance) {
    clip.x = 0;
    ui.guideVertical.hidden = false;
  } else {
    ui.guideVertical.hidden = true;
  }

  if (Math.abs(clip.y || 0) <= snapDistance) {
    clip.y = 0;
    ui.guideHorizontal.hidden = false;
  } else {
    ui.guideHorizontal.hidden = true;
  }
}

function visibleImageElementForClip(clip) {
  if (!clip || clip.type !== "image") return null;
  const media = mediaById(clip.mediaId);
  if (!media) return null;
  const candidates = [ui.imageOverlay, ui.image, ui.imageSecondary].filter(Boolean);
  for (const el of candidates) {
    if (el.style.display === "none") continue;
    if (el.dataset.mediaId === media.id) return el;
  }
  return candidates.find((el) => el.style.display !== "none") || null;
}

function applyImageTransformLive(clip) {
  const el = visibleImageElementForClip(clip);
  if (el) {
    el.style.transform = visualTransform(clip);
    el.style.opacity = String(clipVisualOpacity(clip, state.currentTime));
  }
}

function updateImageSelectionBox() {
  const overlay = ui.selectionOverlay;
  if (!overlay) return;
  const box = overlay.querySelector(".selection-box");
  const label = overlay.querySelector(".selection-label");
  const rotateHandle = overlay.querySelector('.transform-handle.rotate');
  const monitor = document.querySelector(".program-monitor");

  const keepVisible = Boolean(imageDragging || imageResizing);
  const clip = selectedClip();
  const editing = clip?.type === "image" && !state.exporting && (!state.playing || keepVisible);

  if (!editing) {
    overlay.hidden = true;
    monitor?.classList.remove("image-transform-mode");
    return;
  }

  const el = visibleImageElementForClip(clip);
  if (!el || el.style.display === "none" || !el.naturalWidth) {
    if (!keepVisible) {
      overlay.hidden = true;
      monitor?.classList.remove("image-transform-mode");
    }
    return;
  }

  const mr = monitor.getBoundingClientRect();
  const nw = el.naturalWidth || 1;
  const nh = el.naturalHeight || 1;
  const fit = Math.min(mr.width / nw, mr.height / nh);
  const scale = clip.scale || 1;
  const tw = nw * fit * scale;
  const th = nh * fit * scale;
  const tx = ((clip.x || 0) / 1280) * mr.width;
  const ty = ((clip.y || 0) / 720) * mr.height;
  const left = mr.width / 2 + tx - tw / 2;
  const top = mr.height / 2 + ty - th / 2;

  box.style.left = `${left}px`;
  box.style.top = `${top}px`;
  box.style.width = `${Math.max(28, tw)}px`;
  box.style.height = `${Math.max(28, th)}px`;
  box.style.transform = (clip.rotation || 0) ? `rotate(${clip.rotation}deg)` : "";
  if (label) label.textContent = clip.name || "Imagen";
  if (rotateHandle) rotateHandle.hidden = true;
  overlay.hidden = false;
  monitor.classList.add("image-transform-mode");
}

function beginImageDrag(event, clip) {
  event.preventDefault();
  event.stopPropagation();
  state.selectedId = clip.id;
  renderProperties();

  const point = monitorToProjectPoint(event.clientX, event.clientY);
  imageDragging = {
    clip,
    pointerId: event.pointerId,
    startX: point.x,
    startY: point.y,
    originalX: clip.x || 0,
    originalY: clip.y || 0,
    moved: false
  };

  ui.selectionOverlay?.querySelector(".selection-box")?.classList.add("dragging");
  document.querySelector(".program-monitor")?.classList.add("dragging-element");
  updateImageSelectionBox();
}

function updateImageDrag(event) {
  if (!imageDragging) return;
  const point = monitorToProjectPoint(event.clientX, event.clientY);
  const clip = imageDragging.clip;
  const deltaX = point.x - imageDragging.startX;
  const deltaY = point.y - imageDragging.startY;
  if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
    imageDragging.moved = true;
    suppressMonitorClick = true;
  }
  clip.x = imageDragging.originalX + deltaX;
  clip.y = imageDragging.originalY + deltaY;
  applyTextSnap(clip);
  applyImageTransformLive(clip);
  updateImageSelectionBox();
  if ($("propX")) $("propX").value = Math.round(clip.x || 0);
  if ($("propY")) $("propY").value = Math.round(clip.y || 0);
}

function finishImageDrag() {
  if (!imageDragging) return;
  const moved = imageDragging.moved;
  imageDragging = null;
  ui.selectionOverlay?.querySelector(".selection-box")?.classList.remove("dragging");
  document.querySelector(".program-monitor")?.classList.remove("dragging-element");
  hideAlignmentGuides();
  updateImageSelectionBox();
  renderTimeline();
  renderProperties();
  if (moved) setStatus("Imagen reposicionada.");
  setTimeout(() => { suppressMonitorClick = false; }, 120);
}

function beginImageResize(event, handle) {
  event.preventDefault();
  event.stopPropagation();
  const clip = selectedClip();
  if (!clip || clip.type !== "image") return;

  const point = monitorToProjectPoint(event.clientX, event.clientY);
  const cx = clip.x || 0;
  const cy = clip.y || 0;
  imageResizing = {
    clip,
    handle: handle.dataset.handle,
    pointerId: event.pointerId,
    startDist: Math.max(8, Math.hypot(point.x - cx, point.y - cy)),
    originalScale: clip.scale || 1
  };
  suppressMonitorClick = true;
  ui.selectionOverlay?.querySelector(".selection-box")?.classList.add("resizing");
  handle.setPointerCapture(event.pointerId);
}

function updateImageResize(event) {
  if (!imageResizing) return;
  const clip = imageResizing.clip;
  const point = monitorToProjectPoint(event.clientX, event.clientY);
  const cx = clip.x || 0;
  const cy = clip.y || 0;
  const dist = Math.max(8, Math.hypot(point.x - cx, point.y - cy));
  const next = imageResizing.originalScale * (dist / imageResizing.startDist);
  clip.scale = Math.max(0.1, Math.min(3, Math.round(next * 100) / 100));
  applyImageTransformLive(clip);
  updateImageSelectionBox();
  if ($("propScale")) $("propScale").value = clip.scale;
}

function finishImageResize() {
  if (!imageResizing) return;
  imageResizing = null;
  ui.selectionOverlay?.querySelector(".selection-box")?.classList.remove("resizing");
  updateImageSelectionBox();
  renderTimeline();
  renderProperties();
  setStatus("Tamaño de la imagen actualizado.");
  setTimeout(() => { suppressMonitorClick = false; }, 120);
}

function setTimeFromClientX(clientX, referenceElement) {
  const rect = referenceElement.getBoundingClientRect();
  const nextTime = (clientX - rect.left) / state.pixelsPerSecond;
  state.currentTime = Math.max(0, Math.min(projectDuration(), nextTime));
  updatePlayhead();
  renderPreview();
  syncAudio();
}

async function renderPreview() {
  const seq = ++previewSeq;
  const transitionClip = activeClip("transition");
  const textClip = activeClip("text");
  const videoClip = transitionClip ? null : activeClip("video");
  /* Imagen de pista V2: durante transición se dibuja como overlay (no como extremo FX) */
  const imageClip = transitionClip ? null : activeClip("image");

  if (!state.playing) ui.textSelectionBox.hidden = true;

  /* Solo limpia capas de transición al salir de una (evita parpadeo) */
  if (!transitionClip && lastPreviewHadTransition) {
    clearTransitionVisuals();
  }
  if (!transitionClip) {
    document.querySelector(".program-monitor")?.classList.remove("transitioning");
    if (ui.videoSecondary?.style.display === "block") {
      ui.videoSecondary.pause();
      ui.videoSecondary.style.display = "none";
    }
    if (ui.imageSecondary?.style.display === "block") {
      ui.imageSecondary.style.display = "none";
    }
    if (ui.imageOverlay) ui.imageOverlay.style.display = "none";
    if (ui.transitionOverlay && !ui.transitionOverlay.hidden) {
      ui.transitionOverlay.hidden = true;
      ui.transitionOverlay.style.opacity = "0";
    }
  }

  let visible = false;

  if (transitionClip) {
    try {
      visible = await renderTransitionPreview(transitionClip);
      /* Mantener imagen V2 encima del crossfade */
      if (await showOverlayImages(transitionClip)) visible = true;
    } catch {
      clearTransitionVisuals();
      setStatus("No se pudo previsualizar la transición.");
    }
  } else {
    if (videoClip) {
      try {
        visible = await loadVideoClip(videoClip);
      } catch {
        ui.video.style.display = "none";
        setStatus("No se pudo reproducir el video. Use MP4 H.264 o WebM.");
      }
    } else {
      ui.video.pause();
      ui.video.style.display = "none";
      activeVideoClipId = null;
    }

    if (seq !== previewSeq) return;

    if (textClip && textClip.layerPosition === "behind") {
      showTextClip(textClip);
      visible = true;
    }

    if (imageClip) {
      try {
        visible = await showImageClip(imageClip, ui.image, state.currentTime) || visible;
      } catch {
        setStatus("No se pudo mostrar la imagen. Use JPG, PNG o WebP.");
      }
    } else {
      ui.image.style.display = "none";
      if (ui.imageOverlay) ui.imageOverlay.style.display = "none";
    }
  }

  if (seq !== previewSeq) return;

  if (textClip && (textClip.layerPosition !== "behind" || transitionClip)) {
    showTextClip(textClip);
    visible = true;
  } else if (!textClip) {
    ui.text.style.display = "none";
  }

  lastPreviewHadTransition = Boolean(transitionClip);
  ui.empty.style.display = visible ? "none" : "grid";
  if (!state.exporting) updatePlayhead();
  if (!state.exporting) {
    requestAnimationFrame(() => {
      updateTextSelectionBox();
      updateImageSelectionBox();
      updateEffectsPreviewOverlay();
      if (window.StudioEffectsUI) window.StudioEffectsUI.refreshSoft();
    });
  }
}

function syncAudio() {
  /* Audio embebido del video activo (o cruce en transiciones) */
  const transitionClip = activeClip("transition");
  if (transitionClip) {
    const fromClip = transitionClip.fromClipId
      ? state.clips.find((clip) => clip.id === transitionClip.fromClipId)
      : null;
    const toClip = transitionClip.toClipId
      ? state.clips.find((clip) => clip.id === transitionClip.toClipId)
      : null;
    const raw = (state.currentTime - transitionClip.start) / Math.max(0.001, transitionClip.duration);
    const progress = easeProgress(Math.min(1, Math.max(0, raw)), transitionClip.easing || "linear");

    if (fromClip?.type === "video" && ui.video.style.display === "block") {
      applyClipAudioToElement(fromClip, ui.video, 1 - progress);
    } else {
      applyClipAudioToElement(null, ui.video, 0);
    }

    if (toClip?.type === "video" && ui.videoSecondary?.style.display === "block") {
      applyClipAudioToElement(toClip, ui.videoSecondary, progress);
    } else if (ui.videoSecondary) {
      applyClipAudioToElement(null, ui.videoSecondary, 0);
    }
  } else {
    const videoClip = activeClip("video");
    if (videoClip && ui.video.style.display === "block") {
      applyClipAudioToElement(videoClip, ui.video, 1);
    } else {
      applyClipAudioToElement(null, ui.video, 0);
    }
    if (ui.videoSecondary) applyClipAudioToElement(null, ui.videoSecondary, 0);
  }

  /* Pistas de audio / música importadas */
  if (state.exporting) {
    /* En exportación las pistas A1/A2 se sincronizan aparte (grafo MediaRecorder) */
    if (activeAudio) activeAudio.pause();
    return;
  }

  const clip = activeClip("audio");
  if (!clip) {
    if (activeAudio) activeAudio.pause();
    activeAudio = null;
    return;
  }

  const media = mediaById(clip.mediaId);
  if (!media) return;

  if (!activeAudio || activeAudio.dataset.clipId !== clip.id) {
    if (activeAudio) activeAudio.pause();
    activeAudio = new Audio(media.url);
    activeAudio.dataset.clipId = clip.id;
  }

  const local = state.currentTime - clip.start;
  const target = (clip.sourceStart || 0) + local;
  if (Math.abs(activeAudio.currentTime - target) > 0.35) activeAudio.currentTime = target;

  activeAudio.volume = clipAudioGain(clip, 1);

  if (state.playing) activeAudio.play().catch(() => {});
  else activeAudio.pause();
}

function stopPlayback(message = "Pausado.") {
  state.playing = false;
  cancelAnimationFrame(animationFrame);
  previousFrameTime = 0;
  ui.video.pause();
  if (ui.videoSecondary) ui.videoSecondary.pause();
  if (activeAudio) activeAudio.pause();
  ui.play.textContent = "▶";
  ui.centerPlay.hidden = false;
  if (projectDuration()) setStatus(message);
}

async function playbackLoop(timestamp) {
  if (!state.playing || state.exporting) return;

  if (!previousFrameTime) previousFrameTime = timestamp;
  const delta = Math.min(0.08, (timestamp - previousFrameTime) / 1000);
  previousFrameTime = timestamp;

  const transitionClip = activeClip("transition");
  const videoClip = activeClip("video");

  if (transitionClip) {
    state.currentTime += delta;
  } else if (videoClip && activeVideoClipId === videoClip.id && ui.video.readyState >= 2 && !ui.video.paused) {
    /* Reloj nativo del video → timeline (soporta velocidad constante) */
    const src = ui.video.currentTime || 0;
    const base = videoClip.sourceStart || 0;
    const rate = Math.max(0.05, Math.abs(videoClip.speed?.rate || 1));
    let timelineLocal;
    if (videoClip.speed?.reverse) {
      const span = (videoClip._mediaDuration || ui.video.duration || videoClip.duration * rate) - base;
      const remaining = Math.max(0, span - (src - base));
      timelineLocal = remaining / rate;
    } else if (window.StudioSpeed?.hasRamp?.(videoClip)) {
      /* Con rampa el reloj de timeline avanza a 1× (más estable) */
      state.currentTime += delta;
      timelineLocal = null;
    } else {
      timelineLocal = Math.max(0, (src - base) / rate);
    }
    if (timelineLocal != null) {
      const nativeTime = videoClip.start + timelineLocal;
      /* Si el decoder aún no buscó el nuevo clip, no saltar el cabezal */
      if (Math.abs(nativeTime - state.currentTime) > 0.9) {
        state.currentTime += delta;
      } else if (nativeTime >= videoClip.start + videoClip.duration - 0.02) {
        state.currentTime = videoClip.start + videoClip.duration;
      } else {
        state.currentTime = nativeTime;
      }
    } else if (state.currentTime >= videoClip.start + videoClip.duration - 0.02) {
      state.currentTime = videoClip.start + videoClip.duration;
    }
  } else {
    state.currentTime += delta;
  }

  if (state.currentTime >= projectDuration()) {
    state.currentTime = projectDuration();
    stopPlayback("Reproducción finalizada.");
    updatePlayhead();
    await renderPreview();
    return;
  }

  updatePlayhead();
  await renderPreview();
  syncAudio();
  if (state.playing) animationFrame = requestAnimationFrame(playbackLoop);
}

async function togglePlayback() {
  if (state.exporting) {
    setStatus("Espere: hay una exportación en curso.");
    return;
  }
  if (state.playing) {
    stopPlayback();
    return;
  }
  if (!projectDuration()) {
    setStatus("No hay contenido en la línea de tiempo.");
    return;
  }

  if (state.currentTime >= projectDuration()) state.currentTime = 0;
  state.playing = true;
  previousFrameTime = 0;
  ui.play.textContent = "❚❚";
  ui.centerPlay.hidden = true;
  setStatus("Reproduciendo…");

  /* play() síncrono bajo el clic: sin esto, await en preview pierde el gesto y falla el audio */
  const unlockPrimary = ui.video?.src ? ui.video.play().catch(() => null) : null;
  const unlockSecondary = ui.videoSecondary?.src ? ui.videoSecondary.play().catch(() => null) : null;

  await renderPreview();
  if (unlockPrimary) await unlockPrimary;
  if (unlockSecondary) await unlockSecondary;
  if (state.playing) {
    await safePlayVideo(ui.video);
    if (ui.videoSecondary?.style.display === "block") await safePlayVideo(ui.videoSecondary);
  }
  syncAudio();
  if (state.playing) animationFrame = requestAnimationFrame(playbackLoop);
}

function renderProperties() {
  const clip = selectedClip();
  $("noSelection").hidden = Boolean(clip);
  $("propertiesForm").hidden = !clip;

  if (!clip) {
    document.querySelector(".program-monitor").classList.remove("text-position-mode");
    document.querySelector(".program-monitor").classList.remove("image-transform-mode");
    if (ui.selectionOverlay) ui.selectionOverlay.hidden = true;
    if ($("imageTransformHint")) $("imageTransformHint").hidden = true;
    if ($("transitionInlineEditor")) $("transitionInlineEditor").hidden = true;
    return;
  }

  $("propName").value = clip.name || "";
  $("propStart").value = clip.start;
  $("propDuration").value = clip.duration;

  const isTransition = clip.type === "transition";
  const visual = clip.type !== "audio" && !isTransition;
  $("visualProperties").hidden = !visual;
  $("textProperties").hidden = clip.type !== "text";
  $("transitionProperties").hidden = !isTransition;
  if ($("imageTransformHint")) $("imageTransformHint").hidden = clip.type !== "image";

  if (visual) {
    $("propScale").value = clip.scale ?? 1;
    $("propOpacity").value = clip.opacity ?? 1;
    $("propX").value = clip.x || 0;
    $("propY").value = clip.y || 0;
    $("propRotation").value = clip.rotation || 0;
  }

  document.querySelector(".program-monitor").classList.toggle(
    "text-position-mode",
    clip.type === "text"
  );

  if (clip.type === "text") {
    $("propText").value = clip.text || "";
    $("propFontSize").value = clip.fontSize || 32;
    $("propColor").value = clip.color || "#ffffff";
    $("propBackground").value = clip.background || "#0a3768";
    $("propBackgroundTransparent").checked = Boolean(clip.backgroundTransparent);
    $("propBackground").disabled = Boolean(clip.backgroundTransparent);
    $("propLayerPosition").value = clip.layerPosition || "front";
  }

  if (isTransition) {
    ensureTransitionTypeOptions();
    syncTransitionEditors(clip);
  } else if ($("transitionInlineEditor")) {
    $("transitionInlineEditor").hidden = true;
  }

  if (clip.type === "audio" || clip.type === "video") {
    $("audioVolume").value = clip.volume ?? 1;
    $("audioFadeIn").value = clip.fadeIn || 0;
    $("audioFadeOut").value = clip.fadeOut || 0;
    $("audioMuted").checked = Boolean(clip.muted);
  }

  if (window.StudioEffectsUI) {
    requestAnimationFrame(() => window.StudioEffectsUI.refreshSoft());
  }
}

function bindProperty(id, key, parser = Number) {
  $(id).addEventListener("input", () => {
    const clip = selectedClip();
    if (!clip) return;
    let value = parser($(id).value);
    if (key === "start") value = Math.max(0, value);
    if (key === "duration") {
      const minDuration = clip.type === "transition" && clip.transitionType === "cut" ? 0.05 : 0.1;
      value = Math.max(minDuration, value);
    }
    clip[key] = value;

    if (clip.type === "transition") {
      seekIntoTransition(clip);
      syncTransitionEditors(clip);
    }

    renderTimeline();
    renderPreview().then(() => {
      updateTextSelectionBox();
      updateImageSelectionBox();
    });
  });
}

async function renderAll() {
  renderTimeline();
  renderProperties();
  await renderPreview();
  syncAudio();
  requestAnimationFrame(() => {
    updateTextSelectionBox();
    updateImageSelectionBox();
  });
}

function splitSelected() {
  const clip = selectedClip();
  if (!clip || state.currentTime <= clip.start || state.currentTime >= clip.start + clip.duration) {
    setStatus("Coloque el cabezal dentro del clip.");
    return;
  }

  const elapsed = state.currentTime - clip.start;
  const copy = {
    ...clip,
    id: uid(),
    start: state.currentTime,
    duration: clip.duration - elapsed
  };
  if (clip.type === "video" || clip.type === "audio") {
    copy.sourceStart = (clip.sourceStart || 0) + elapsed;
  }
  clip.duration = elapsed;
  state.clips.push(copy);
  state.selectedId = copy.id;
  renderAll();
}

function setTimelineTime(clientX, reference) {
  const rect = reference.getBoundingClientRect();
  state.currentTime = Math.max(0, Math.min(projectDuration(), (clientX - rect.left) / state.pixelsPerSecond));
  stopPlayback();
  renderAll();
}

/* Events */
$("videoInput").addEventListener("change", (e) => importFiles([...e.target.files], "video"));
$("imageInput").addEventListener("change", (e) => importFiles([...e.target.files], "image"));
$("audioInput").addEventListener("change", (e) => importFiles([...e.target.files], "audio"));

$("addTitleBtn").addEventListener("click", () => addText("title", "Título del proyecto"));
$("addSubtitleBtn").addEventListener("click", () => addText("subtitle", "Descripción del avance"));
$("addFooterBtn").addEventListener("click", () => addText("footer", "Gerencia Técnica | Proyecto"));

ui.play.addEventListener("click", togglePlayback);
ui.centerPlay.addEventListener("click", togglePlayback);

$("toStartBtn").addEventListener("click", () => {
  stopPlayback();
  state.currentTime = 0;
  hideMagneticGuide();
  renderAll();
  updatePlayhead();
});
$("toEndBtn").addEventListener("click", () => { stopPlayback(); state.currentTime = projectDuration(); renderAll(); });
$("backBtn").addEventListener("click", () => { stopPlayback(); state.currentTime = Math.max(0, state.currentTime - 1); renderAll(); });
$("forwardBtn").addEventListener("click", () => { stopPlayback(); state.currentTime = Math.min(projectDuration(), state.currentTime + 1); renderAll(); });

ui.seek.addEventListener("input", () => {
  stopPlayback();
  state.currentTime = projectDuration() * Number(ui.seek.value) / 1000;
  renderAll();
});

$("zoomRange").addEventListener("input", () => {
  state.pixelsPerSecond = Number($("zoomRange").value);
  renderTimeline();
});

$("magneticSnapBtn")?.addEventListener("click", () => {
  state.magneticSnap = !state.magneticSnap;
  syncMagneticToggleUi();
  hideMagneticGuide();
  setStatus(state.magneticSnap
    ? "Pegado magnético activado: los clips se alinean en bordes exactos."
    : "Pegado magnético desactivado.");
});
syncMagneticToggleUi();

ui.ruler.addEventListener("pointerdown", (event) => {
  stopPlayback();
  playheadDragging = true;
  ui.ruler.setPointerCapture(event.pointerId);
  setTimeFromClientX(event.clientX, ui.ruler);
});

ui.ruler.addEventListener("pointermove", (event) => {
  if (!playheadDragging) return;
  setTimeFromClientX(event.clientX, ui.ruler);
});

ui.ruler.addEventListener("pointerup", () => {
  playheadDragging = false;
});

ui.ruler.addEventListener("pointercancel", () => {
  playheadDragging = false;
});

ui.timeline.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".clip") || event.target.closest("#playhead")) return;
  const track = event.target.closest(".track");
  if (!track) return;

  stopPlayback();
  playheadDragging = true;
  track.setPointerCapture(event.pointerId);
  setTimeFromClientX(event.clientX, track);

  const move = (moveEvent) => {
    if (playheadDragging) setTimeFromClientX(moveEvent.clientX, track);
  };
  const finish = () => {
    playheadDragging = false;
    track.removeEventListener("pointermove", move);
    track.removeEventListener("pointerup", finish);
    track.removeEventListener("pointercancel", finish);
  };

  track.addEventListener("pointermove", move);
  track.addEventListener("pointerup", finish);
  track.addEventListener("pointercancel", finish);
});

ui.playhead.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
  stopPlayback();
  playheadDragging = true;
  ui.playhead.classList.add("dragging");
  ui.playhead.setPointerCapture(event.pointerId);

  const move = (moveEvent) => {
    if (playheadDragging) setTimeFromClientX(moveEvent.clientX, ui.ruler);
  };
  const finish = () => {
    playheadDragging = false;
    ui.playhead.classList.remove("dragging");
    ui.playhead.removeEventListener("pointermove", move);
    ui.playhead.removeEventListener("pointerup", finish);
    ui.playhead.removeEventListener("pointercancel", finish);
  };

  setTimeFromClientX(event.clientX, ui.ruler);
  ui.playhead.addEventListener("pointermove", move);
  ui.playhead.addEventListener("pointerup", finish);
  ui.playhead.addEventListener("pointercancel", finish);
});

$("splitBtn").addEventListener("click", splitSelected);
$("duplicateBtn").addEventListener("click", () => {
  const clip = selectedClip();
  if (!clip) return;
  const copy = { ...clip, id: uid(), start: clip.start + clip.duration };
  state.clips.push(copy);
  state.selectedId = copy.id;
  renderAll();
});
$("deleteBtn").addEventListener("click", () => {
  if (!state.selectedId) return;
  state.clips = state.clips.filter((clip) => clip.id !== state.selectedId);
  state.selectedId = null;
  renderAll();
});

bindProperty("propName", "name", String);
bindProperty("propStart", "start");
bindProperty("propDuration", "duration");
bindProperty("propScale", "scale");
bindProperty("propOpacity", "opacity");
bindProperty("propX", "x");
bindProperty("propY", "y");
bindProperty("propRotation", "rotation");
bindProperty("propText", "text", String);
bindProperty("propFontSize", "fontSize");
bindProperty("propColor", "color", String);
bindProperty("propBackground", "background", String);

$("propBackgroundTransparent").addEventListener("change", () => {
  const clip = selectedClip();
  if (!clip || clip.type !== "text") return;
  clip.backgroundTransparent = $("propBackgroundTransparent").checked;
  $("propBackground").disabled = clip.backgroundTransparent;
  renderPreview();
});
$("propLayerPosition").addEventListener("change", () => {
  const clip = selectedClip();
  if (!clip || clip.type !== "text") return;
  clip.layerPosition = $("propLayerPosition").value;
  renderPreview();
});
$("bringTextFrontBtn").addEventListener("click", () => {
  const clip = selectedClip();
  if (clip?.type === "text") { clip.layerPosition = "front"; renderAll(); }
});
$("sendTextBehindBtn").addEventListener("click", () => {
  const clip = selectedClip();
  if (clip?.type === "text") { clip.layerPosition = "behind"; renderAll(); }
});

function refreshTransitionProperty(event) {
  updateSelectedTransitionFromEditors("prop");
}

["propTransitionType", "propTransitionIntensity", "propTransitionDirection", "propTransitionEasing", "propTransitionStart", "propTransitionDuration"]
  .forEach((id) => {
    const node = $(id);
    if (!node) return;
    node.addEventListener("input", refreshTransitionProperty);
    node.addEventListener("change", refreshTransitionProperty);
  });

["inlineTransitionType", "inlineTransitionIntensity", "inlineTransitionDirection", "inlineTransitionEasing", "inlineTransitionStart", "inlineTransitionDuration"]
  .forEach((id) => {
    const node = $(id);
    if (!node) return;
    node.addEventListener("input", () => updateSelectedTransitionFromEditors("inline"));
    node.addEventListener("change", () => updateSelectedTransitionFromEditors("inline"));
  });

$("previewTransitionBtn")?.addEventListener("click", () => {
  const clip = selectedClip();
  if (!clip || clip.type !== "transition") return;
  stopPlayback();
  seekIntoTransition(clip);
  renderPreview();
  setStatus("Vista previa de la transición en el cabezal.");
});

$("openTransitionEditTabBtn")?.addEventListener("click", () => {
  openModulePanel("editPanel");
  const clip = selectedClip();
  if (clip?.type === "transition") {
    seekIntoTransition(clip);
    renderProperties();
    renderPreview();
  }
});

$("applyTransitionBtn").addEventListener("click", () => {
  insertTransition(state.selectedTransitionPreset || "dissolve");
});

ui.timeline.addEventListener("dragover", (event) => {
  if (![...event.dataTransfer.types].includes("application/x-transition")) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  const track = event.target.closest(".track");
  document.querySelectorAll(".track").forEach((node) => node.classList.remove("transition-dragover"));
  if (track) track.classList.add("transition-dragover");
});

ui.timeline.addEventListener("dragleave", (event) => {
  if (!event.target.closest(".track")) {
    document.querySelectorAll(".track").forEach((node) => node.classList.remove("transition-dragover"));
  }
});

ui.timeline.addEventListener("drop", (event) => {
  const presetId = event.dataTransfer.getData("application/x-transition");
  document.querySelectorAll(".track").forEach((node) => node.classList.remove("transition-dragover"));
  if (!presetId) return;
  event.preventDefault();

  const track = event.target.closest(".track");
  const reference = track || ui.ruler;
  const rect = reference.getBoundingClientRect();
  const dropTime = Math.max(0, (event.clientX - rect.left) / state.pixelsPerSecond);
  state.selectedTransitionPreset = presetId;
  insertTransition(presetId, dropTime);
});

["colorBrightness", "colorContrast", "colorSaturation", "colorTemperature"].forEach((id) => {
  const key = {
    colorBrightness: "brightness",
    colorContrast: "contrast",
    colorSaturation: "saturation",
    colorTemperature: "temperature"
  }[id];
  $(id).addEventListener("input", () => {
    const clip = selectedClip();
    if (clip && (clip.type === "video" || clip.type === "image")) {
      clip[key] = Number($(id).value);
      renderPreview();
    }
  });
});

$("resetColorBtn").addEventListener("click", () => {
  const clip = selectedClip();
  if (!clip) return;
  clip.brightness = clip.contrast = clip.saturation = 1;
  clip.temperature = 0;
  renderAll();
});

$("audioVolume").addEventListener("input", () => {
  const c = selectedClip();
  if (c && (c.type === "audio" || c.type === "video")) {
    c.volume = Number($("audioVolume").value);
    syncAudio();
  }
});
$("audioFadeIn").addEventListener("input", () => {
  const c = selectedClip();
  if (c && (c.type === "audio" || c.type === "video")) c.fadeIn = Number($("audioFadeIn").value);
});
$("audioFadeOut").addEventListener("input", () => {
  const c = selectedClip();
  if (c && (c.type === "audio" || c.type === "video")) c.fadeOut = Number($("audioFadeOut").value);
});
$("audioMuted").addEventListener("change", () => {
  const c = selectedClip();
  if (c && (c.type === "audio" || c.type === "video")) {
    c.muted = $("audioMuted").checked;
    syncAudio();
  }
});
$("masterVolume").addEventListener("input", () => {
  state.masterVolume = Number($("masterVolume").value);
  syncAudio();
});



function beginTextDrag(event, clip) {
  event.preventDefault();
  event.stopPropagation();

  state.selectedId = clip.id;
  renderProperties();

  const point = monitorToProjectPoint(event.clientX, event.clientY);
  textDragging = {
    clip,
    pointerId: event.pointerId,
    startX: point.x,
    startY: point.y,
    originalX: clip.x || 0,
    originalY: clip.y || 0,
    moved: false
  };

  ui.text.classList.add("dragging");
  ui.textSelectionBox.classList.add("dragging");
  document.querySelector(".program-monitor").classList.add("dragging-element");
  updateTextSelectionBox();
}

function updateTextDrag(event) {
  if (!textDragging) return;

  const point = monitorToProjectPoint(event.clientX, event.clientY);
  const clip = textDragging.clip;
  const deltaX = point.x - textDragging.startX;
  const deltaY = point.y - textDragging.startY;

  if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
    textDragging.moved = true;
    suppressMonitorClick = true;
  }

  clip.x = textDragging.originalX + deltaX;
  clip.y = textDragging.originalY + deltaY;

  applyTextSnap(clip);
  ui.text.style.transform = visualTransform(clip);
  updateTextSelectionBox();
  $("propX").value = Math.round(clip.x || 0);
  $("propY").value = Math.round(clip.y || 0);
}

function finishTextDrag() {
  if (!textDragging) return;

  const moved = textDragging.moved;
  textDragging = null;
  ui.text.classList.remove("dragging");
  ui.textSelectionBox.classList.remove("dragging");
  document.querySelector(".program-monitor").classList.remove("dragging-element");
  hideAlignmentGuides();
  updateTextSelectionBox();
  renderTimeline();
  renderProperties();

  if (moved) setStatus("Texto reposicionado.");

  // Evita que el clic al soltar vuelva a saltar el texto.
  setTimeout(() => {
    suppressMonitorClick = false;
  }, 120);
}

function applyTextFontSize(clip, size) {
  clip.fontSize = Math.max(12, Math.min(160, Math.round(size)));
  const span = ui.text.querySelector("span");
  if (span) span.style.fontSize = `${clip.fontSize}px`;
  $("propFontSize").value = clip.fontSize;
  updateTextSelectionBox();
}

function beginTextResize(event, handle) {
  event.preventDefault();
  event.stopPropagation();

  const clip = selectedClip();
  if (!clip || clip.type !== "text") return;

  const point = monitorToProjectPoint(event.clientX, event.clientY);
  textResizing = {
    clip,
    corner: handle.dataset.corner,
    pointerId: event.pointerId,
    startX: point.x,
    startY: point.y,
    originalFontSize: clip.fontSize || 32
  };

  suppressMonitorClick = true;
  ui.textSelectionBox.classList.add("resizing");
  handle.setPointerCapture(event.pointerId);
}

function updateTextResize(event) {
  if (!textResizing) return;

  const point = monitorToProjectPoint(event.clientX, event.clientY);
  const deltaX = point.x - textResizing.startX;
  const deltaY = point.y - textResizing.startY;
  const directionX = textResizing.corner.includes("e") ? 1 : -1;
  const directionY = textResizing.corner.includes("s") ? 1 : -1;
  const combinedDelta = (deltaX * directionX + deltaY * directionY) / 2;

  applyTextFontSize(
    textResizing.clip,
    textResizing.originalFontSize + combinedDelta * 0.35
  );
}

function finishTextResize() {
  if (!textResizing) return;
  textResizing = null;
  ui.textSelectionBox.classList.remove("resizing");
  updateTextSelectionBox();
  renderTimeline();
  setStatus("Tamaño del texto actualizado.");
  setTimeout(() => {
    suppressMonitorClick = false;
  }, 120);
}

/* Clic en el monitor vacío: coloca el centro del texto o de la imagen */
document.querySelector(".program-monitor").addEventListener("click", (event) => {
  if (suppressMonitorClick || textDragging || textResizing || imageDragging || imageResizing) return;
  if (event.target.closest(".center-play")) return;
  if (event.target.closest("#textSelectionBox")) return;
  if (event.target.closest("#selectionOverlay")) return;
  if (event.target.closest("#programTextLayer > span")) return;

  const clip = selectedClip();
  if (!clip || (clip.type !== "text" && clip.type !== "image")) return;

  const point = monitorToProjectPoint(event.clientX, event.clientY);
  clip.x = point.x;
  clip.y = point.y;

  applyTextSnap(clip);
  hideAlignmentGuides();

  renderPreview().then(() => {
    updateTextSelectionBox();
    updateImageSelectionBox();
    renderProperties();
    renderTimeline();
  });

  setStatus(`${clip.name || (clip.type === "image" ? "Imagen" : "Texto")} movido a la posición seleccionada.`);
});

/* Arrastre desde el texto o desde el marco de selección */
function onTextPointerDown(event) {
  if (event.target.closest(".text-size-handle")) return;
  if (event.button != null && event.button !== 0) return;

  const fromBox = event.currentTarget === ui.textSelectionBox;
  const fromSpan = event.target.closest("#programTextLayer > span");
  if (!fromBox && !fromSpan) return;

  const clip = selectedClip()?.type === "text"
    ? selectedClip()
    : state.clips.find((item) => item.id === ui.text.dataset.clipId);

  if (!clip || clip.type !== "text") return;

  beginTextDrag(event, clip);
  event.currentTarget.setPointerCapture(event.pointerId);
}

ui.text.addEventListener("pointerdown", onTextPointerDown);
ui.textSelectionBox.addEventListener("pointerdown", onTextPointerDown);

ui.text.addEventListener("pointermove", (event) => {
  if (textDragging) updateTextDrag(event);
});
ui.textSelectionBox.addEventListener("pointermove", (event) => {
  if (textDragging) updateTextDrag(event);
});

ui.text.addEventListener("pointerup", finishTextDrag);
ui.text.addEventListener("pointercancel", finishTextDrag);
ui.textSelectionBox.addEventListener("pointerup", finishTextDrag);
ui.textSelectionBox.addEventListener("pointercancel", finishTextDrag);

document.querySelectorAll(".text-size-handle").forEach((handle) => {
  handle.addEventListener("pointerdown", (event) => beginTextResize(event, handle));
  handle.addEventListener("pointermove", updateTextResize);
  handle.addEventListener("pointerup", finishTextResize);
  handle.addEventListener("pointercancel", finishTextResize);
});

/* Arrastre / redimensionado de imagen en el monitor */
(function wireImageTransform() {
  const overlay = ui.selectionOverlay;
  if (!overlay) return;
  const box = overlay.querySelector(".selection-box");
  if (!box) return;

  box.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".transform-handle")) return;
    if (event.button != null && event.button !== 0) return;
    const clip = selectedClip();
    if (!clip || clip.type !== "image") return;
    beginImageDrag(event, clip);
    box.setPointerCapture(event.pointerId);
  });
  box.addEventListener("pointermove", (event) => {
    if (imageDragging) updateImageDrag(event);
    if (imageResizing) updateImageResize(event);
  });
  box.addEventListener("pointerup", () => {
    finishImageDrag();
    finishImageResize();
  });
  box.addEventListener("pointercancel", () => {
    finishImageDrag();
    finishImageResize();
  });

  overlay.querySelectorAll(".transform-handle.resize").forEach((handle) => {
    handle.addEventListener("pointerdown", (event) => {
      beginImageResize(event, handle);
    });
    handle.addEventListener("pointermove", updateImageResize);
    handle.addEventListener("pointerup", finishImageResize);
    handle.addEventListener("pointercancel", finishImageResize);
  });
})();

document.addEventListener("keydown", (event) => {
  const clip = selectedClip();
  if (!clip || (clip.type !== "text" && clip.type !== "image")) return;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;

  const step = event.shiftKey ? 10 : 1;
  let changed = true;

  if (event.key === "ArrowLeft") clip.x -= step;
  else if (event.key === "ArrowRight") clip.x += step;
  else if (event.key === "ArrowUp") clip.y -= step;
  else if (event.key === "ArrowDown") clip.y += step;
  else changed = false;

  if (changed) {
    event.preventDefault();
    if (clip.type === "image") {
      applyImageTransformLive(clip);
      updateImageSelectionBox();
    } else {
      renderPreview();
    }
    renderProperties();
  }
});


document.querySelector(".program-monitor").addEventListener("wheel", (event) => {
  const clip = selectedClip();
  if (!event.ctrlKey || !clip) return;

  if (clip.type === "text") {
    event.preventDefault();
    const step = event.deltaY < 0 ? 2 : -2;
    applyTextFontSize(clip, (clip.fontSize || 32) + step);
    return;
  }

  if (clip.type === "image") {
    event.preventDefault();
    const step = event.deltaY < 0 ? 0.05 : -0.05;
    clip.scale = Math.max(0.1, Math.min(3, Math.round(((clip.scale || 1) + step) * 100) / 100));
    applyImageTransformLive(clip);
    updateImageSelectionBox();
    if ($("propScale")) $("propScale").value = clip.scale;
  }
}, { passive: false });

document.querySelectorAll(".module-tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".module-tab").forEach((x) => x.classList.remove("active"));
    document.querySelectorAll(".side-panel").forEach((x) => x.classList.remove("active"));
    button.classList.add("active");
    $(button.dataset.panel).classList.add("active");
  });
});

document.querySelectorAll("[data-tool]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-tool]").forEach((x) => x.classList.remove("active"));
    button.classList.add("active");
    state.tool = button.dataset.tool;
  });
});

$("togglePanelBtn").addEventListener("click", () => document.body.classList.toggle("panel-collapsed"));
$("newProjectBtn").addEventListener("click", () => {
  stopPlayback();
  state.clips = [];
  state.selectedId = null;
  state.currentTime = 0;
  activeVideoMediaId = null;
  activeVideoClipId = null;
  ui.video.removeAttribute("src");
  ui.video.load();
  if (ui.videoSecondary) {
    ui.videoSecondary.removeAttribute("src");
    ui.videoSecondary.load();
    delete ui.videoSecondary.dataset.mediaId;
  }
  clearTransitionVisuals();
  renderAll();
});

$("saveProjectBtn").addEventListener("click", () => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([JSON.stringify({ tracks: state.tracks, clips: state.clips }, null, 2)], { type: "application/json" }));
  link.download = "studio-obra-proyecto.json";
  link.click();
});

$("openProjectInput").addEventListener("change", async (e) => {
  try {
    const data = JSON.parse(await e.target.files[0].text());
    state.tracks = data.tracks || state.tracks;
    if (!state.tracks.some((track) => track.id === "FX1")) {
      const imageIndex = state.tracks.findIndex((track) => track.id === "V2");
      state.tracks.splice(imageIndex + 1, 0, { id: "FX1", type: "transition", name: "Transiciones" });
    }
    state.clips = (data.clips || []).map((clip) => {
      if (window.StudioEffects) window.StudioEffects.ensureClip(clip);
      if (window.StudioSpeed) window.StudioSpeed.ensureClip(clip);
      return clip;
    });
    state.currentTime = 0;
    state.selectedId = null;
    await renderAll();
    if (window.StudioEffectsUI) window.StudioEffectsUI.refresh();
    setStatus("Proyecto abierto. Reimporte los medios para vincularlos.");
  } catch {
    setStatus("Proyecto no válido.");
  }
});

/* =========================================================
   EXPORTACIÓN — aislada del motor de reproducción
   ========================================================= */

let ffmpegInstance = null;
let ffmpegLoading = null;
/** Cola + mutex: ffmpeg.wasm solo admite un run() a la vez por instancia */
let ffmpegQueue = Promise.resolve();
let ffmpegExclusiveDepth = 0;
let ffmpegCommandSeq = 0;
let ffmpegActiveLabel = null;
let exportMediaCache = new Map();
let exportFrameCache = new Map();
let exportAudioCtx = null;
let exportAudioSources = new WeakMap();
let exportAudioGains = new WeakMap();

/** Capacidades del entorno (GitHub Pages / laptop del usuario) */
const studioCapabilities = {
  wasm: typeof WebAssembly !== "undefined",
  workers: typeof Worker !== "undefined",
  sharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
  crossOriginIsolated: Boolean(window.crossOriginIsolated),
  hardwareConcurrency: Number(navigator.hardwareConcurrency) || 1,
  deviceMemoryGb: Number(navigator.deviceMemory) || null,
  threadMode: "single",
  h264: true,
  h265: false,
  ffmpegReady: false,
  ffmpegSource: "pending",
  ffmpegVersion: "@ffmpeg/ffmpeg 0.11 + core-st 0.11.1",
  probed: false
};

if (window.StudioCapabilitiesDetect?.detect) {
  Object.assign(studioCapabilities, window.StudioCapabilitiesDetect.detect());
}

function setExportProgress(value, message) {
  if (ui.exportProgress) ui.exportProgress.value = Math.max(0, Math.min(100, value));
  if (ui.exportStatus && message) ui.exportStatus.textContent = message;
  if (message) setStatus(message);
}

/** Permite redirigir progreso FFmpeg a la pestaña Conversión sin tocar la UI de exportación */
let activeProgressReporter = null;
function reportFfmpegProgress(value, message) {
  if (typeof activeProgressReporter === "function") {
    activeProgressReporter(value, message);
    return;
  }
  setExportProgress(value, message);
}

function ffmpegDebugEnabled() {
  try {
    return Boolean(state.exportDebug)
      || new URLSearchParams(location.search).get("ffmpegdebug") === "1";
  } catch {
    return false;
  }
}

/**
 * Serializa TODOS los trabajos FFmpeg (export, convert, probe).
 * Incluye mutex duro para detectar reentradas indebidas.
 */
function withFFmpegQueue(task, label = "job") {
  const run = ffmpegQueue.then(
    () => runFFmpegExclusive(label, task),
    () => runFFmpegExclusive(label, task)
  );
  ffmpegQueue = run.then(() => undefined, () => undefined);
  return run;
}

async function runFFmpegExclusive(label, task) {
  const id = ++ffmpegCommandSeq;
  if (ffmpegExclusiveDepth > 0) {
    console.error(`[FFMPEG] CONCURRENCY BLOCKED #${id} (${label}) while active=${ffmpegActiveLabel}`);
    throw new Error(`FFmpeg ocupado («${ffmpegActiveLabel}»). Espere a que termine.`);
  }
  ffmpegExclusiveDepth = 1;
  ffmpegActiveLabel = label;
  const t0 = performance.now();
  if (ffmpegDebugEnabled()) console.info(`[FFMPEG] COMMAND START #${id} | ${label}`);
  try {
    return await task();
  } finally {
    ffmpegExclusiveDepth = 0;
    ffmpegActiveLabel = null;
    if (ffmpegDebugEnabled()) {
      console.info(`[FFMPEG] COMMAND END #${id} | ${label} | ${Math.round(performance.now() - t0)}ms`);
    }
  }
}

/**
 * Único punto para ffmpeg.run().
 * Tras un fallo reinicia la instancia (0.11 deja el flag "running" activo).
 */
async function ffmpegRun(args, label = "run") {
  if (ffmpegExclusiveDepth <= 0) {
    return withFFmpegQueue(async () => ffmpegRun(args, label), label);
  }
  const ffmpeg = await loadFFmpeg();
  if (ffmpegDebugEnabled()) {
    console.info(`[FFMPEG] RUN ${label}:`, args.slice(0, 14).join(" "), args.length > 14 ? "…" : "");
  }
  try {
    await ffmpeg.run(...args);
    return ffmpeg;
  } catch (err) {
    console.warn(`[FFMPEG] RUN FAIL ${label}:`, err?.message || err);
    await resetFFmpegInstance();
    throw err;
  }
}

async function resetFFmpegInstance() {
  const inst = ffmpegInstance;
  ffmpegInstance = null;
  ffmpegLoading = null;
  if (!inst) return;
  try {
    if (typeof inst.exit === "function") inst.exit();
  } catch {
    /* exit suele lanzar en core-st; es esperado */
  }
}

function renderQueue() {
  $("exportQueue").innerHTML = state.exportQueue.map((item) => {
    const ext = extensionForExportFormat(item.format || "webm");
    return `<div class="queue-item">${item.name}.${ext} · ${String(item.format || "").toUpperCase()} · ${item.fps || "?"}fps · ${item.status}</div>`;
  }).join("") || '<p class="muted">Sin tareas en cola.</p>';
}

function ensureExportAudioGraph() {
  if (!exportAudioCtx) {
    exportAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return exportAudioCtx;
}

function setExportElementGain(element, vol) {
  if (!element) return;
  const level = Math.max(0, Math.min(1, Number(vol) || 0));
  const gain = exportAudioGains.get(element);
  if (gain) {
    try { gain.gain.value = level; } catch {}
  }
  try { element.volume = 1; } catch {}
}

function connectElementToExportDest(element, dest) {
  if (!element || element.tagName === "IMG") return;
  try {
    let source = exportAudioSources.get(element);
    if (!source) {
      source = exportAudioCtx.createMediaElementSource(element);
      exportAudioSources.set(element, source);
    }
    let gain = exportAudioGains.get(element);
    if (!gain) {
      gain = exportAudioCtx.createGain();
      exportAudioGains.set(element, gain);
    }
    try { source.disconnect(); } catch {}
    try { gain.disconnect(); } catch {}
    source.connect(gain);
    gain.connect(dest);
    gain.connect(exportAudioCtx.destination);
    gain.gain.value = 1;
    try { element.volume = 1; } catch {}
  } catch {
    /* El elemento ya estaba conectado a otro grafo; se ignora */
  }
}

/** play muted → luego unmute para que el MediaRecorder reciba audio */
async function playExportElementWithAudio(element) {
  if (!element || !element.play) return false;
  try {
    element.muted = true;
    await element.play();
    element.muted = false;
    try { element.volume = 1; } catch {}
    return true;
  } catch {
    try {
      element.muted = true;
      await element.play();
      element.muted = false;
      try { element.volume = 1; } catch {}
      return true;
    } catch {
      return false;
    }
  }
}

function restoreMonitorAudioRouting() {
  if (!exportAudioCtx) return;
  [ui.video, ui.videoSecondary].forEach((element) => {
    if (!element) return;
    const source = exportAudioSources.get(element);
    const gain = exportAudioGains.get(element);
    if (!source) return;
    try {
      source.disconnect();
      if (gain) {
        try { gain.disconnect(); } catch {}
        source.connect(gain);
        gain.connect(exportAudioCtx.destination);
      } else {
        source.connect(exportAudioCtx.destination);
      }
    } catch {}
  });
}

async function awaitVideoSeek(element, target) {
  if (!element || element.tagName !== "VIDEO") return;
  const duration = Number.isFinite(element.duration) ? element.duration : target + 1;
  const clamped = Math.max(0, Math.min(target, Math.max(0, duration - 0.01)));
  if (Math.abs((element.currentTime || 0) - clamped) < 0.03 && element.readyState >= 2) {
    return;
  }
  await new Promise((resolve) => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      element.removeEventListener("seeked", done);
      resolve();
    };
    element.addEventListener("seeked", done);
    try {
      element.currentTime = clamped;
    } catch {
      done();
      return;
    }
    setTimeout(done, state.exporting ? 700 : 120);
  });
}

async function waitPreviewMediaReady() {
  const videos = [ui.video, ui.videoSecondary].filter(
    (el) => el && el.style.display === "block" && el.tagName === "VIDEO"
  );
  await Promise.all(videos.map(async (el) => {
    if (el.readyState >= 2) {
      if (el.requestVideoFrameCallback) {
        await new Promise((resolve) => {
          const id = el.requestVideoFrameCallback(() => resolve());
          setTimeout(() => {
            try { el.cancelVideoFrameCallback?.(id); } catch {}
            resolve();
          }, 90);
        });
      }
      return;
    }
    await new Promise((resolve) => {
      const done = () => {
        el.removeEventListener("loadeddata", done);
        resolve();
      };
      el.addEventListener("loadeddata", done);
      setTimeout(done, 400);
    });
  }));
}

function detectLocalExportPower() {
  const cores = navigator.hardwareConcurrency || 2;
  const memory = navigator.deviceMemory || 4;
  const platform = navigator.platform || "";
  const ua = navigator.userAgent || "";

  /* Puntuación simple 0–100 según recursos locales */
  let score = 0;
  score += Math.min(40, cores * 6);
  score += Math.min(35, memory * 6);
  if (/Win64|Mac|Linux x86_64/i.test(platform) || /Windows NT|Macintosh|X11/i.test(ua)) score += 10;
  if (memory <= 4 || cores <= 2) score -= 15;
  if (cores >= 8 && memory >= 8) score += 15;
  score = Math.max(0, Math.min(100, score));

  let tier = "medium";
  if (score < 35) tier = "low";
  else if (score >= 70) tier = "high";

  return {
    cores,
    memory,
    score,
    tier,
    label: tier === "low" ? "básica" : tier === "high" ? "alta" : "media"
  };
}

const LOCAL_EXPORT_POWER = detectLocalExportPower();

function resolveExportPowerMode() {
  const mode = $("exportPowerMode")?.value || "auto";
  if (mode !== "auto") return mode;
  if (LOCAL_EXPORT_POWER.tier === "low") return "eco";
  if (LOCAL_EXPORT_POWER.tier === "high") return "turbo";
  return "balanced";
}

function applyLocalExportRecommendations(force = false) {
  const info = $("exportPowerInfo");
  const powerMode = resolveExportPowerMode();
  if (info) {
    info.textContent = `Potencia local detectada: ${LOCAL_EXPORT_POWER.label} (${LOCAL_EXPORT_POWER.cores} núcleos, ~${LOCAL_EXPORT_POWER.memory} GB). Modo: ${powerMode}. La conversión corre en esta laptop.`;
  }

  if (!force && $("exportPowerMode")?.dataset.userTouched === "1") return;

  const resolution = $("exportResolution");
  const fps = $("exportFps");
  const preset = $("exportPreset");
  const format = $("exportFormat");

  if (powerMode === "eco") {
    if (resolution) resolution.value = "1280x720";
    if (fps) fps.value = "30";
    if (preset) preset.value = "balanced";
    /* No forzar WebM: el usuario elige el contenedor; WebM VFR provocaba freezes al convertir */
  } else if (powerMode === "turbo") {
    if (resolution) resolution.value = "1920x1080";
    if (fps) fps.value = "60";
    if (preset) preset.value = "max";
  } else {
    if (resolution) resolution.value = LOCAL_EXPORT_POWER.tier === "low" ? "1280x720" : "1920x1080";
    if (fps) fps.value = "30";
    if (preset) preset.value = "high";
  }
  updateExportSettingsHint();
}

function computeAutoVideoBitrate(width, height, fps, preset) {
  const scale = (width * height * Math.max(1, fps)) / (1920 * 1080 * 30);
  const anchors = {
    max: 32_000_000,
    high: 20_000_000,
    balanced: 12_000_000,
    small: 6_000_000
  };
  const base = anchors[preset] || anchors.balanced;
  return Math.round(Math.min(100_000_000, Math.max(2_000_000, base * scale)));
}

function updateExportSettingsHint() {
  const hint = $("exportSettingsHint");
  if (!hint) return;
  try {
    const settings = exportSettingsFromUi({});
    const mbps = (settings.bitrate / 1_000_000).toFixed(1);
    const ext = extensionForExportFormat(settings.format);
    hint.textContent = `Salida: .${ext} (${String(settings.format).toUpperCase()}) · ${settings.width}×${settings.height} @ ${settings.fps} fps · vídeo ${mbps} Mbps · audio ${Math.round(settings.audioBitrate / 1000)} kbps`;
  } catch {
    hint.textContent = "La extensión del archivo coincidirá con el formato elegido (webm, mp4, gif, mov).";
  }
}

function exportSettingsFromUi(job = {}) {
  const powerMode = resolveExportPowerMode();
  let [width, height] = (job.resolution || $("exportResolution")?.value || "1920x1080").split("x").map(Number);
  let fps = Number(job.fps != null ? job.fps : $("exportFps")?.value);
  if (!Number.isFinite(fps) || fps < 1) fps = 30;
  fps = Math.min(120, Math.max(1, Math.round(fps)));

  let preset = job.preset || $("exportPreset")?.value || "balanced";
  if (!["max", "high", "balanced", "small"].includes(preset)) {
    preset = preset === "high" ? "high" : "balanced";
  }
  const format = job.format || $("exportFormat")?.value || "webm";

  /* Eco solo reduce resolución si el usuario no forzó QHD; no limita FPS elegido */
  if (powerMode === "eco" && !job.resolution && width * height > 1920 * 1080) {
    width = 1920;
    height = 1080;
  }

  const manualMbps = Number(job.bitrateMbps != null ? job.bitrateMbps : $("exportBitrateMbps")?.value);
  let bitrate = computeAutoVideoBitrate(width || 1920, height || 1080, fps, preset);
  if (Number.isFinite(manualMbps) && manualMbps > 0) {
    bitrate = Math.round(Math.min(100, manualMbps) * 1_000_000);
  }

  const audioKbps = Number(job.audioKbps != null ? job.audioKbps : $("exportAudioKbps")?.value) || 192;

  return {
    width: width || 1920,
    height: height || 1080,
    fps,
    bitrate,
    audioBitrate: Math.round(Math.min(320, Math.max(64, audioKbps)) * 1000),
    format,
    preset,
    name: job.name || $("exportFilename")?.value?.trim() || "video-obra-final",
    powerMode,
    allowHeavyConvert: powerMode !== "eco" || format === "gif",
    crf: preset === "max" ? 14 : preset === "high" ? 17 : preset === "small" ? 23 : 19
  };
}

function pickRecorderMime(format) {
  /*
   * MediaRecorder en Chrome casi siempre graba WebM.
   * Para mp4/mov/h265 preferimos mp4 nativo si existe; si no, webm (luego FFmpeg convierte).
   * Nunca preferir "vp9" sin audio.
   */
  const webmAudio = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9,vorbis",
    "video/webm;codecs=vp8,vorbis",
    "video/webm"
  ];
  const mp4Audio = [
    "video/mp4;codecs=avc1.640028,mp4a.40.2",
    "video/mp4;codecs=avc1.4D401F,mp4a.40.2",
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4"
  ];

  let candidates;
  if (format === "mp4" || format === "h265" || format === "mov") {
    candidates = [...mp4Audio, ...webmAudio];
  } else {
    /* webm / gif: grabar en webm (gif se convierte después) */
    candidates = [...webmAudio, ...mp4Audio];
  }

  for (const type of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

/** Extensión de archivo según el formato elegido en la UI */
function extensionForExportFormat(format) {
  if (format === "gif") return "gif";
  if (format === "mov") return "mov";
  if (format === "webm") return "webm";
  if (format === "mp4" || format === "h265") return "mp4";
  return "webm";
}

function mimeForExportExtension(ext) {
  if (ext === "gif") return "image/gif";
  if (ext === "mov") return "video/quicktime";
  if (ext === "mp4") return "video/mp4";
  return "video/webm";
}

function extensionFromRecorderMime(mimeType) {
  if (!mimeType) return "webm";
  if (mimeType.includes("mp4")) return "mp4";
  return "webm";
}

function waitFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Host oculto: videos de export DEBEN estar en el DOM o Chrome no avanza frames al hacer play(). */
function ensureExportMediaHost() {
  let host = document.getElementById("exportMediaHost");
  if (!host) {
    host = document.createElement("div");
    host.id = "exportMediaHost";
    host.setAttribute("aria-hidden", "true");
    host.style.cssText = "position:fixed;left:-10000px;top:0;width:2px;height:2px;overflow:hidden;opacity:0;pointer-events:none;z-index:-1;";
    document.body.appendChild(host);
  }
  return host;
}

function cacheExportVideoFrame(frameKey, video) {
  if (!video || video.tagName !== "VIDEO") return null;
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    return exportFrameCache.get(frameKey) || null;
  }
  let canvas = exportFrameCache.get(frameKey);
  if (!canvas) {
    canvas = document.createElement("canvas");
    exportFrameCache.set(frameKey, canvas);
  }
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
  try {
    canvas.getContext("2d", { alpha: false }).drawImage(video, 0, 0);
  } catch {
    return exportFrameCache.get(frameKey) || null;
  }
  return canvas;
}

function sourceForExportDraw(element, frameKey) {
  if (!element) return null;
  if (element.tagName === "IMG") {
    if (element.complete && element.naturalWidth) return element;
    return null;
  }
  if (element.tagName === "VIDEO") {
    const cached = exportFrameCache.get(frameKey);
    /* Durante seeking: cache evita frame negro (parpadeo). */
    if (element.seeking && cached) return cached;
    /*
     * Si el seek falló (_exportFrameOk=false) NO reutilizar cache de un PTS viejo:
     * eso congelaba el export mientras el preview seguía. Preferir el frame vivo.
     */
    if (element.videoWidth && element.readyState >= 2) return element;
    if (element.videoWidth && element.readyState >= 1 && !element.seeking) return element;
    if (cached) return cached;
    return element.videoWidth ? element : null;
  }
  return element;
}

async function getExportMediaElement(clip) {
  const media = mediaById(clip.mediaId);
  if (!media) return null;

  /*
   * Una instancia por CLIP (no por media): en transiciones from/to del mismo archivo
   * hacen falta dos <video> independientes; si no, ambos lados pintan el mismo frame
   * y la transición no se ve.
   */
  const cacheKey = `clip:${clip.id}`;
  let element = exportMediaCache.get(cacheKey);

  if (!element) {
    element = document.createElement(clip.type === "audio" ? "audio" : clip.type === "image" ? "img" : "video");
    if (clip.type !== "image") {
      element.preload = "auto";
      element.playsInline = true;
      element.muted = true;
      element.crossOrigin = "anonymous";
      /* Crítico: sin estar en el DOM, play()+RVFC se estanca → seek → snap a keyframe → freeze */
      if (clip.type === "video" || clip.type === "audio") {
        ensureExportMediaHost().appendChild(element);
      }
    }
    exportMediaCache.set(cacheKey, element);
  } else if ((clip.type === "video" || clip.type === "audio") && !element.isConnected) {
    ensureExportMediaHost().appendChild(element);
  }

  if (clip.type === "image") {
    if (element.dataset.mediaId !== media.id) {
      await new Promise((resolve, reject) => {
        element.onload = resolve;
        element.onerror = reject;
        element.src = media.url;
      });
      element.dataset.mediaId = media.id;
      element.dataset.clipId = clip.id;
    }
    return element;
  }

  if (element.dataset.mediaId !== media.id) {
    element.src = media.url;
    element.load();
    element.dataset.mediaId = media.id;
    element.dataset.clipId = clip.id;
    await new Promise((resolve, reject) => {
      if (element.readyState >= 2) return resolve();
      const ok = () => { cleanup(); resolve(); };
      const fail = () => { cleanup(); reject(new Error("No se pudo cargar medio para exportar")); };
      const cleanup = () => {
        element.removeEventListener("loadeddata", ok);
        element.removeEventListener("error", fail);
      };
      element.addEventListener("loadeddata", ok);
      element.addEventListener("error", fail);
      setTimeout(() => (element.readyState >= 2 ? ok() : fail()), 8000);
    });
    cacheExportVideoFrame(clip.id, element);
  }

  return element;
}

async function seekExportMedia(element, time) {
  if (!element || element.tagName === "IMG") return true;
  /* Durante export determinista: misma ruta anti-freeze que getFrameAtTime */
  if (state.exporting || state.exportDeterministic) {
    return seekAndWaitForFrame(element, time);
  }
  const duration = Number.isFinite(element.duration) ? element.duration : time + 1;
  const target = Math.max(0, Math.min(time, Math.max(0, duration - 0.05)));
  const skew = Math.abs((element.currentTime || 0) - target);
  if (skew < 0.04 && element.readyState >= 2) return true;

  element.pause();
  await new Promise((resolve) => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      element.removeEventListener("seeked", done);
      resolve();
    };
    element.addEventListener("seeked", done);
    try {
      element.currentTime = target;
    } catch {
      done();
      return;
    }
    setTimeout(done, 900);
  });

  if (element.requestVideoFrameCallback) {
    await new Promise((resolve) => {
      const id = element.requestVideoFrameCallback(() => resolve());
      setTimeout(resolve, 120);
      try { element.cancelVideoFrameCallback?.(id); } catch { /* ignore */ }
    });
  }
  return true;
}

function drawCover(ctx, source, dx, dy, dw, dh, clip) {
  if (!source) return false;
  const sw = source.videoWidth || source.naturalWidth || source.width || 0;
  const sh = source.videoHeight || source.naturalHeight || source.height || 0;
  if (!sw || !sh) return false;

  /* object-fit: contain — igual que el monitor de edición */
  const scale = Math.min(dw / sw, dh / sh) * (clip?.scale || 1);
  const tw = sw * scale;
  const th = sh * scale;
  const x = dx + (dw - tw) / 2 + (clip?.x || 0) * (dw / 1280);
  const y = dy + (dh - th) / 2 + (clip?.y || 0) * (dh / 720);

  ctx.save();
  ctx.globalAlpha = ctx.globalAlpha * (clip?.opacity ?? 1);
  ctx.translate(dx + dw / 2, dy + dh / 2);
  ctx.rotate(((clip?.rotation || 0) * Math.PI) / 180);
  ctx.translate(-(dx + dw / 2), -(dy + dh / 2));
  ctx.filter = visualFilter(clip || {});
  try {
    ctx.drawImage(source, x, y, tw, th);
  } catch {
    ctx.restore();
    ctx.filter = "none";
    return false;
  }
  ctx.restore();
  ctx.filter = "none";
  return true;
}

/** Estilos de transición para composición en canvas (espejo de applyTransitionEffect) */
function buildExportTransitionStyles(effect, progress, intensity, direction, width, height) {
  const p = Math.min(1, Math.max(0, progress)) * intensity;
  const from = { opacity: 1, tx: 0, ty: 0, scale: 1, rotate: 0, clipPath: null, filter: null };
  const to = { opacity: 1, tx: 0, ty: 0, scale: 1, rotate: 0, clipPath: null, filter: null };
  const overlay = { opacity: 0, color: "#000000" };

  const pctX = (v) => (v / 100) * width;
  const pctY = (v) => (v / 100) * height;

  if (effect === "cut") {
    from.opacity = progress < 0.5 ? 1 : 0;
    to.opacity = progress < 0.5 ? 0 : 1;
    return { from, to, overlay };
  }

  if (effect === "dissolve" || effect === "dissolve-soft" || effect === "blur" || effect === "dissolve-bright") {
    let mix = p;
    if (effect === "dissolve-soft") mix = progress * progress * (3 - 2 * progress) * intensity;
    /*
     * Crossfade correcto en canvas: capa inferior opaca + superior con alpha=mix.
     * Si ambas bajan alpha sobre negro, el punto medio se oscurece (falso “fade a negro”).
     */
    from.opacity = 1;
    to.opacity = mix;
    /*
     * En export, ctx.filter blur/brightness congela el hilo principal a 1080p/60
     * (doble decode + filtro). Preview sí usa blur; export usa disolución limpia.
     */
    if (effect === "blur" && !state.exporting) {
      const blurOut = (1 - Math.abs(0.5 - progress) * 2) * 12 * intensity;
      from.filter = `blur(${blurOut * (1 - progress)}px)`;
      to.filter = `blur(${blurOut * progress}px)`;
    }
    if (effect === "dissolve-bright" && !state.exporting) {
      const glow = Math.sin(progress * Math.PI) * 0.45 * intensity;
      from.filter = `brightness(${1 + glow})`;
      to.filter = `brightness(${1 + glow})`;
    }
    return { from, to, overlay };
  }

  if (effect === "fade-black" || effect === "fade-white" || effect === "fade-soft") {
    overlay.color = effect === "fade-white" ? "#ffffff" : effect === "fade-soft" ? "#1a1a1a" : "#000000";
    if (progress < 0.5) {
      const local = progress * 2 * intensity;
      from.opacity = 1 - local;
      to.opacity = 0;
      overlay.opacity = local;
    } else {
      const local = (progress - 0.5) * 2 * intensity;
      from.opacity = 0;
      to.opacity = local;
      overlay.opacity = 1 - local;
    }
    return { from, to, overlay };
  }

  if (effect === "flash") {
    from.opacity = 1 - progress;
    to.opacity = progress;
    overlay.color = "#ffffff";
    overlay.opacity = Math.sin(progress * Math.PI) * intensity;
    return { from, to, overlay };
  }

  if (effect === "wipe") {
    from.opacity = 1;
    to.opacity = 1;
    if (direction === "right") to.clipPath = `inset(0 0 0 ${(1 - p) * 100}%)`;
    else if (direction === "up") to.clipPath = `inset(${(1 - p) * 100}% 0 0 0)`;
    else if (direction === "down") to.clipPath = `inset(0 0 ${(1 - p) * 100}% 0)`;
    else to.clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`;
    return { from, to, overlay };
  }

  if (effect === "wipe-iris") {
    from.opacity = 1;
    to.opacity = 1;
    to.clipPath = `circle(${p * 75}% at 50% 50%)`;
    return { from, to, overlay };
  }

  if (effect === "wipe-diagonal") {
    from.opacity = 1;
    to.opacity = 1;
    const edge = p * 140;
    to.clipPath = `polygon(0 0, ${edge}% 0, ${edge - 40}% 100%, 0 100%)`;
    return { from, to, overlay };
  }

  if (effect === "wipe-barn") {
    from.opacity = 1;
    to.opacity = 1;
    const side = (1 - p) * 50;
    to.clipPath = `inset(0 ${side}% 0 ${side}%)`;
    return { from, to, overlay };
  }

  if (effect === "slide") {
    from.opacity = 1;
    to.opacity = 1;
    const offset = (1 - p) * 100;
    if (direction === "right") {
      from.tx = pctX(-p * 100);
      to.tx = pctX(offset - 100);
    } else if (direction === "up") {
      from.ty = pctY(-p * 100);
      to.ty = pctY(100 - offset);
    } else if (direction === "down") {
      from.ty = pctY(p * 100);
      to.ty = pctY(offset - 100);
    } else {
      from.tx = pctX(p * 100);
      to.tx = pctX(-offset);
    }
    return { from, to, overlay };
  }

  if (effect === "slide-cover") {
    from.opacity = 1;
    to.opacity = 1;
    if (direction === "right") to.tx = pctX((1 - p) * -100);
    else if (direction === "up") to.ty = pctY((1 - p) * 100);
    else if (direction === "down") to.ty = pctY((1 - p) * -100);
    else to.tx = pctX((1 - p) * 100);
    return { from, to, overlay };
  }

  if (effect === "slide-reveal") {
    from.opacity = 1;
    to.opacity = 1;
    if (direction === "right") from.tx = pctX(p * 100);
    else if (direction === "up") from.ty = pctY(-p * 100);
    else if (direction === "down") from.ty = pctY(p * 100);
    else from.tx = pctX(-p * 100);
    return { from, to, overlay };
  }

  if (effect === "zoom") {
    from.opacity = 1 - p * 0.85;
    to.opacity = p;
    from.scale = 1 + p * 0.35;
    to.scale = 0.75 + p * 0.25;
    return { from, to, overlay };
  }

  if (effect === "zoom-out") {
    from.opacity = 1 - p * 0.85;
    to.opacity = p;
    from.scale = 1 - p * 0.35;
    to.scale = 1.35 - p * 0.35;
    return { from, to, overlay };
  }

  if (effect === "spin") {
    const angle = p * 90;
    from.opacity = 1 - p;
    to.opacity = p;
    from.rotate = (-angle * Math.PI) / 180;
    to.rotate = ((90 - angle) * Math.PI) / 180;
    from.scale = 1 - p * 0.2;
    to.scale = 0.8 + p * 0.2;
    return { from, to, overlay };
  }

  /* Fallback: disolvencia */
  from.opacity = 1 - p;
  to.opacity = p;
  return { from, to, overlay };
}

function getFxScratchCanvas(width, height) {
  if (!getFxScratchCanvas._c) getFxScratchCanvas._c = document.createElement("canvas");
  const c = getFxScratchCanvas._c;
  if (c.width !== width || c.height !== height) {
    c.width = width;
    c.height = height;
  }
  return c;
}

function resolveClipDrawTransform(clip, time) {
  let scale = clip.scale || 1;
  let x = clip.x || 0;
  let y = clip.y || 0;
  let rotation = clip.rotation || 0;
  if (window.StudioEffects && !state.effectsCompare) {
    const ov = window.StudioEffects.transformOverride(clip, time);
    if (ov) {
      scale = ov.scale;
      x = ov.x;
      y = ov.y;
      if (ov.rotation != null) rotation = ov.rotation;
    }
  }
  return { scale, x, y, rotation };
}

async function drawExportLayerStyled(ctx, clip, width, height, time, style = {}) {
  if (!clip || (style.opacity ?? 1) <= 0.001) return false;
  const element = await prepareExportClip(clip, time);
  const source = sourceForExportDraw(element, clip.id);
  if (!source) return false;
  return paintExportLayer(ctx, source, clip, width, height, time, style, false);
}

/** Versión síncrona del compositor de capas (hot-path de export: sin awaits) */
function drawExportLayerStyledFast(ctx, clip, width, height, time, style = {}) {
  if (!clip || (style.opacity ?? 1) <= 0.001) return false;
  const element = syncPrepareExportClip(clip);
  const source = sourceForExportDraw(element, clip.id);
  if (!source) return false;
  return paintExportLayer(ctx, source, clip, width, height, time, style, true);
}

function paintExportLayer(ctx, source, clip, width, height, time, style, fastPath) {
  const sw = source.videoWidth || source.naturalWidth || source.width || 0;
  const sh = source.videoHeight || source.naturalHeight || source.height || 0;
  if (!sw || !sh) return false;

  const tr = resolveClipDrawTransform(clip, time);
  const fit = Math.min(width / sw, height / sh) * tr.scale;
  const tw = sw * fit;
  const th = sh * fit;
  const baseX = tr.x * (width / 1280);
  const baseY = tr.y * (height / 720);

  const needPixel = !state.effectsCompare
    && window.StudioEffects
    && window.StudioEffects.needsPixelPass(clip);

  const targetCtx = needPixel ? getFxScratchCanvas(width, height).getContext("2d") : ctx;
  if (needPixel) {
    targetCtx.setTransform(1, 0, 0, 1, 0, 0);
    targetCtx.clearRect(0, 0, width, height);
  }

  /* style.opacity ya incluye clipVisualOpacity (no volver a multiplicar clip.opacity) */
  const layerAlpha = Math.max(0, Math.min(1, style.opacity ?? 1));

  targetCtx.save();
  if (style.clipPath && !needPixel) applyCssClipPath(targetCtx, style.clipPath, width, height);
  targetCtx.globalAlpha = needPixel ? 1 : layerAlpha;
  const baseFilter = visualFilter(clip, time);
  let useFilter = style.filter || (baseFilter !== "none" ? baseFilter : null);
  /* En hot-path con transición (doble capa), evitar blur/brightness costosos */
  if (fastPath && useFilter && /blur\(|brightness\(/.test(useFilter) && layerAlpha < 0.999) {
    useFilter = useFilter.replace(/blur\([^)]*\)/g, "").replace(/brightness\([^)]*\)/g, "").trim() || null;
  }
  if (useFilter) targetCtx.filter = useFilter;
  targetCtx.translate(width / 2 + baseX + (style.tx || 0), height / 2 + baseY + (style.ty || 0));
  targetCtx.rotate((tr.rotation * Math.PI) / 180 + (style.rotate || 0));
  targetCtx.scale(style.scale ?? 1, style.scale ?? 1);
  try {
    targetCtx.drawImage(source, -tw / 2, -th / 2, tw, th);
  } catch {
    targetCtx.restore();
    if (useFilter) targetCtx.filter = "none";
    return false;
  }
  targetCtx.restore();
  if (useFilter) targetCtx.filter = "none";

  if (needPixel) {
    window.StudioEffects.applyPixelEffects(targetCtx, width, height, clip, time);
    ctx.save();
    if (style.clipPath) applyCssClipPath(ctx, style.clipPath, width, height);
    ctx.globalAlpha = layerAlpha;
    ctx.drawImage(getFxScratchCanvas(width, height), 0, 0);
    ctx.restore();
  }
  return true;
}

function parseLayerTransform(transform, width = 1280, height = 720) {
  const result = { x: 0, y: 0, scale: 1, rotate: 0 };
  if (!transform || transform === "none") return result;

  const translate = /translate\(\s*([-\d.]+)(px|%)?\s*,\s*([-\d.]+)(px|%)?\s*\)/.exec(transform);
  if (translate) {
    const xVal = Number(translate[1]) || 0;
    const yVal = Number(translate[3]) || 0;
    result.x = translate[2] === "%" ? (xVal / 100) * width : xVal;
    result.y = translate[4] === "%" ? (yVal / 100) * height : yVal;
  }

  const tx = /translateX\(\s*([-\d.]+)(px|%)?\s*\)/.exec(transform);
  if (tx) {
    const v = Number(tx[1]) || 0;
    result.x += tx[2] === "%" ? (v / 100) * width : v;
  }
  const ty = /translateY\(\s*([-\d.]+)(px|%)?\s*\)/.exec(transform);
  if (ty) {
    const v = Number(ty[1]) || 0;
    result.y += ty[2] === "%" ? (v / 100) * height : v;
  }

  const scale = /scale\(\s*([-\d.]+)\s*\)/.exec(transform);
  if (scale) result.scale = Number(scale[1]) || 1;
  const rotate = /rotate\(\s*([-\d.]+)deg\s*\)/.exec(transform);
  if (rotate) result.rotate = ((Number(rotate[1]) || 0) * Math.PI) / 180;
  return result;
}

function applyCssClipPath(ctx, clipPath, width, height) {
  if (!clipPath || clipPath === "none") return false;
  const trimmed = clipPath.trim();

  const inset = /^inset\(\s*([^)]+)\)/.exec(trimmed);
  if (inset) {
    const parts = inset[1].trim().split(/\s+/).map((part) => {
      if (part.endsWith("%")) return Number(part) / 100;
      return Number.parseFloat(part) || 0;
    });
    let top = 0;
    let right = 0;
    let bottom = 0;
    let left = 0;
    if (parts.length === 1) {
      top = right = bottom = left = parts[0];
    } else if (parts.length === 2) {
      top = bottom = parts[0];
      right = left = parts[1];
    } else if (parts.length === 3) {
      top = parts[0];
      right = left = parts[1];
      bottom = parts[2];
    } else if (parts.length >= 4) {
      [top, right, bottom, left] = parts;
    }
    const x = left * width;
    const y = top * height;
    const w = Math.max(0, width - (left + right) * width);
    const h = Math.max(0, height - (top + bottom) * height);
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    return true;
  }

  const circle = /^circle\(\s*([-\d.]+)%\s+at\s+([-\d.]+)%\s+([-\d.]+)%\s*\)/.exec(trimmed);
  if (circle) {
    const r = (Number(circle[1]) / 100) * Math.min(width, height);
    const cx = (Number(circle[2]) / 100) * width;
    const cy = (Number(circle[3]) / 100) * height;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2);
    ctx.clip();
    return true;
  }

  const polygon = /^polygon\(\s*([^)]+)\)/.exec(trimmed);
  if (polygon) {
    const points = polygon[1].split(",").map((pair) => {
      const nums = pair.trim().split(/\s+/);
      const x = nums[0].endsWith("%") ? (Number(nums[0]) / 100) * width : Number.parseFloat(nums[0]) || 0;
      const y = nums[1].endsWith("%") ? (Number(nums[1]) / 100) * height : Number.parseFloat(nums[1]) || 0;
      return { x, y };
    });
    if (!points.length) return false;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.clip();
    return true;
  }

  return false;
}

let monitorFrameCache = new WeakMap();

function cacheMonitorVideoFrame(element) {
  if (!element || element.tagName !== "VIDEO") return null;
  if (element.readyState < 2 || !element.videoWidth || !element.videoHeight) {
    return monitorFrameCache.get(element) || null;
  }
  let canvas = monitorFrameCache.get(element);
  if (!canvas) {
    canvas = document.createElement("canvas");
    monitorFrameCache.set(element, canvas);
  }
  if (canvas.width !== element.videoWidth || canvas.height !== element.videoHeight) {
    canvas.width = element.videoWidth;
    canvas.height = element.videoHeight;
  }
  try {
    canvas.getContext("2d", { alpha: false }).drawImage(element, 0, 0);
  } catch {
    return monitorFrameCache.get(element) || null;
  }
  return canvas;
}

function sourceForMonitorDraw(element) {
  if (!element) return null;
  if (element.tagName === "IMG") {
    return element.complete && element.naturalWidth ? element : null;
  }
  if (element.tagName === "VIDEO") {
    if (element.readyState >= 2 && element.videoWidth) {
      if (state.exporting && activeClip("transition")) cacheMonitorVideoFrame(element);
      return element;
    }
    return monitorFrameCache.get(element) || null;
  }
  return null;
}

function transitionCaptureReady() {
  const transition = activeClip("transition");
  if (!transition) return true;

  const fromClip = transition.fromClipId
    ? state.clips.find((clip) => clip.id === transition.fromClipId)
    : null;
  const toClip = transition.toClipId
    ? state.clips.find((clip) => clip.id === transition.toClipId)
    : null;
  const { primary, secondary } = getTransitionLayers();

  if (fromClip && !primary) return false;
  if (toClip && !secondary) return false;
  if (primary && !sourceForMonitorDraw(primary)) return false;
  if (secondary && !sourceForMonitorDraw(secondary)) return false;
  return true;
}

function drawMonitorLayerToCanvas(ctx, element, width, height) {
  if (!element) return false;
  if (element.style.display === "none" || element.hidden) return false;

  const source = sourceForMonitorDraw(element);
  if (!source) return false;

  const sw = source.videoWidth || source.naturalWidth || source.width || 0;
  const sh = source.videoHeight || source.naturalHeight || source.height || 0;
  if (!sw || !sh) return false;

  const opacity = Number(element.style.opacity || "1");
  if (opacity <= 0.001) return false;

  const t = parseLayerTransform(element.style.transform || "", width, height);
  const fit = Math.min(width / sw, height / sh);
  const tw = sw * fit;
  const th = sh * fit;

  ctx.save();
  applyCssClipPath(ctx, element.style.clipPath || "", width, height);
  ctx.globalAlpha = opacity;
  const filter = element.style.filter;
  ctx.filter = filter && filter !== "none" ? filter : "none";
  ctx.translate(width / 2 + t.x, height / 2 + t.y);
  ctx.rotate(t.rotate);
  ctx.scale(t.scale, t.scale);
  ctx.translate(-width / 2, -height / 2);
  try {
    ctx.drawImage(source, (width - tw) / 2, (height - th) / 2, tw, th);
  } catch {
    ctx.restore();
    ctx.filter = "none";
    return false;
  }
  ctx.restore();
  ctx.filter = "none";
  return true;
}

/** Captura WYSIWYG: misma composición visual que el monitor de edición */
function capturePreviewToCanvas(ctx, width, height) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.filter = "none";
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  const textClip = activeClip("text", state.currentTime);
  if (textClip && textClip.layerPosition === "behind") {
    drawExportText(ctx, textClip, width, height);
  }

  const layers = [ui.video, ui.videoSecondary, ui.image, ui.imageSecondary]
    .filter(Boolean)
    .sort((a, b) => (Number(a.style.zIndex) || 0) - (Number(b.style.zIndex) || 0));

  for (const layer of layers) drawMonitorLayerToCanvas(ctx, layer, width, height);

  if (ui.transitionOverlay && !ui.transitionOverlay.hidden) {
    const opacity = Number(ui.transitionOverlay.style.opacity || "0");
    if (opacity > 0.001) {
      ctx.globalAlpha = opacity;
      ctx.fillStyle = ui.transitionOverlay.style.background || "#000000";
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    }
  }

  if (textClip && textClip.layerPosition !== "behind") {
    drawExportText(ctx, textClip, width, height);
  }
  ctx.restore();
  return true;
}

function drawExportText(ctx, clip, width, height) {
  const cx = width / 2 + (clip.x || 0) * (width / 1280);
  const cy = height / 2 + (clip.y || 0) * (height / 720);
  const fontSize = Math.max(12, (clip.fontSize || 32) * (height / 720));

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(((clip.rotation || 0) * Math.PI) / 180);
  ctx.globalAlpha = ctx.globalAlpha * (clip.opacity ?? 1);
  ctx.font = `600 ${fontSize}px Segoe UI, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const text = clip.text || "";
  const metrics = ctx.measureText(text);
  const padX = 22 * (width / 1280);
  const padY = 12 * (height / 720);
  const boxW = metrics.width + padX * 2;
  const boxH = fontSize + padY * 2;

  if (!clip.backgroundTransparent) {
    ctx.fillStyle = clip.background || "#0a3768";
    ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);
  }

  ctx.fillStyle = clip.color || "#ffffff";
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

async function prepareExportClip(clip, time, options = {}) {
  if (!clip || clip.type === "text") return null;
  const element = await getExportMediaElement(clip);
  if (!element) return null;
  if (clip.type === "video" || clip.type === "audio") {
    const local = clipLocalTime(clip, time);
    if (state.exporting) {
      /* Nunca seek en ventana de transición: provoca paralización en el corte */
      const locked = options.noSeek === true || isExportTransitionLock(time);
      if (!locked) {
        const skew = Math.abs((element.currentTime || 0) - local);
        const tol = options.strict ? 0.08 : 0.28;
        if (skew > tol) {
          try { element.currentTime = local; } catch {}
          if (options.strict) {
            await Promise.race([
              new Promise((resolve) => {
                const done = () => {
                  element.removeEventListener("seeked", done);
                  resolve();
                };
                element.addEventListener("seeked", done);
              }),
              waitMs(35)
            ]);
          }
        }
      }
      if (element.paused) element.play().catch(() => {});
      if (options.strict && clip.type === "video") cacheExportVideoFrame(clip.id, element);
    } else {
      await seekExportMedia(element, local);
      if (clip.type === "video") cacheExportVideoFrame(clip.id, element);
    }
  }
  return element;
}

function peekExportMediaElement(clip) {
  if (!clip) return null;
  return exportMediaCache.get(`clip:${clip.id}`) || null;
}

/** Solo lectura; en modo determinista NO reproducir (seek frame-exacto). */
function syncPrepareExportClip(clip) {
  if (!clip || clip.type === "text") return null;
  const element = peekExportMediaElement(clip);
  if (
    element
    && element.tagName === "VIDEO"
    && element.paused
    && !state.exportDeterministic
  ) {
    element.play().catch(() => {});
  }
  return element;
}

function connectExportCacheToDest(dest) {
  for (const [, el] of exportMediaCache) {
    if (!el || el.tagName === "IMG") continue;
    connectElementToExportDest(el, dest);
  }
}

function pruneExportMediaCache() {
  const live = new Set(state.clips.map((clip) => `clip:${clip.id}`));
  for (const key of [...exportMediaCache.keys()]) {
    if (live.has(key)) continue;
    const el = exportMediaCache.get(key);
    try { el?.pause?.(); } catch {}
    exportMediaCache.delete(key);
  }
  for (const key of [...exportFrameCache.keys()]) {
    if (live.has(`clip:${key}`) || live.has(key) || state.clips.some((c) => c.id === key)) continue;
    exportFrameCache.delete(key);
  }
}

async function preloadExportMedia() {
  const jobs = state.clips
    .filter((clip) => clip.type === "video" || clip.type === "image" || clip.type === "audio")
    .map(async (clip) => {
      try {
        const el = await getExportMediaElement(clip);
        if (el && el.play && clip.type === "video") {
          el.muted = true;
          try { el.playbackRate = 1; } catch { /* ignore */ }
          try { el.currentTime = clip.sourceStart || 0; } catch { /* ignore */ }
        }
      } catch {
        /* ignore */
      }
    });
  await Promise.all(jobs);
}

/**
 * Calienta el decoder del primer vídeo antes del CFR.
 * Sin esto, los primeros ~0.5–1.5 s salen con temblores (play frío → overshoot → rewind).
 */
async function warmExportVideoDecoder(element, clip) {
  if (!element || element.tagName !== "VIDEO" || !clip) return;
  if (!element.isConnected) {
    try { ensureExportMediaHost().appendChild(element); } catch { /* ignore */ }
  }
  const start = Math.max(0, clipLocalTime(clip, clip.start));
  const mediaDur = Number.isFinite(element.duration) ? element.duration : start + 2;
  const warmTo = Math.min(Math.max(0, mediaDur - 0.04), start + 0.5);
  element.muted = true;
  try { element.playbackRate = 1; } catch { /* ignore */ }
  try { element.pause(); } catch { /* ignore */ }
  try { element.currentTime = start; } catch { /* ignore */ }
  await waitMs(60);
  try {
    const p = element.play();
    if (p && p.catch) await p.catch(() => {});
  } catch { /* ignore */ }

  const deadline = performance.now() + 1100;
  while (performance.now() < deadline) {
    const t = Number(element.currentTime) || 0;
    if (t >= warmTo - 0.02) break;
    if (typeof element.requestVideoFrameCallback === "function") {
      await new Promise((resolve) => {
        const id = element.requestVideoFrameCallback(() => resolve());
        setTimeout(() => {
          try { element.cancelVideoFrameCallback?.(id); } catch { /* ignore */ }
          resolve();
        }, 80);
      });
    } else {
      await waitMs(30);
    }
  }
  try { element.pause(); } catch { /* ignore */ }

  /* Volver al inicio con play-forward (no dejar I-frame frío) */
  try { element.currentTime = start; } catch { /* ignore */ }
  await waitMs(50);
  element._exportLastMedia = undefined;
  element._exportSourceTime = undefined;
  element._exportFingerprint = undefined;
  element._exportFrameOk = false;
  await seekAndWaitForFrame(element, start);
  /* Reset contadores para que el frame 0 del render no cuente como duplicado */
  element._exportLastMedia = undefined;
  element._exportSourceTime = undefined;
  element._exportFingerprint = undefined;
  if (element.videoWidth) cacheExportVideoFrame(clip.id, element);
}

/** Índice tipado: evita filtrar state.clips varias veces por frame */
function buildExportClipIndex() {
  const index = {
    byId: new Map(),
    transitions: [],
    videos: [],
    images: [],
    texts: [],
    audios: []
  };
  for (const clip of state.clips) {
    index.byId.set(clip.id, clip);
    if (clip.type === "transition") index.transitions.push(clip);
    else if (clip.type === "video") index.videos.push(clip);
    else if (clip.type === "image") index.images.push(clip);
    else if (clip.type === "text") index.texts.push(clip);
    else if (clip.type === "audio") index.audios.push(clip);
  }
  return index;
}

function activeFromList(list, time) {
  let best = null;
  for (let i = 0; i < list.length; i += 1) {
    const clip = list[i];
    if (time >= clip.start && time < clip.start + clip.duration) {
      if (!best || clip.start >= best.start) best = clip;
    }
  }
  return best;
}

/** Clave de escena para detectar cambios de clip (export) */
function buildExportSceneKeyAt(time) {
  const index = exportClipIndex;
  const transition = index
    ? activeFromList(index.transitions, time)
    : activeClip("transition", time);
  if (transition) {
    return `tr:${transition.id}:${transition.fromClipId || ""}:${transition.toClipId || ""}`;
  }
  const videoId = (index ? activeFromList(index.videos, time) : activeClip("video", time))?.id || "";
  const imageId = (index ? activeFromList(index.images, time) : activeClip("image", time))?.id || "";
  const textId = (index ? activeFromList(index.texts, time) : activeClip("text", time))?.id || "";
  return `sc:${videoId}:${imageId}:${textId}`;
}

/**
 * Calienta decoder + canvas ANTES de MediaRecorder.
 * Sin esto, los primeros ~300–600 ms del archivo salen con microparones.
 */
async function prerollExportCapture(ctx, width, height) {
  const waitRaf = () => new Promise((resolve) => requestAnimationFrame(resolve));

  /* 1) Posicionar y arrancar medios en t=0 */
  lastArmedExportKeys = new Set();
  syncExportMediaPlayback(0, { forceSeek: true });
  await Promise.all([...lastArmedExportKeys].map((key) => playExportElementWithAudio(exportMediaCache.get(key))));

  for (const key of lastArmedExportKeys) {
    const el = exportMediaCache.get(key);
    if (!el) continue;
    el.muted = false;
    try { el.volume = 1; } catch {}
  }

  /* 2) Esperar primer frame decodificado de cada vídeo activo */
  await Promise.all([...lastArmedExportKeys].map(async (key) => {
    const el = exportMediaCache.get(key);
    if (!el || el.tagName !== "VIDEO") return;
    if (el.readyState >= 2 && el.videoWidth) {
      cacheExportVideoFrame(key.replace(/^clip:/, ""), el);
      return;
    }
    await Promise.race([
      new Promise((resolve) => {
        if (el.requestVideoFrameCallback) {
          const id = el.requestVideoFrameCallback(() => resolve());
          setTimeout(() => {
            try { el.cancelVideoFrameCallback?.(id); } catch {}
            resolve();
          }, 180);
          return;
        }
        const done = () => {
          el.removeEventListener("loadeddata", done);
          el.removeEventListener("playing", done);
          resolve();
        };
        el.addEventListener("loadeddata", done);
        el.addEventListener("playing", done);
        setTimeout(done, 180);
      }),
      waitMs(200)
    ]);
    if (el.videoWidth) cacheExportVideoFrame(el.dataset.clipId || key.replace(/^clip:/, ""), el);
  }));

  /* 3) Dejar correr ~350 ms (decoder estable) dibujando sin grabar */
  const warmStart = performance.now();
  while (performance.now() - warmStart < 350) {
    const t = Math.min(0.35, (performance.now() - warmStart) / 1000);
    state.currentTime = t;
    syncExportMediaPlayback(t, { forceSeek: false });
    drawExportFrame(ctx, width, height, t);
    await waitRaf();
  }

  /* 4) Volver a t=0 UNA vez y esperar seek, luego play estable */
  state.currentTime = 0;
  syncExportMediaPlayback(0, { forceSeek: true });
  await Promise.all([...lastArmedExportKeys].map(async (key) => {
    const el = exportMediaCache.get(key);
    if (!el || el.tagName === "IMG") return;
    await Promise.race([
      new Promise((resolve) => {
        const done = () => {
          el.removeEventListener("seeked", done);
          resolve();
        };
        el.addEventListener("seeked", done);
        setTimeout(done, 120);
      }),
      waitMs(130)
    ]);
    await playExportElementWithAudio(el);
  }));

  /* 5) Algunos frames estables en t≈0 antes de pulsar Record */
  for (let i = 0; i < 4; i += 1) {
    state.currentTime = 0;
    syncExportMediaPlayback(0, { forceSeek: false });
    drawExportFrame(ctx, width, height, 0);
    await waitRaf();
  }

  /* 6) Prearmar primera transición (si llega pronto) para no arrancar frío */
  state.currentTime = 0;
  prearmUpcomingExportTransition(0);
  await waitMs(40);
  prearmUpcomingExportTransition(0);
}

let exportClipIndex = null;
let lastExportPreloadAt = 0;
let prearmedExportKeys = new Set();
let lastPrearmedTransitionId = null;

function clipLocalTime(clip, timelineTime) {
  if (window.StudioSpeed) {
    const media = mediaById(clip.mediaId);
    if (media?.duration) clip._mediaDuration = media.duration;
    return window.StudioSpeed.mapTimelineToSource(clip, timelineTime);
  }
  return (clip.sourceStart || 0)
    + Math.min(Math.max(timelineTime - clip.start, 0), Math.max(0, clip.duration - 0.01));
}

function upcomingExportTransition(nowTime, horizon = 2.25) {
  if (!exportClipIndex?.transitions?.length) return null;
  return exportClipIndex.transitions
    .filter((clip) => clip.start > nowTime && clip.start - nowTime < horizon)
    .sort((a, b) => a.start - b.start)[0] || null;
}

function isExportTransitionLock(time) {
  const list = exportClipIndex?.transitions;
  const tr = list
    ? activeFromList(list, time)
    : activeClip("transition", time);
  if (tr) return true;
  const upcoming = upcomingExportTransition(time, 0.7);
  if (upcoming) return true;
  /* Gracia post-corte: no seek justo al salir (evita microparo al soltar el lock) */
  if (list?.length) {
    for (const clip of list) {
      const end = clip.start + clip.duration;
      if (time >= end && time < end + 0.28) return true;
    }
  } else {
    for (const clip of state.clips) {
      if (clip.type !== "transition") continue;
      const end = clip.start + clip.duration;
      if (time >= end && time < end + 0.28) return true;
    }
  }
  return false;
}

/** Aplica prearm a un elemento ya disponible (ruta síncrona = sin carrera). */
function applyExportPrearmToElement(el, toClip, upcoming, nowTime) {
  if (!el || !toClip || !upcoming) return;
  const toKey = `clip:${toClip.id}`;
  if (toClip.type === "image") {
    prearmedExportKeys.add(toKey);
    lastPrearmedTransitionId = upcoming.id;
    return;
  }
  if (toClip.type !== "video" && toClip.type !== "audio") return;

  const eta = upcoming.start - nowTime;
  /*
   * Reloj especulativo: cuando falten `eta` segundos, el media debe estar en
   * localAtStart - eta, para llegar justo al frame de entrada sin seek.
   */
  const localAtStart = clipLocalTime(toClip, upcoming.start);
  const targetLocal = Math.max(0, localAtStart - Math.max(0, eta));
  const skew = Math.abs((el.currentTime || 0) - targetLocal);

  setExportElementGain(el, 0);
  try { el.playbackRate = 1; } catch {}

  /* Dentro de ~0.75s del corte: NUNCA seek — solo play continuo */
  const nearCut = eta <= 0.75;

  if (el.paused) {
    if (!nearCut) {
      try { el.currentTime = targetLocal; } catch {}
    }
    el.muted = true;
    el.play().then(() => { el.muted = false; }).catch(() => {});
  } else if (!nearCut && !el.seeking && skew > 0.55 && eta > 0.75) {
    try { el.currentTime = targetLocal; } catch {}
  } else if (el.muted) {
    el.muted = false;
  }

  if (el.readyState >= 2) cacheExportVideoFrame(toClip.id, el);
  prearmedExportKeys.add(toKey);
  lastPrearmedTransitionId = upcoming.id;
}

/**
 * Prearma el clip de ENTRADA en PLAY continuo (gain 0), sincronizado al reloj.
 * Sin pause/seek cerca del corte → evita paralización en la transición.
 */
function prearmUpcomingExportTransition(nowTime) {
  if (!exportClipIndex) return;
  const upcoming = upcomingExportTransition(nowTime, 2.25);

  if (!upcoming) {
    for (const key of [...prearmedExportKeys]) {
      if (lastArmedExportKeys.has(key)) continue;
      const el = exportMediaCache.get(key);
      if (el && typeof el.pause === "function" && !el.paused) {
        try { el.pause(); } catch {}
      }
      prearmedExportKeys.delete(key);
    }
    lastPrearmedTransitionId = null;
    return;
  }

  const toClip = upcoming.toClipId ? exportClipIndex.byId.get(upcoming.toClipId) : null;
  if (!toClip) return;
  const cached = peekExportMediaElement(toClip);
  if (cached) {
    applyExportPrearmToElement(cached, toClip, upcoming, nowTime);
    return;
  }
  getExportMediaElement(toClip).then((el) => {
    if (!el) return;
    /* Si ya estamos en el corte, no seek — solo play */
    applyExportPrearmToElement(el, toClip, upcoming, nowTime);
  }).catch(() => {});
}

/** Entrada a transición: solo play del TO si hace falta — cero seeks */
async function warmExportTransition(transition, time) {
  if (!transition) return;
  const toClip = transition.toClipId
    ? (exportClipIndex?.byId.get(transition.toClipId) || state.clips.find((c) => c.id === transition.toClipId))
    : null;
  if (!toClip || toClip.type === "image") {
    if (toClip) prearmedExportKeys.add(`clip:${toClip.id}`);
    return;
  }
  const el = peekExportMediaElement(toClip) || await getExportMediaElement(toClip).catch(() => null);
  if (!el) return;
  prearmedExportKeys.add(`clip:${toClip.id}`);
  if (el.paused && typeof el.play === "function") {
    await playExportElementWithAudio(el);
  } else {
    try { el.muted = false; } catch {}
  }
  if (el.readyState >= 2) cacheExportVideoFrame(toClip.id, el);
}

let lastArmedExportKeys = new Set();

/**
 * Sync de export. En ventana de transición: NUNCA seek (from/to en play libre).
 */
function syncExportMediaPlayback(time, options = {}) {
  const forceSeek = options.forceSeek === true;
  const index = exportClipIndex;
  const transition = index
    ? activeFromList(index.transitions, time)
    : activeClip("transition", time);
  const lockSeeks = Boolean(transition) || isExportTransitionLock(time);
  const activeIds = new Set();

  const arm = (clip, gain = 1) => {
    if (!clip || (clip.type !== "video" && clip.type !== "audio")) return;
    const key = `clip:${clip.id}`;
    const el = exportMediaCache.get(key);
    if (!el) return;
    activeIds.add(key);
    const local = clipLocalTime(clip, time);
    const vol = Math.min(1, Math.max(0, (clip.volume ?? 1) * state.masterVolume * gain * (clip.muted ? 0 : 1)));
    const wasArmed = lastArmedExportKeys.has(key);
    const wasPrearmed = prearmedExportKeys.has(key);

    setExportElementGain(el, vol);

    /*
     * LOCK de transición: mantener play, CERO seeks (from/to).
     * Cualquier currentTime= aquí paraliza el corte.
     */
    if (lockSeeks) {
      if (el.paused && typeof el.play === "function") {
        el.play().catch(() => {});
      }
      try { el.muted = false; } catch {}
      if (wasPrearmed && transition) prearmedExportKeys.delete(key);
      return;
    }

    const noteSeek = () => {
      const m = window.__E2E_EXPORT_METRICS__;
      if (!m) return;
      m.seeks += 1;
      if (lockSeeks) m.seeksInLock += 1;
      if (transition) m.seeksInTransition += 1;
    };

    if (el.paused) {
      try { el.currentTime = local; noteSeek(); } catch {}
      if (typeof el.play === "function") {
        el.muted = true;
        el.play().then(() => {
          el.muted = false;
          try { el.volume = 1; } catch {}
        }).catch(() => {});
      }
    } else if (!wasArmed && !wasPrearmed) {
      const skew = Math.abs((el.currentTime || 0) - local);
      if (skew > 0.25) {
        try { el.currentTime = local; noteSeek(); } catch {}
      }
      try { el.muted = false; } catch {}
    } else if (forceSeek && !wasArmed) {
      try { el.currentTime = local; noteSeek(); } catch {}
    } else if (!el.seeking) {
      const skew = Math.abs((el.currentTime || 0) - local);
      if (skew > 1.0) {
        try { el.currentTime = local; noteSeek(); } catch {}
      }
      if (el.muted) el.muted = false;
    } else if (el.muted) {
      el.muted = false;
    }

    if (wasPrearmed) prearmedExportKeys.delete(key);
  };

  if (transition) {
    const fromClip = transition.fromClipId
      ? (index?.byId.get(transition.fromClipId) || state.clips.find((clip) => clip.id === transition.fromClipId))
      : null;
    const toClip = transition.toClipId
      ? (index?.byId.get(transition.toClipId) || state.clips.find((clip) => clip.id === transition.toClipId))
      : null;
    const raw = (time - transition.start) / Math.max(0.001, transition.duration);
    const progress = easeProgress(Math.min(1, Math.max(0, raw)), transition.easing || "linear");
    if (fromClip?.type === "video") arm(fromClip, 1 - progress);
    if (toClip?.type === "video") arm(toClip, progress);
    if (fromClip?.type === "image") activeIds.add(`clip:${fromClip.id}`);
    if (toClip?.type === "image") activeIds.add(`clip:${toClip.id}`);
  } else {
    const videoClip = index ? activeFromList(index.videos, time) : activeClip("video", time);
    if (videoClip) arm(videoClip, 1);
  }

  const audios = index ? index.audios : null;
  if (audios) {
    for (const clip of audios) {
      const local = time - clip.start;
      if (local >= 0 && local < clip.duration) arm(clip, 1);
    }
  } else {
    for (const clip of state.clips) {
      if (clip.type !== "audio") continue;
      const local = time - clip.start;
      if (local >= 0 && local < clip.duration) arm(clip, 1);
    }
  }

  for (const key of lastArmedExportKeys) {
    if (activeIds.has(key)) continue;
    if (prearmedExportKeys.has(key)) continue;
    const el = exportMediaCache.get(key);
    if (el && typeof el.pause === "function" && !el.paused) {
      try { el.pause(); } catch {}
    }
    if (el) setExportElementGain(el, 0);
  }
  lastArmedExportKeys = activeIds;
}

function drawExportClipFast(ctx, clip, width, height, time) {
  if (!clip) return;
  if (clip.type === "text") {
    drawExportText(ctx, clip, width, height);
    return;
  }
  if (clip.type === "audio") return;
  /* Misma ruta que capas/transiciones: CSS filter + FX pixel (preview ≈ export) */
  drawExportLayerStyledFast(ctx, clip, width, height, time, {
    opacity: clipVisualOpacity(clip, time)
  });
}

function drawExportFrame(ctx, width, height, time) {
  /* Compositor de exportación: síncrono (hot-path) — mismas transiciones, sin awaits */
  /* Evitar t==duration (intervalo half-open) → último fotograma negro */
  const duration = Math.max(0.1, projectDuration());
  const t = Math.min(time, Math.max(0, duration - 1e-4));

  const index = exportClipIndex;
  const transition = index
    ? activeFromList(index.transitions, t)
    : activeClip("transition", t);
  const textClip = index
    ? activeFromList(index.texts, t)
    : activeClip("text", t);
  const videoClip = transition
    ? null
    : (index ? activeFromList(index.videos, t) : activeClip("video", t));
  const imageClip = transition
    ? null
    : (index ? activeFromList(index.images, t) : activeClip("image", t));

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.filter = "none";
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  if (transition) {
    const fromClip = transition.fromClipId
      ? (index?.byId.get(transition.fromClipId) || state.clips.find((clip) => clip.id === transition.fromClipId))
      : null;
    const toClip = transition.toClipId
      ? (index?.byId.get(transition.toClipId) || state.clips.find((clip) => clip.id === transition.toClipId))
      : null;
    const raw = (t - transition.start) / Math.max(0.001, transition.duration);
    const progress = easeProgress(Math.min(1, Math.max(0, raw)), transition.easing || "linear");
    const effect = transitionEffectId(transition.transitionType);
    const intensity = transition.intensity ?? 1;
    const direction = transition.direction || "left";
    const styles = buildExportTransitionStyles(effect, progress, intensity, direction, width, height);

    if (fromClip && !toClip) {
      drawExportLayerStyledFast(ctx, fromClip, width, height, t, {
        opacity: Math.max(0, 1 - progress * intensity) * clipVisualOpacity(fromClip, t),
        filter: styles.from.filter
      });
      if (styles.overlay.opacity > 0.001 || effect === "cut") {
        ctx.globalAlpha = effect === "cut"
          ? (progress < 0.5 ? 0 : 1)
          : Math.min(1, progress * intensity);
        ctx.fillStyle = styles.overlay.color || (effect === "fade-white" ? "#ffffff" : "#000000");
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;
      }
    } else if (!fromClip && toClip) {
      if (styles.overlay.opacity > 0.001 || effect === "cut") {
        ctx.globalAlpha = effect === "cut"
          ? (progress < 0.5 ? 1 : 0)
          : Math.max(0, 1 - progress * intensity);
        ctx.fillStyle = styles.overlay.color || (effect === "fade-white" ? "#ffffff" : "#000000");
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;
      }
      drawExportLayerStyledFast(ctx, toClip, width, height, t, {
        opacity: Math.min(1, progress * intensity) * clipVisualOpacity(toClip, t),
        filter: styles.to.filter
      });
    } else {
      drawExportLayerStyledFast(ctx, fromClip, width, height, t, {
        ...styles.from,
        opacity: (styles.from.opacity ?? 1) * clipVisualOpacity(fromClip, t)
      });
      drawExportLayerStyledFast(ctx, toClip, width, height, t, {
        ...styles.to,
        opacity: (styles.to.opacity ?? 1) * clipVisualOpacity(toClip, t)
      });
      if (styles.overlay.opacity > 0.001) {
        ctx.globalAlpha = styles.overlay.opacity;
        ctx.fillStyle = styles.overlay.color;
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;
      }
    }

    /* Imagen V2 encima de la transición (no extremos FX) */
    const skip = new Set([transition.fromClipId, transition.toClipId].filter(Boolean));
    const overlays = (index?.images || state.clips.filter((c) => c.type === "image"))
      .filter((clip) => t >= clip.start && t < clip.start + clip.duration && !skip.has(clip.id));
    for (const clip of overlays) {
      drawExportLayerStyledFast(ctx, clip, width, height, t, {
        opacity: clipVisualOpacity(clip, t)
      });
    }
  } else {
    const behindText = textClip && textClip.layerPosition === "behind";
    if (behindText) drawExportText(ctx, textClip, width, height);
    if (videoClip) drawExportClipFast(ctx, videoClip, width, height, t);
    if (imageClip) {
      drawExportLayerStyledFast(ctx, imageClip, width, height, t, {
        opacity: clipVisualOpacity(imageClip, t)
      });
    }
  }

  if (textClip && textClip.layerPosition !== "behind") {
    drawExportText(ctx, textClip, width, height);
  }
  ctx.restore();
}

/**
 * Base del sitio (GitHub Pages / subcarpeta / index.html).
 * Usa la URL de app.js para no romper rutas en https://usuario.github.io/repo/
 */
function appBaseUrl() {
  const script = document.querySelector('script[src$="app.js"], script[src*="app.js?"]');
  if (script?.src) {
    try {
      return new URL(".", script.src).href;
    } catch {}
  }
  try {
    const href = document.baseURI || window.location.href;
    if (/\.html?(?:[?#]|$)/i.test(href)) return new URL(".", href).href;
    const u = new URL(href);
    if (!u.pathname.endsWith("/")) u.pathname += "/";
    return u.href;
  } catch {
    return window.location.href;
  }
}

/**
 * FFmpeg 0.11 + core-st (un solo hilo, sin SharedArrayBuffer).
 * En GitHub Pages / http(s): vendor/ffmpeg11/ relativo al sitio.
 * En file://: CDN (el navegador bloquea fetch local del .wasm).
 */
function ffmpegVendorBase() {
  return new URL("vendor/ffmpeg11/", appBaseUrl()).href;
}

function ffmpegCdnBase() {
  return "https://cdn.jsdelivr.net/npm/@ffmpeg/core-st@0.11.1/dist/";
}

async function fetchFFmpegAsset(url, label) {
  let response;
  try {
    response = await fetch(url, { cache: "force-cache", mode: "cors" });
  } catch (error) {
    throw new Error(`NetworkError al cargar ${label}`);
  }
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${label} (HTTP ${response.status})`);
  }
  return response;
}

async function resolveFFmpegAssetUrls() {
  const localBase = ffmpegVendorBase();
  const cdnBase = ffmpegCdnBase();
  const local = {
    coreJs: `${localBase}ffmpeg-core.js`,
    coreWasm: `${localBase}ffmpeg-core.wasm`,
    coreWorker: `${localBase}ffmpeg-core.worker.js`,
    source: "local"
  };
  const cdn = {
    coreJs: `${cdnBase}ffmpeg-core.js`,
    coreWasm: `${cdnBase}ffmpeg-core.wasm`,
    coreWorker: `${cdnBase}ffmpeg-core.worker.js`,
    source: "cdn"
  };

  /* file:// no puede leer el .wasm del disco: CDN */
  if ((window.location.protocol || "") === "file:") {
    reportFfmpegProgress(78, "Modo archivo local: cargando conversor desde CDN…");
    studioCapabilities.ffmpegSource = "cdn";
    return cdn;
  }

  try {
    reportFfmpegProgress(78, "Comprobando conversor del sitio…");
    await fetchFFmpegAsset(local.coreJs, "ffmpeg-core.js");
    await fetchFFmpegAsset(local.coreWasm, "ffmpeg-core.wasm");
    studioCapabilities.ffmpegSource = "local";
    return local;
  } catch {
    reportFfmpegProgress(78, "Motor del sitio no accesible; usando CDN de respaldo…");
    studioCapabilities.ffmpegSource = "cdn-fallback";
    return cdn;
  }
}

async function loadScriptOnce(src, globalName) {
  if (globalName && typeof window[globalName] !== "undefined") return;
  const existing = document.querySelector(`script[data-ffmpeg-src="${src}"]`);
  if (existing) {
    await new Promise((resolve, reject) => {
      if (existing.dataset.loaded === "1") resolve();
      else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`No se pudo cargar ${src}`)), { once: true });
      }
    });
    return;
  }
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.crossOrigin = "anonymous";
    script.dataset.ffmpegSrc = src;
    script.onload = () => {
      script.dataset.loaded = "1";
      resolve();
    };
    script.onerror = () => reject(new Error(`No se pudo cargar el script ${src}`));
    document.head.appendChild(script);
  });
}

/** Lee File/Blob a Uint8Array sin fetch (evita NetworkError de fetchFile con rutas rotas) */
async function blobToUint8Array(data) {
  if (!data) return new Uint8Array();
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (typeof data.arrayBuffer === "function") {
    return new Uint8Array(await data.arrayBuffer());
  }
  return new Uint8Array(await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No se pudo leer el archivo de video en memoria."));
    reader.readAsArrayBuffer(data);
  }));
}

async function loadFFmpeg() {
  if (ffmpegInstance?.isLoaded?.()) return ffmpegInstance;
  if (ffmpegLoading) return ffmpegLoading;

  ffmpegLoading = (async () => {
    if (!window.FFmpeg?.createFFmpeg) {
      throw new Error("FFmpeg no cargó. Recargue la página (Ctrl+F5).");
    }
    const { createFFmpeg, fetchFile } = window.FFmpeg;
    window.__ffmpegFetchFile = fetchFile;

    const assets = await resolveFFmpegAssetUrls();
    reportFfmpegProgress(80, assets.source === "cdn"
      ? "Descargando motor WASM desde CDN (primera vez)…"
      : "Preparando motor WASM local…");

    /* Prefetch wasm para fallar pronto con mensaje claro */
    await fetchFFmpegAsset(assets.coreWasm, "ffmpeg-core.wasm");
    await fetchFFmpegAsset(assets.coreWorker, "ffmpeg-core.worker.js").catch(() => null);

    reportFfmpegProgress(82, "Iniciando conversor…");
    try {
      await loadScriptOnce(assets.coreJs, "createFFmpegCore");
    } catch {
      /* createFFmpeg.load() también inyecta el script */
    }

    const ffmpeg = createFFmpeg({
      log: false,
      corePath: assets.coreJs,
      wasmPath: assets.coreWasm,
      workerPath: assets.coreWorker,
      mainName: "main",
      progress: ({ ratio }) => {
        const pct = Math.max(0, Math.min(1, Number(ratio) || 0));
        reportFfmpegProgress(86 + pct * 12, `Convirtiendo a MP4… ${Math.round(pct * 100)}%`);
      }
    });

    await Promise.race([
      ffmpeg.load(),
      new Promise((_, reject) => setTimeout(
        () => reject(new Error("Timeout iniciando conversor (90s). Recargue la página o compruebe la conexión.")),
        90_000
      ))
    ]);

    ffmpegInstance = ffmpeg;
    reportFfmpegProgress(86, "Conversor listo, codificando…");
    return ffmpeg;
  })();

  try {
    return await ffmpegLoading;
  } catch (error) {
    ffmpegLoading = null;
    ffmpegInstance = null;
    const raw = String(error?.message || error || "");
    if (/NetworkError|Failed to fetch|Load failed|network/i.test(raw)) {
      throw new Error(
        "No se pudo cargar FFmpeg. Publique el sitio en GitHub Pages (https://) e incluya la carpeta vendor/ffmpeg11/. Compruebe su conexión."
      );
    }
    throw error;
  }
}

function ffmpegDataToBlob(data, mime) {
  const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  return new Blob([u8.slice()], { type: mime });
}

function looksLikeMp4Bytes(u8) {
  if (!u8 || u8.length < 12) return false;
  return u8[4] === 0x66 && u8[5] === 0x74 && u8[6] === 0x79 && u8[7] === 0x70;
}

function wasmX264Preset(settings) {
  const lowMem = (navigator.deviceMemory || 4) <= 4;
  if (lowMem || settings.powerMode === "eco") return "veryfast";
  if (settings.preset === "small") return "veryfast";
  if (settings.preset === "max") return "fast";
  if (settings.preset === "high") return "faster";
  return "veryfast";
}

function wasmVideoBitrateK(settings) {
  const requested = Math.round((settings.bitrate || 12_000_000) / 1000);
  const lowMem = (navigator.deviceMemory || 4) <= 4;
  const wantMax = settings.preset === "max" || settings.preset === "high";
  const cap = lowMem
    ? (settings.width >= 1920 ? (wantMax ? 10_000 : 6_000) : 5_000)
    : (settings.width >= 1920 ? (wantMax ? 24_000 : 16_000) : settings.width >= 1280 ? 12_000 : 6_000);
  return Math.max(1500, Math.min(requested, cap));
}

function exportEncodeCrf(settings) {
  const preset = settings.preset || "balanced";
  if (preset === "max") return Math.max(12, Math.min(16, settings.crf ?? 14));
  if (preset === "high") return Math.max(14, Math.min(18, settings.crf ?? 17));
  if (preset === "small") return Math.max(22, Math.min(28, settings.crf ?? 26));
  return Math.max(17, Math.min(22, settings.crf ?? 19));
}

function buildMp4ArgList(inputName, outputName, settings, ultra = false) {
  const lowMem = (navigator.deviceMemory || 4) <= 4;
  const isHevc = settings.format === "h265";
  const videoCodec = isHevc ? "libx265" : "libx264";
  /* Siempre CFR: el WebM del navegador suele ser VFR y congela el MP4 en muchos reproductores */
  const targetFps = Math.min(
    ultra || lowMem ? 30 : 60,
    Math.max(1, Number(settings.fps) || 30)
  );
  const crf = ultra || lowMem ? 22 : exportEncodeCrf(settings);
  const audioK = Math.min(192, Math.round((settings.audioBitrate || 192000) / 1000));
  const preset = ultra ? "ultrafast" : wasmX264Preset(settings);
  const videoBitrateK = ultra ? 3_500 : wasmVideoBitrateK(settings);
  const gop = Math.max(targetFps, Math.round(targetFps * 2));

  const vf = [];
  if (settings.forceScale) {
    vf.push(`scale=${settings.forceScale}:-2`);
  } else if (!settings.keepResolution && (ultra || lowMem) && (settings.width || 0) >= 1920) {
    vf.push("scale=1280:-2");
  } else {
    /* yuv420p exige ancho/alto pares */
    vf.push("scale=trunc(iw/2)*2:trunc(ih/2)*2");
  }
  vf.push(`fps=${targetFps}`);
  vf.push("format=yuv420p");
  vf.push("setpts=PTS-STARTPTS");

  const args = [
    "-fflags", "+genpts",
    "-i", inputName,
    "-vf", vf.join(","),
    "-c:v", videoCodec,
    "-preset", preset,
    "-crf", String(crf),
    "-maxrate", `${videoBitrateK}k`,
    "-bufsize", `${videoBitrateK * 2}k`,
    "-pix_fmt", "yuv420p",
    "-vsync", "cfr",
    "-r", String(targetFps),
    "-g", String(gop),
    "-keyint_min", String(targetFps),
    "-sc_threshold", "0",
    "-bf", "0",
    "-c:a", "aac",
    "-b:a", `${audioK}k`,
    "-ac", "2",
    "-ar", "44100",
    "-af", "aresample=async=1:first_pts=0,asetpts=PTS-STARTPTS",
    "-movflags", "+faststart",
    "-threads", "1",
    "-y", outputName
  ];
  if (isHevc) {
    const tagAt = args.indexOf("-pix_fmt");
    args.splice(tagAt, 0, "-tag:v", "hvc1");
  }
  return args;
}

/** Variante sin audio (si el origen no trae pista o AAC falla) */
function buildMp4ArgListVideoOnly(inputName, outputName, settings, ultra = false) {
  const args = buildMp4ArgList(inputName, outputName, settings, ultra);
  const out = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "-c:a" || args[i] === "-b:a" || args[i] === "-ac" || args[i] === "-ar" || args[i] === "-af") {
      i += 1;
      continue;
    }
    out.push(args[i]);
  }
  out.splice(out.indexOf("-y"), 0, "-an");
  return out;
}

async function convertWithFFmpeg(inputBlob, settings) {
  return withFFmpegQueue(async () => {
    reportFfmpegProgress(82, "Preparando conversión MP4…");
    let ffmpeg = await loadFFmpeg();

    const format = settings.format;
    const jobId = `j${Date.now().toString(36)}`;
    const inputExt = guessFfmpegInputExt(inputBlob);
    const inputName = `input_${jobId}.${inputExt}`;
    const targetExt = extensionForExportFormat(format);
    let outputName = `out_${jobId}.${targetExt === "gif" ? "gif" : targetExt === "webm" ? "webm" : "mp4"}`;
    if (format === "mov") outputName = `out_${jobId}.mov`;

    const sizeMb = (inputBlob?.size || 0) / 1e6;
    reportFfmpegProgress(83, `Pasando ${sizeMb.toFixed(1)} MB al conversor…`);
    const inputBytes = await blobToUint8Array(inputBlob);
    try { ffmpeg.FS("unlink", inputName); } catch {}
    ffmpeg.FS("writeFile", inputName, inputBytes);

    let jobSettings = settings;
    const lowMem = (navigator.deviceMemory || 4) <= 4;
    if (
      jobSettings.keepResolution
      && ((jobSettings.width || 0) >= 1920 || sizeMb >= 40)
      && lowMem
    ) {
      jobSettings = {
        ...jobSettings,
        keepResolution: false,
        forceScale: 1280,
        width: 1280
      };
      reportFfmpegProgress(83.5, "PC con poca RAM: escalando a 1280p para completar la conversión…");
    }

    let args;
    if (format === "gif") {
      outputName = `out_${jobId}.gif`;
      args = ["-i", inputName, "-vf", "fps=10,scale=480:-1:flags=fast_bilinear", "-y", outputName];
    } else if (format === "webm") {
      outputName = `out_${jobId}.webm`;
      const fps = Math.min(30, Math.max(1, jobSettings.fps || 30));
      const br = wasmVideoBitrateK(jobSettings);
      args = [
        "-i", inputName, "-r", String(fps),
        "-c:v", "libvpx", "-b:v", `${br}k`, "-deadline", "realtime", "-cpu-used", "8",
        "-c:a", "libopus", "-b:a", "96k", "-threads", "1", "-y", outputName
      ];
    } else {
      args = buildMp4ArgList(inputName, outputName, jobSettings, false);
    }

    const runOnce = async (runArgs, runLabel) => {
      await ffmpegRun(runArgs, runLabel || label);
    };

    const run = async (runArgs, label) => {
      reportFfmpegProgress(84, label);
      let heart = 0;
      const beat = setInterval(() => {
        heart += 1;
        reportFfmpegProgress(84 + Math.min(11, heart * 0.2), `${label} · ${heart}s`);
      }, 1000);
      try {
        try {
          await runOnce(runArgs, label);
        } catch (err) {
          const msg = String(err?.message || err);
          /* Tras un fallo, el flag interno de ffmpeg.wasm suele quedar bloqueado */
          reportFfmpegProgress(84.5, "Reiniciando conversor…");
          await resetFFmpegInstance();
          try { (await loadFFmpeg()).FS("writeFile", inputName, inputBytes); } catch {}
          if (/one command at a time|occupied|ocupado/i.test(msg)) {
            await runOnce(runArgs, `${label} (reintento)`);
            return;
          }
          /* Reintento único tras reset (comando falló por encoder/args) */
          await runOnce(runArgs, `${label} (reintento)`);
        }
      } finally {
        clearInterval(beat);
      }
    };

    try {
      await run(args, `Codificando .${outputName.split(".").pop()}…`);
    } catch (firstError) {
      if (format === "gif" || format === "webm") throw firstError;
      if (format === "h265") {
        console.warn("H.265 falló, reintento ultrafast:", firstError);
        reportFfmpegProgress(85, "Reintentando H.265 en modo rapido…");
        try { ffmpeg.FS("unlink", outputName); } catch {}
        try {
          await run(buildMp4ArgList(inputName, outputName, jobSettings, true), "Codificando H.265 (rapido)…");
        } catch {
          throw new Error(
            "H.265 no está disponible en el conversor local de este navegador. Use MP4 H.264."
          );
        }
      } else {
        console.warn("Reintento MP4:", firstError);
        reportFfmpegProgress(85, "Reintentando MP4 (modo estable)…");
        try { ffmpeg.FS("unlink", outputName); } catch {}
        outputName = `out_${jobId}.mp4`;
        try {
          await run(buildMp4ArgList(inputName, outputName, jobSettings, true), "Codificando .mp4 (rapido)…");
        } catch (secondError) {
          console.warn("Reintento MP4 sin audio:", secondError);
          reportFfmpegProgress(86, "Reintentando MP4 sin pista de audio…");
          try { ffmpeg.FS("unlink", outputName); } catch {}
          await run(
            buildMp4ArgListVideoOnly(inputName, outputName, jobSettings, true),
            "Codificando .mp4 (solo video)…"
          );
        }
      }
    }

    const data = ffmpeg.FS("readFile", outputName);
    const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
    if (!u8.length) throw new Error("Salida de conversión vacía");
    if ((format === "mp4" || format === "h265" || format === "mov") && !looksLikeMp4Bytes(u8)) {
      throw new Error("El archivo convertido no es un MP4 válido");
    }

    try { ffmpeg.FS("unlink", inputName); } catch {}
    try { ffmpeg.FS("unlink", outputName); } catch {}

    const ext = outputName.split(".").pop();
    return {
      blob: ffmpegDataToBlob(u8, mimeForExportExtension(ext)),
      extension: ext
    };
  });
}

function guessFfmpegInputExt(blobOrFile) {
  const name = (blobOrFile?.name || "").toLowerCase();
  const type = (blobOrFile?.type || "").toLowerCase();
  if (name.endsWith(".mov") || type.includes("quicktime")) return "mov";
  if (name.endsWith(".mkv")) return "mkv";
  if (name.endsWith(".avi")) return "avi";
  if (name.endsWith(".m4v")) return "m4v";
  if (name.endsWith(".mp4") || type.includes("mp4")) return "mp4";
  if (name.endsWith(".webm") || type.includes("webm")) return "webm";
  if (type.includes("mp4")) return "mp4";
  return "webm";
}

function downloadBlob(blob, filename) {
  if (window.__E2E_LAST_EXPORT__) {
    window.__E2E_LAST_EXPORT__.blob = blob;
    window.__E2E_LAST_EXPORT__.filename = filename;
    window.__E2E_LAST_EXPORT__.size = blob.size;
    window.__E2E_LAST_EXPORT__.type = blob.type;
  }
  if (new URLSearchParams(location.search).get("e2e") === "1") {
    /* En E2E no disparamos descarga real */
    const link = ui.downloadLink || document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.hidden = false;
    link.textContent = `Descargar ${filename}`;
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = ui.downloadLink || document.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = false;
  link.textContent = `Descargar ${filename}`;
  if (!ui.downloadLink) {
    link.click();
  } else {
    link.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function syncExportAudioTracksFast(audioEntries) {
  if (!audioEntries?.length) return;
  for (const { clip, el } of audioEntries) {
    if (!el || !el.play) continue;
    const local = state.currentTime - clip.start;
    if (local >= 0 && local < clip.duration) {
      const target = Math.max(0, (clip.sourceStart || 0) + local);
      if (Math.abs((el.currentTime || 0) - target) > 0.45) {
        try { el.currentTime = target; } catch {}
      }
      const gain = clipAudioGain(clip, 1);
      el.muted = gain <= 0.001;
      try { el.volume = gain; } catch {}
      if (el.paused) el.play().catch(() => {});
    } else if (!el.paused) {
      el.pause();
    }
  }
}

async function prepareExportAudioEntries() {
  const entries = [];
  for (const clip of state.clips) {
    if (clip.type !== "audio") continue;
    try {
      const el = await getExportMediaElement(clip);
      if (el) entries.push({ clip, el });
    } catch {
      /* ignore */
    }
  }
  return entries;
}

function preloadUpcomingTransition() {
  /* Durante export: prearmar transición con más frecuencia cerca del corte */
  if (state.exporting) {
    const now = performance.now();
    const upcoming = exportClipIndex?.transitions
      ?.filter((clip) => clip.start > state.currentTime && clip.start - state.currentTime < 2.2)
      ?.sort((a, b) => a.start - b.start)[0];
    const near = upcoming && upcoming.start - state.currentTime < 0.8;
    const gap = near ? 80 : 160;
    if (now - lastExportPreloadAt < gap) {
      /* Aun así intentar prearm ligero cada frame cerca del corte */
      if (near) prearmUpcomingExportTransition(state.currentTime);
      return;
    }
    lastExportPreloadAt = now;
    prearmUpcomingExportTransition(state.currentTime);
    return;
  }

  const upcoming = state.clips
    .filter((clip) => clip.type === "transition" && clip.start > state.currentTime && clip.start - state.currentTime < 1.5)
    .sort((a, b) => a.start - b.start)[0];
  if (!upcoming) return;

  const toClip = upcoming.toClipId
    ? state.clips.find((clip) => clip.id === upcoming.toClipId)
    : null;
  if (!toClip) return;

  const media = mediaById(toClip.mediaId);
  if (!media) return;

  if (toClip.type === "video") {
    if (ui.videoSecondary.dataset.mediaId === media.id) return;
    if (ui.videoSecondary.style.display === "block") return;
    ui.videoSecondary.src = media.url;
    ui.videoSecondary.load();
    ui.videoSecondary.dataset.mediaId = media.id;
  } else if (toClip.type === "image") {
    if (ui.imageSecondary.dataset.mediaId === media.id) return;
    if (ui.imageSecondary.style.display === "block") return;
    ui.imageSecondary.src = media.url;
    ui.imageSecondary.dataset.mediaId = media.id;
  }
}

async function warmTransitionMedia() {
  /* Precarga la primera transición para el arranque limpio */
  const first = state.clips
    .filter((clip) => clip.type === "transition")
    .sort((a, b) => a.start - b.start)[0];
  if (!first) return;

  const toClip = first.toClipId
    ? state.clips.find((clip) => clip.id === first.toClipId)
    : null;
  if (!toClip) return;
  const media = mediaById(toClip.mediaId);
  if (!media) return;

  try {
    if (toClip.type === "video") {
      if (ui.videoSecondary.dataset.mediaId === media.id && ui.videoSecondary.readyState >= 2) return;
      ui.videoSecondary.src = media.url;
      ui.videoSecondary.load();
      ui.videoSecondary.dataset.mediaId = media.id;
      await new Promise((resolve) => {
        if (ui.videoSecondary.readyState >= 2) return resolve();
        const done = () => {
          ui.videoSecondary.removeEventListener("loadeddata", done);
          resolve();
        };
        ui.videoSecondary.addEventListener("loadeddata", done);
        setTimeout(resolve, 1500);
      });
      ui.videoSecondary.pause();
      ui.videoSecondary.style.display = "none";
    } else if (toClip.type === "image") {
      ui.imageSecondary.src = media.url;
      ui.imageSecondary.dataset.mediaId = media.id;
      ui.imageSecondary.style.display = "none";
    }
  } catch {
    /* ignore */
  }
}

function exportSceneKey() {
  const transition = activeClip("transition");
  if (transition) {
    return `tr:${transition.id}:${transition.fromClipId || ""}:${transition.toClipId || ""}`;
  }
  const video = activeClip("video");
  const image = activeClip("image");
  const text = activeClip("text");
  return `sc:${video?.id || ""}:${image?.id || ""}:${text?.id || ""}`;
}

/** Actualización ligera del monitor durante export (solo feedback; no alimenta la grabación) */
function lightRefreshExportVisuals() {
  const transition = activeClip("transition");
  if (transition) return;

  const videoClip = activeClip("video");
  if (videoClip && ui.video.style.display === "block") {
    ui.video.style.opacity = String(videoClip.opacity ?? 1);
    ui.video.style.filter = visualFilter(videoClip);
    ui.video.style.transform = visualTransform(videoClip);
  }

  const imageClip = activeClip("image");
  if (imageClip && ui.image.style.display === "block") {
    ui.image.style.opacity = String(imageClip.opacity ?? 1);
    ui.image.style.filter = visualFilter(imageClip);
    ui.image.style.transform = visualTransform(imageClip);
  }

  const textClip = activeClip("text");
  if (textClip) showTextClip(textClip);
  else ui.text.style.display = "none";
}

/**
 * Transición completa para exportación: asegura ambas capas visibles + efecto real.
 * La ruta ligera solo aplicaba opacity sin garantizar el clip de entrada → se veía como corte.
 */
async function renderExportTransition(transition) {
  const fromClip = transition.fromClipId
    ? state.clips.find((clip) => clip.id === transition.fromClipId)
    : null;
  const toClip = transition.toClipId
    ? state.clips.find((clip) => clip.id === transition.toClipId)
    : null;

  if (!fromClip && !toClip) {
    clearTransitionVisuals();
    return false;
  }

  document.querySelector(".program-monitor")?.classList.add("transitioning");

  /* Cargar / mostrar ambos lados (mismo motor que la previsualización) */
  if (fromClip) {
    if (fromClip.type === "video") {
      await ensureMediaOnElement(fromClip, ui.video, "primary");
      ui.image.style.display = "none";
      ui.video.style.display = "block";
    } else {
      ui.video.pause();
      ui.video.style.display = "none";
      await ensureMediaOnElement(fromClip, ui.image, "primary");
      ui.image.style.display = "block";
    }
  } else {
    ui.video.pause();
    ui.video.style.display = "none";
    ui.image.style.display = "none";
  }

  if (toClip) {
    if (toClip.type === "video") {
      await ensureMediaOnElement(toClip, ui.videoSecondary, "secondary");
      ui.imageSecondary.style.display = "none";
      ui.videoSecondary.style.display = "block";
    } else {
      ui.videoSecondary.pause();
      ui.videoSecondary.style.display = "none";
      await ensureMediaOnElement(toClip, ui.imageSecondary, "secondary");
      ui.imageSecondary.style.display = "block";
    }
  } else {
    ui.videoSecondary.pause();
    ui.videoSecondary.style.display = "none";
    ui.imageSecondary.style.display = "none";
  }

  const raw = (state.currentTime - transition.start) / Math.max(0.001, transition.duration);
  const progress = easeProgress(Math.min(1, Math.max(0, raw)), transition.easing || "linear");

  applyTransitionEffect(
    transition.transitionType || "dissolve",
    progress,
    transition.intensity ?? 1,
    transition.direction || "left"
  );

  /* Mantener capas vivas para que drawImage tenga fotograma (no listo = solo se ve un lado = “corte”) */
  if (fromClip?.type === "video" && ui.video.style.display === "block") {
    softSeekClipToElement(fromClip, ui.video, 1.2);
    if (ui.video.paused) ui.video.play().catch(() => {});
    cacheMonitorVideoFrame(ui.video);
  }
  if (toClip?.type === "video" && ui.videoSecondary.style.display === "block") {
    softSeekClipToElement(toClip, ui.videoSecondary, 1.2);
    if (ui.videoSecondary.paused) ui.videoSecondary.play().catch(() => {});
    cacheMonitorVideoFrame(ui.videoSecondary);
  }

  if (fromClip?.type === "video") applyClipAudioToElement(fromClip, ui.video, 1 - progress);
  else applyClipAudioToElement(null, ui.video, 0);
  if (toClip?.type === "video") applyClipAudioToElement(toClip, ui.videoSecondary, progress);
  else applyClipAudioToElement(null, ui.videoSecondary, 0);

  lastPreviewHadTransition = true;
  return true;
}

function softSeekClipToElement(clip, element, tolerance = 0.4) {
  if (!clip || clip.type !== "video" || !element) return;
  const local = Math.min(Math.max(state.currentTime - clip.start, 0), Math.max(0, clip.duration - 0.01));
  const target = Math.max(0, (clip.sourceStart || 0) + local);
  const skew = Math.abs((element.currentTime || 0) - target);
  /* Si está en play y alineado, no tocar; evita seeks que dejan el frame en negro */
  if (!element.paused && skew < tolerance) return;
  if (element.paused && skew < 0.04) return;
  try {
    element.currentTime = Math.min(target, Math.max(0, (element.duration || target) - 0.01));
  } catch {}
}

/** Mantiene los <video> avanzando con el reloj de exportación (evita imagen fija) */
function syncExportVideoClock() {
  const transition = activeClip("transition");
  if (transition) {
    /* En transición el seek lo hace renderExportTransition (más suave) */
    return;
  }

  const videoClip = activeClip("video");
  if (videoClip && ui.video.style.display === "block") {
    softSeekClipToElement(videoClip, ui.video, 0.45);
    if (ui.video.paused) ui.video.play().catch(() => {});
  }
}

/**
 * getFrameAtTime — captura determinista sin congelar / temblar.
 *
 * Causa principal de “paralizaciones” en export:
 * al pausar con overshoot (>1 frame), varios fotogramas CFR reutilizaban el mismo
 * mediaTime → freeze visible aunque el preview (reloj continuo) se veía fluido.
 *
 * Reglas:
 * - Avance = play + RVFC; pause inmediato al cruzar target (mínimo overshoot).
 * - Overshoot aceptable ≤ 0.55·frameDur; nunca reutilizar el mismo mediaTime si el
 *   sourceTime debía avanzar ≥ 0.8·frameDur.
 * - Seek solo rewind / salto largo; tras seek, catch-up por play.
 */
async function seekAndWaitForFrame(element, targetTime) {
  if (!element || element.tagName === "IMG") return true;
  if (!element.isConnected && element.tagName === "VIDEO") {
    try { ensureExportMediaHost().appendChild(element); } catch { /* ignore */ }
  }
  const duration = Number.isFinite(element.duration) ? element.duration : targetTime + 1;
  const target = Math.max(0, Math.min(targetTime, Math.max(0, duration - 0.02)));
  const token = (element._seekToken = (element._seekToken || 0) + 1);
  const profile = window.__EXPORT_PROFILE__;
  const exportFps = Math.max(1, Number(state.exportFps) || 30);
  const frameDur = 1 / exportFps;
  const closeTol = Math.min(0.012, 0.4 * frameDur);
  const maxOvershoot = frameDur * 0.55;
  const nearMediaEnd = target >= duration - frameDur * 1.5;
  const prevPainted = element._exportLastMedia;
  let now = Number(element.currentTime) || 0;
  let ahead = target - now;

  const waitRvfc = (timeoutMs = 200) => new Promise((resolve) => {
    let settled = false;
    const finish = (meta) => {
      if (settled) return;
      settled = true;
      resolve(meta || null);
    };
    if (typeof element.requestVideoFrameCallback === "function") {
      try {
        const id = element.requestVideoFrameCallback((_n, meta) => finish(meta));
        setTimeout(() => {
          try { element.cancelVideoFrameCallback?.(id); } catch { /* ignore */ }
          finish(null);
        }, timeoutMs);
        return;
      } catch { /* fallthrough */ }
    }
    setTimeout(() => finish(null), Math.min(timeoutMs, 40));
  });

  const mediaClock = (meta) => {
    if (meta && Number.isFinite(meta.mediaTime)) return meta.mediaTime;
    return Number(element.currentTime) || 0;
  };

  const markReady = (mediaT, { forceOk = false } = {}) => {
    const ok = forceOk || Math.abs(mediaT - target) <= Math.max(closeTol * 2, frameDur * 1.15);
    element._exportSourceTime = ok ? target : mediaT;
    element._exportLastMedia = mediaT;
    element._exportFrameOk = ok;
    if (ok && element.videoWidth) cacheExportVideoFrame(element.dataset.clipId || "", element);
    return ok;
  };

  /**
   * True si pintar mediaT repetiría el fotograma ya exportado mientras el target avanzó.
   * Al final del media el hold del último frame es correcto (no forzar avance).
   */
  const wouldDuplicate = (mediaT) => {
    if (nearMediaEnd) return false;
    if (prevPainted == null || Math.abs(mediaT - prevPainted) >= 0.00045) return false;
    const lastTarget = Number(element._exportSourceTime);
    if (Number.isFinite(lastTarget) && target > lastTarget + 1e-4) return true;
    return target > prevPainted + frameDur * 0.45;
  };

  const hardSeek = async (t) => {
    try { element.pause(); } catch { /* ignore */ }
    await new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done || element._seekToken !== token) return;
        done = true;
        element.removeEventListener("seeked", finish);
        element.removeEventListener("loadeddata", finish);
        resolve();
      };
      element.addEventListener("seeked", finish);
      element.addEventListener("loadeddata", finish);
      try { element.currentTime = Math.max(0, Math.min(t, duration - 0.02)); } catch { finish(); return; }
      setTimeout(finish, 1000);
    });
    const meta = await waitRvfc(220);
    return mediaClock(meta);
  };

  /** Avance por reproducción hasta target; pausa en el RVFC que cruza (anti-overshoot). */
  const playForwardToTarget = async (fromMedia, budgetMs) => {
    try {
      element.muted = true;
      element.playbackRate = 1;
      if (element.paused) {
        const p = element.play();
        if (p && typeof p.then === "function") await p.catch(() => {});
      }
    } catch { /* ignore */ }

    const deadline = performance.now() + budgetMs;
    let lastMedia = fromMedia;
    let stallTicks = 0;
    while (element._seekToken === token && performance.now() < deadline) {
      const meta = await waitRvfc(120);
      const mediaT = mediaClock(meta);
      if (mediaT + closeTol >= target) {
        try { element.pause(); } catch { /* ignore */ }
        /* Exigir frame NUEVO si el target avanzó (anti-temblor por frame repetido) */
        if (wouldDuplicate(mediaT)) {
          stallTicks += 1;
          if (stallTicks > 12) break;
          try {
            element.muted = true;
            const p = element.play();
            if (p && p.catch) p.catch(() => {});
          } catch { /* ignore */ }
          continue;
        }
        /* Si venimos de prevPainted, exigir avance mínimo ~½ frame de export */
        if (
          prevPainted != null
          && mediaT + 1e-4 < prevPainted + frameDur * 0.45
          && target > prevPainted + frameDur * 0.4
        ) {
          try {
            const p = element.play();
            if (p && p.catch) p.catch(() => {});
          } catch { /* ignore */ }
          continue;
        }
        if (profile) profile.sequentialAdvances = (profile.sequentialAdvances || 0) + 1;
        markReady(mediaT);
        return true;
      }
      if (Math.abs(mediaT - lastMedia) < 0.0003) {
        stallTicks += 1;
        if (stallTicks === 2 || stallTicks === 5 || stallTicks === 10 || stallTicks === 18) {
          try {
            const p = element.play();
            if (p && p.catch) p.catch(() => {});
          } catch { /* ignore */ }
        }
        if (stallTicks > 40) break;
      } else {
        stallTicks = 0;
        lastMedia = mediaT;
      }
    }
    try { element.pause(); } catch { /* ignore */ }
    return false;
  };

  /* Exacto o casi: sin reutilizar frame previo si el target avanzó */
  if (Math.abs(now - target) <= closeTol && element.readyState >= 2 && !element.seeking) {
    if (!wouldDuplicate(now)) {
      try { element.pause(); } catch { /* ignore */ }
      markReady(now);
      return true;
    }
    /* Mismo mediaTime que el frame exportado anterior → forzar avance */
    ahead = Math.max(frameDur, closeTol * 2);
  }

  /*
   * Overshoot estrecho: solo ≤0.55 frame. Antes se aceptaba hasta 2.5 frames
   * y varios ticks CFR pintaban el mismo fotograma (temblor / paralización).
   */
  if (ahead < -closeTol && ahead >= -maxOvershoot && element.readyState >= 2) {
    if (!wouldDuplicate(now)) {
      try { element.pause(); } catch { /* ignore */ }
      markReady(now, { forceOk: true });
      if (profile) profile.overshootAccepted = (profile.overshootAccepted || 0) + 1;
      return true;
    }
  }

  /* Pasados de más pero sin poder rebobinar barato: avanzar hasta un frame NUEVO ≥ target */
  if (ahead < -maxOvershoot && ahead > -frameDur * 4 && element.readyState >= 2) {
    if (profile) profile.overshootCatchup = (profile.overshootCatchup || 0) + 1;
    const ok = await playForwardToTarget(now, Math.min(4000, 400 + Math.abs(ahead) * 8000));
    if (ok && !wouldDuplicate(element._exportLastMedia)) return true;
  }

  /* Ventana larga: GOP de cámaras reales puede ser 2–5 s */
  const sequentialWindow = Math.max(6.5, frameDur * 180);
  now = Number(element.currentTime) || 0;
  ahead = target - now;
  if (ahead > closeTol && ahead <= sequentialWindow && element.readyState >= 2) {
    const ok = await playForwardToTarget(now, Math.min(20000, 500 + ahead * 4200));
    if (ok) return true;
    if (profile) profile.sequentialTimeouts = (profile.sequentialTimeouts || 0) + 1;
  }

  /* Seek + catch-up (rewind corto para aterrizar antes del target). */
  if (profile) profile.seeks = (profile.seeks || 0) + 1;
  let mediaT = await hardSeek(Math.max(0, target - Math.min(0.25, frameDur * 4)));
  if (element._seekToken !== token) return false;

  if (mediaT + closeTol < target) {
    let caught = await playForwardToTarget(mediaT, Math.min(16000, 500 + (target - mediaT) * 4200));
    if (caught) return true;

    mediaT = await hardSeek(Math.max(0, target - Math.min(1.0, sequentialWindow * 0.2)));
    if (element._seekToken !== token) return false;
    caught = await playForwardToTarget(mediaT, Math.min(18000, 600 + Math.max(0.2, target - mediaT) * 4200));
    if (caught) return true;
    if (profile) profile.seekCatchupFails = (profile.seekCatchupFails || 0) + 1;
  } else if (Math.abs(mediaT - target) <= Math.max(closeTol * 2, frameDur * 1.25) && !wouldDuplicate(mediaT)) {
    try { element.pause(); } catch { /* ignore */ }
    markReady(mediaT);
    return true;
  }

  try { element.pause(); } catch { /* ignore */ }
  now = Number(element.currentTime) || mediaT;
  const ok = markReady(now);
  if ((!ok || wouldDuplicate(now)) && profile) {
    profile.badFrameSnaps = (profile.badFrameSnaps || 0) + 1;
    element._exportFrameOk = false;
  }
  return element.readyState >= 2;
}

/** Alias del contrato getFrameAtTime(video, sourceTime) */
async function getFrameAtTime(element, sourceTime) {
  return seekAndWaitForFrame(element, sourceTime);
}

/**
 * Pausar solo videos que no se usarán en el próximo instante.
 */
function pauseExportVideosNotNeededAt(nextTimelineTime) {
  if (nextTimelineTime == null) return;
  const index = exportClipIndex;
  const transition = index
    ? activeFromList(index.transitions, nextTimelineTime)
    : activeClip("transition", nextTimelineTime);
  const keep = new Set();
  if (transition) {
    if (transition.fromClipId) keep.add("clip:" + transition.fromClipId);
    if (transition.toClipId) keep.add("clip:" + transition.toClipId);
  } else {
    const v = index ? activeFromList(index.videos, nextTimelineTime) : activeClip("video", nextTimelineTime);
    if (v) keep.add("clip:" + v.id);
  }
  for (const [key, el] of exportMediaCache) {
    if (!el || el.tagName !== "VIDEO") continue;
    if (keep.has(key)) continue;
    try { el.pause(); } catch {}
  }
}

/** Prepara fuentes de video/imagen en un instante de timeline (modo determinista). */
async function prepareDeterministicSourcesAt(time) {
  const index = exportClipIndex;
  const transition = index
    ? activeFromList(index.transitions, time)
    : activeClip("transition", time);
  const clips = [];

  if (transition) {
    if (transition.fromClipId) {
      const c = index?.byId.get(transition.fromClipId) || state.clips.find((x) => x.id === transition.fromClipId);
      if (c) clips.push(c);
    }
    if (transition.toClipId) {
      const c = index?.byId.get(transition.toClipId) || state.clips.find((x) => x.id === transition.toClipId);
      if (c) clips.push(c);
    }
    const skip = new Set([transition.fromClipId, transition.toClipId].filter(Boolean));
    for (const clip of (index?.images || state.clips.filter((c) => c.type === "image"))) {
      if (time >= clip.start && time < clip.start + clip.duration && !skip.has(clip.id)) clips.push(clip);
    }
  } else {
    const videoClip = index ? activeFromList(index.videos, time) : activeClip("video", time);
    const imageClip = index ? activeFromList(index.images, time) : activeClip("image", time);
    if (videoClip) clips.push(videoClip);
    if (imageClip) clips.push(imageClip);
  }

  /* Precalentar el “to” de la próxima transición (video frío → freezes al entrar) */
  const upcoming = upcomingExportTransition(time, 0.55);
  if (upcoming?.toClipId) {
    const toClip = index?.byId.get(upcoming.toClipId) || state.clips.find((x) => x.id === upcoming.toClipId);
    if (toClip && (toClip.type === "video" || toClip.type === "image") && !clips.some((c) => c.id === toClip.id)) {
      clips.push(toClip);
    }
  }

  const sampleFingerprint = (el) => {
    if (!el.videoWidth || el.readyState < 2) return null;
    const c = document.createElement("canvas");
    c.width = 24;
    c.height = 14;
    c.getContext("2d", { alpha: false }).drawImage(el, 0, 0, 24, 14);
    const data = c.getContext("2d").getImageData(0, 0, 24, 14).data;
    let fp = 2166136261;
    for (let i = 0; i < data.length; i += 12) {
      fp ^= data[i];
      fp = Math.imul(fp, 16777619);
    }
    return fp;
  };

  const prepareOne = async (clip, { prewarmOnly = false } = {}) => {
    if (clip.type !== "video" && clip.type !== "image") return;
    const el = await getExportMediaElement(clip);
    if (!el) return;
    if (el.tagName === "IMG") return; /* imagen ya cargada en getExportMediaElement */
    if (el.tagName !== "VIDEO") return;

    const seekTimeline = prewarmOnly && upcoming ? upcoming.start : time;
    const srcTime = clipLocalTime(clip, seekTimeline);
    const mediaDur = Number.isFinite(el.duration) ? el.duration : srcTime + 1;
    const nearMediaEnd = srcTime >= mediaDur - 0.05;
    const prevMedia = el._exportLastMedia;

    /* Salto grande (nuevo clip / reentrada): limpiar estado anti-duplicado */
    if (prevMedia != null && Math.abs(srcTime - prevMedia) > 0.75) {
      el._exportLastMedia = undefined;
      el._exportSourceTime = undefined;
      el._exportFingerprint = undefined;
    }

    await seekAndWaitForFrame(el, srcTime);
    if (prewarmOnly) {
      try { el.pause(); } catch { /* ignore */ }
      return;
    }

    const frameDur = 1 / Math.max(1, Number(state.exportFps) || 30);
    const decoded = el._exportLastMedia;
    const stuckTime = !nearMediaEnd
      && prevMedia != null
      && decoded != null
      && srcTime > prevMedia + frameDur * 0.75
      && Math.abs(decoded - prevMedia) < 0.0005;
    const stuckOk = !nearMediaEnd && el._exportFrameOk === false;

    if (stuckTime || stuckOk) {
      const profile = window.__EXPORT_PROFILE__;
      if (profile) profile.stuckRetries = (profile.stuckRetries || 0) + 1;
      /* Preferir play-forward: el rewind corto provoca temblor A-B-A (sobre todo al inicio) */
      try {
        el.muted = true;
        const p = el.play();
        if (p && p.catch) p.catch(() => {});
      } catch { /* ignore */ }
      await waitMs(35);
      await seekAndWaitForFrame(el, srcTime);
      const stillStuck = el._exportFrameOk === false
        || (el._exportLastMedia != null
          && prevMedia != null
          && Math.abs(el._exportLastMedia - prevMedia) < 0.0005
          && srcTime > prevMedia + frameDur * 0.75);
      if (stillStuck) {
        try {
          el.pause();
          el.currentTime = Math.max(0, srcTime - Math.min(0.1, frameDur * 2.5));
        } catch { /* ignore */ }
        await waitMs(25);
        await seekAndWaitForFrame(el, srcTime);
      }
    }

    /* Huella solo diagnóstico — NO rebobinar por fingerprint (falsos positivos = temblores) */
    if (el.videoWidth && (stuckTime || stuckOk || Math.round(srcTime * 30) % 6 === 0)) {
      try {
        const fp = sampleFingerprint(el);
        if (fp != null) el._exportFingerprint = fp;
      } catch { /* ignore */ }
    }
  };

  /*
   * En transición video↔video / video↔imagen: seek SECUENCIAL.
   * Promise.all con 2 decoders pelea CPU → temblores/parpadeos en el cruce.
   */
  const activeIds = new Set(
    (transition
      ? [transition.fromClipId, transition.toClipId]
      : clips.map((c) => c.id)
    ).filter(Boolean)
  );
  const primary = clips.filter((c) => activeIds.has(c.id) || !upcoming || c.id !== upcoming.toClipId);
  const prewarm = clips.filter((c) => upcoming && c.id === upcoming.toClipId && !activeIds.has(c.id));

  if (transition && primary.filter((c) => c.type === "video").length >= 1) {
    for (const clip of primary) await prepareOne(clip);
  } else {
    await Promise.all(primary.map((clip) => prepareOne(clip)));
  }
  for (const clip of prewarm) await prepareOne(clip, { prewarmOnly: true });
}

function exportDebugLog(frameIndex, timelineTime, extra = {}) {
  if (!state.exportDebug) return;
  const tr = exportClipIndex
    ? activeFromList(exportClipIndex.transitions, timelineTime)
    : activeClip("transition", timelineTime);
  const progress = tr
    ? Math.min(1, Math.max(0, (timelineTime - tr.start) / Math.max(0.001, tr.duration)))
    : null;
  const video = exportClipIndex
    ? activeFromList(exportClipIndex.videos, timelineTime)
    : activeClip("video", timelineTime);

  let sourceNote = "";
  if (tr) {
    const from = tr.fromClipId ? state.clips.find((c) => c.id === tr.fromClipId) : null;
    const to = tr.toClipId ? state.clips.find((c) => c.id === tr.toClipId) : null;
    const a = from ? clipLocalTime(from, timelineTime) : null;
    const b = to ? clipLocalTime(to, timelineTime) : null;
    sourceNote = ` | A=${a != null ? a.toFixed(3) : "-"} B=${b != null ? b.toFixed(3) : "-"} | crossfade=${progress?.toFixed(2)}`;
  } else if (video) {
    const el = peekExportMediaElement(video);
    const decoded = el?._exportLastMedia;
    sourceNote = ` | source=${clipLocalTime(video, timelineTime).toFixed(3)}`
      + (decoded != null ? ` | decodedPTS=${Number(decoded).toFixed(3)}` : "");
  }

  // eslint-disable-next-line no-console
  console.debug(
    `FRAME ${frameIndex} | timeline=${timelineTime.toFixed(3)}s`
    + ` | clip=${video?.name || (tr ? "A+B" : "-")}`
    + ` | transition=${tr ? (tr.transitionType || "dissolve") : "none"}`
    + sourceNote
    + ` | pts=${Math.round(timelineTime * 1e6)}us`
    + (extra.note ? ` | ${extra.note}` : "")
  );

  const profile = window.__EXPORT_PROFILE__;
  if (profile) {
    if (!profile.sourceLog) profile.sourceLog = [];
    const source = video ? clipLocalTime(video, timelineTime) : null;
    const decoded = video ? peekExportMediaElement(video)?._exportLastMedia : null;
    if (profile.sourceLog.length < 1200) {
      profile.sourceLog.push({
        frameIndex,
        timelineTime,
        source,
        decoded,
        transition: tr ? (tr.transitionType || "dissolve") : null,
        progress
      });
    }
    /* Detectar sourceTime/decoded estancado (síntoma de freeze) */
    if (source != null && decoded != null && !tr) {
      const prev = profile._lastDecoded;
      if (prev != null && Math.abs(decoded - prev) < 0.0005) {
        profile.stuckDecodedFrames = (profile.stuckDecodedFrames || 0) + 1;
      }
      profile._lastDecoded = decoded;
    } else {
      profile._lastDecoded = null;
    }
  }
}

/** Mezcla audio del timeline en WAV (misma base temporal del proyecto). */
async function mixExportAudioToWav(durationSec) {
  const Det = window.StudioExportDeterministic;
  if (!Det || typeof OfflineAudioContext === "undefined") return null;

  const sampleRate = 44100;
  const length = Math.max(1, Math.ceil(durationSec * sampleRate));
  let offline;
  try {
    offline = new OfflineAudioContext(2, length, sampleRate);
  } catch {
    return null;
  }

  const jobs = [];
  for (const clip of state.clips) {
    if (clip.type !== "audio" && clip.type !== "video") continue;
    if (clip.muted) continue;
    const vol = Number(clip.volume ?? (clip.type === "audio" ? 0.7 : 1));
    if (vol <= 0.001) continue;
    const media = mediaById(clip.mediaId);
    if (!media?.url) continue;

    jobs.push((async () => {
      try {
        const res = await fetch(media.url);
        const ab = await res.arrayBuffer();
        const audioBuf = await offline.decodeAudioData(ab.slice(0));
        const src = offline.createBufferSource();
        src.buffer = audioBuf;
        const gain = offline.createGain();
        const start = Math.max(0, clip.start);
        const fadeIn = Number(clip.fadeIn) || 0;
        const fadeOut = Number(clip.fadeOut) || 0;
        const end = start + Math.max(0.01, clip.duration);
        gain.gain.setValueAtTime(0.0001, 0);
        gain.gain.setValueAtTime(0.0001, start);
        if (fadeIn > 0) {
          gain.gain.linearRampToValueAtTime(vol, start + Math.min(fadeIn, clip.duration));
        } else {
          gain.gain.setValueAtTime(vol, start);
        }
        if (fadeOut > 0) {
          const fadeStart = Math.max(start, end - fadeOut);
          gain.gain.setValueAtTime(vol, fadeStart);
          gain.gain.linearRampToValueAtTime(0.0001, end);
        } else {
          gain.gain.setValueAtTime(vol, end);
          gain.gain.setValueAtTime(0.0001, end + 0.01);
        }
        src.connect(gain);
        gain.connect(offline.destination);
        const offset = Math.max(0, clip.sourceStart || 0);
        const playDur = Math.max(0.01, clip.duration);
        src.start(start, offset, playDur);
      } catch {
        /* clip sin audio decodable */
      }
    })());
  }

  await Promise.all(jobs);
  try {
    const rendered = await offline.startRendering();
    return Det.audioBufferToWav(rendered);
  } catch {
    return null;
  }
}

/**
 * Codifica secuencia JPEG/PNG → contenedor CFR con FFmpeg.wasm (timestamps monotónicos).
 */
async function encodeJpegSequenceWithFFmpeg(frameFiles, settings, audioWav, onProgress) {
  return withFFmpegQueue(async () => {
    let ffmpeg = await loadFFmpeg();
    const fps = Math.min(120, Math.max(1, settings.fps || 30));
    const Det = window.StudioExportDeterministic;
    const wantMp4 = settings.format === "mp4" || settings.format === "mov" || settings.format === "h265";
    const wantGif = settings.format === "gif";
    const videoBitrateK = wasmVideoBitrateK(settings);
    const audioK = Math.min(192, Math.round((settings.audioBitrate || 192000) / 1000));
    const jobTag = `exp_${Date.now().toString(36)}`;
    let outName = wantGif
      ? `${jobTag}.gif`
      : (wantMp4 ? `${jobTag}.${settings.format === "mov" ? "mov" : "mp4"}` : `${jobTag}.webm`);
    const frameExt = settings._frameExt === "png" ? "png" : "jpg";
    const inputPattern = `f%05d.${frameExt}`;

    const unlinkQuiet = (name) => {
      try {
        const ff = ffmpegInstance || ffmpeg;
        if (ff) ff.FS("unlink", name);
      } catch { /* ignore */ }
    };

    for (let i = 0; i < Math.max(frameFiles.length, 1) + 8; i++) {
      unlinkQuiet(`f${Det.pad(i, 5)}.jpg`);
      unlinkQuiet(`f${Det.pad(i, 5)}.png`);
    }
    ["audio.wav", outName].forEach(unlinkQuiet);

    const total = frameFiles.length;
    for (let i = 0; i < total; i++) {
      if (!state.exporting) throw new Error("Exportación cancelada.");
      const name = `f${Det.pad(i, 5)}.${frameExt}`;
      ffmpeg.FS("writeFile", name, frameFiles[i]);
      if (i % 20 === 0) onProgress?.(0.05 + (i / total) * 0.55, `Escribiendo fotogramas ${i + 1}/${total}…`);
    }
    for (let i = 0; i < frameFiles.length; i++) frameFiles[i] = null;
    frameFiles.length = 0;

    let hasAudio = false;
    if (audioWav && audioWav.length > 44) {
      ffmpeg.FS("writeFile", "audio.wav", audioWav);
      hasAudio = true;
    }

    onProgress?.(0.65, "Codificando CFR con FFmpeg (timestamps deterministas)…");

    const buildMp4Args = (name) => {
      const isHevc = settings.format === "h265";
      const codec = isHevc ? "libx265" : "libx264";
      const crf = exportEncodeCrf(settings);
      const a = [
        "-framerate", String(fps),
        "-i", inputPattern
      ];
      if (hasAudio) a.push("-i", "audio.wav");
      a.push(
        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p,setpts=PTS-STARTPTS",
        "-c:v", codec,
        "-preset", wasmX264Preset(settings),
        "-crf", String(crf),
        "-maxrate", `${videoBitrateK}k`,
        "-bufsize", `${videoBitrateK * 2}k`,
        "-pix_fmt", "yuv420p",
        "-r", String(fps),
        "-vsync", "cfr",
        "-g", String(Math.max(fps, Math.round(fps * 2))),
        "-bf", "0",
        "-sc_threshold", "0"
      );
      if (isHevc) a.push("-tag:v", "hvc1");
      if (hasAudio) {
        a.push("-c:a", "aac", "-b:a", `${audioK}k`, "-ac", "2", "-ar", "44100", "-shortest");
      } else {
        a.push("-an");
      }
      a.push("-movflags", "+faststart", "-threads", "1", "-y", name);
      return a;
    };

    const buildWebmArgs = (name, vp9) => {
      const a = [
        "-framerate", String(fps),
        "-i", inputPattern
      ];
      if (hasAudio) a.push("-i", "audio.wav");
      a.push(
        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p,setpts=PTS-STARTPTS",
        "-c:v", vp9 ? "libvpx-vp9" : "libvpx",
        "-b:v", `${videoBitrateK}k`,
        "-deadline", "good",
        "-cpu-used", settings.preset === "max" ? "2" : "5",
        "-r", String(fps),
        "-vsync", "cfr"
      );
      if (hasAudio) {
        a.push("-c:a", "libopus", "-b:a", `${audioK}k`, "-ac", "2", "-ar", "48000", "-shortest");
      } else {
        a.push("-an");
      }
      a.push("-threads", "1", "-y", name);
      return a;
    };

    const cleanupFrames = () => {
      for (let i = 0; i < total; i++) unlinkQuiet(`f${Det.pad(i, 5)}.jpg`);
      unlinkQuiet("audio.wav");
    };

    const readOut = async (name, ext, mime) => {
      const ff = await loadFFmpeg();
      const data = ff.FS("readFile", name);
      cleanupFrames();
      unlinkQuiet(name);
      return {
        blob: ffmpegDataToBlob(data, mime),
        extension: ext,
        mimeType: mime
      };
    };

    if (wantGif) {
      await ffmpegRun([
        "-framerate", String(fps),
        "-i", inputPattern,
        "-vf", `fps=${Math.min(15, fps)},scale=min(480\\,iw):-2:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
        "-loop", "0",
        "-y", outName
      ], "encode-gif");
      return readOut(outName, "gif", "image/gif");
    }

    if (wantMp4) {
      await ffmpegRun(buildMp4Args(outName), "encode-mp4-cfr");
      const ext = outName.split(".").pop();
      return readOut(outName, ext, mimeForExportExtension(ext));
    }

    /* WebM: un solo intento (VP8); si falla → MP4 (evita dobles reset que cuelgan WASM) */
    try {
      onProgress?.(0.7, "Codificando WebM…");
      await ffmpegRun(buildWebmArgs(outName, false), "encode-webm-vp8");
      return readOut(outName, "webm", "video/webm");
    } catch {
      onProgress?.(0.75, "WebM no disponible en este motor; exportando MP4 H.264 CFR…");
      outName = `${jobTag}.mp4`;
      await ffmpegRun(buildMp4Args(outName), "encode-mp4-fallback");
      return readOut(outName, "mp4", "video/mp4");
    }
  });
}

/** Mux Annex-B H.264 (WebCodecs) + WAV → MP4 sin reencode de video */
async function encodeAnnexBWithFFmpeg(annexB, settings, audioWav, onProgress) {
  return withFFmpegQueue(async () => {
    let ffmpeg = await loadFFmpeg();
    const fps = Math.min(120, Math.max(1, settings.fps || 30));
    const audioK = Math.min(192, Math.round((settings.audioBitrate || 192000) / 1000));
    const jobTag = `wc_${Date.now().toString(36)}`;
    const inName = `${jobTag}.h264`;
    const outName = `${jobTag}.mp4`;
    const unlinkQuiet = (name) => {
      try {
        const ff = ffmpegInstance || ffmpeg;
        if (ff) ff.FS("unlink", name);
      } catch { /* ignore */ }
    };
    unlinkQuiet(inName);
    unlinkQuiet("audio.wav");
    unlinkQuiet(outName);

    onProgress?.(0.2, "Escribiendo bitstream H.264 (WebCodecs)…");
    ffmpeg.FS("writeFile", inName, annexB);

    let hasAudio = false;
    if (audioWav && audioWav.length > 44) {
      ffmpeg.FS("writeFile", "audio.wav", audioWav);
      hasAudio = true;
    }

    onProgress?.(0.55, "Mux MP4 (copy video, sin reencode)…");
    const args = [
      "-f", "h264",
      "-r", String(fps),
      "-i", inName
    ];
    if (hasAudio) args.push("-i", "audio.wav");
    args.push(
      "-c:v", "copy",
      "-r", String(fps),
      "-vsync", "cfr"
    );
    if (hasAudio) {
      args.push("-c:a", "aac", "-b:a", `${audioK}k`, "-ac", "2", "-ar", "44100", "-shortest");
    } else {
      args.push("-an");
    }
    args.push("-movflags", "+faststart", "-y", outName);

    try {
      await ffmpegRun(args, "mux-webcodecs-h264");
    } catch {
      /* Algunos builds no necesitan bsf; reintentar sin él */
      const args2 = [
        "-f", "h264",
        "-framerate", String(fps),
        "-i", inName
      ];
      if (hasAudio) args2.push("-i", "audio.wav");
      args2.push("-c:v", "copy");
      if (hasAudio) {
        args2.push("-c:a", "aac", "-b:a", `${audioK}k`, "-ac", "2", "-ar", "44100", "-shortest");
      } else {
        args2.push("-an");
      }
      args2.push("-movflags", "+faststart", "-y", outName);
      await ffmpegRun(args2, "mux-webcodecs-h264-retry");
    }

    const data = ffmpeg.FS("readFile", outName);
    unlinkQuiet(inName);
    unlinkQuiet("audio.wav");
    unlinkQuiet(outName);
    onProgress?.(1, "Listo");
    return {
      blob: ffmpegDataToBlob(data, "video/mp4"),
      extension: "mp4",
      mimeType: "video/mp4"
    };
  });
}

/**
 * Exportación DETERMINISTA:
 * timelineTime = frameIndex / fps
 * Composición = drawExportFrame (misma lógica visual que el compositor de export)
 * Codificación = WebCodecs H.264 (rápido) o JPEG+FFmpeg CFR (fallback)
 */
async function recordTimeline(settings, onProgress) {
  const Det = window.StudioExportDeterministic;
  if (!Det) throw new Error("Módulo de exportación determinista no cargado.");

  const profile = {
    startedAt: performance.now(),
    seekMs: 0,
    seeks: 0,
    renderMs: 0,
    jpegMs: 0,
    encodeMs: 0,
    frames: 0,
    path: "jpeg+ffmpeg"
  };
  window.__EXPORT_PROFILE__ = profile;

  const recordCanvas = document.createElement("canvas");
  recordCanvas.width = settings.width - (settings.width % 2);
  recordCanvas.height = settings.height - (settings.height % 2);
  const ctx = recordCanvas.getContext("2d", { alpha: false, willReadFrequently: false })
    || recordCanvas.getContext("2d", { alpha: false });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = (settings.preset === "max" || settings.preset === "high") ? "high" : "medium";

  const duration = Math.max(0.1, projectDuration());
  const fps = Math.min(120, Math.max(1, settings.fps || 30));
  const totalFrames = Det.totalFrames(duration, fps);
  /* Máxima/alta: PNG (nítido). Resto: JPEG de alta calidad (antes 0.84/0.92 → borroso). */
  const usePngFrames = settings.preset === "max" || settings.preset === "high";
  settings._frameExt = usePngFrames ? "png" : "jpg";
  const jpegQuality = settings.preset === "small" ? 0.86 : 0.96;
  const wantMp4 = settings.format === "mp4" || settings.format === "mov" || settings.format === "h265";
  const videoBitrate = Math.max(800_000, (wasmVideoBitrateK(settings) || 4000) * 1000);

  const monitor = document.querySelector(".program-monitor");
  monitor?.classList.add("export-capture");
  ui.centerPlay.hidden = true;
  ui.textSelectionBox.hidden = true;
  if (ui.selectionOverlay) ui.selectionOverlay.hidden = true;

  const savedTime = state.currentTime;
  stopPlayback();
  state.exportDeterministic = true;
  state.exportFps = fps;
  state.exportDebug = Boolean(settings.debug || new URLSearchParams(location.search).get("exportdebug"));

  ui.video.muted = true;
  if (ui.videoSecondary) ui.videoSecondary.muted = true;
  if (ui.canvas) ui.canvas.hidden = true;

  /* Solape real A/B para disolvenias antes de indexar */
  ensureAllTransitionsOverlap();
  pruneExportMediaCache();
  lastArmedExportKeys = new Set();
  prearmedExportKeys = new Set();
  lastPrearmedTransitionId = null;
  exportClipIndex = buildExportClipIndex();
  lastExportPreloadAt = 0;

  setExportProgress(Math.max(ui.exportProgress?.value || 3, 3), "Precargando medios (exportación determinista CFR)…");
  await preloadExportMedia();

  for (const [, el] of exportMediaCache) {
    if (!el || el.tagName !== "VIDEO") continue;
    try { el.pause(); } catch { /* ignore */ }
    el.playsInline = true;
    try { el.playbackRate = 1; } catch { /* ignore */ }
  }

  /* Calentar decoder del primer vídeo (evita temblores al inicio del export) */
  setExportProgress(4, "Calentando decoder del primer clip…");
  {
    const firstVideo = exportClipIndex
      ? activeFromList(exportClipIndex.videos, 0) || exportClipIndex.videos[0]
      : activeClip("video", 0) || state.clips.find((c) => c.type === "video");
    if (firstVideo) {
      try {
        const el = await getExportMediaElement(firstVideo);
        await warmExportVideoDecoder(el, firstVideo);
      } catch { /* ignore warm failures */ }
    }
  }

  state.currentTime = 0;
  state.playing = false;
  await prepareDeterministicSourcesAt(0);
  drawExportFrame(ctx, recordCanvas.width, recordCanvas.height, 0);
  await waitMs(40);
  await prepareDeterministicSourcesAt(0);
  drawExportFrame(ctx, recordCanvas.width, recordCanvas.height, 0);
  /* Tras preroll, limpiar anti-duplicado para que frame 0 del encode empiece limpio */
  for (const [, el] of exportMediaCache) {
    if (!el || el.tagName !== "VIDEO") continue;
    el._exportLastMedia = undefined;
    el._exportSourceTime = undefined;
  }

  const renderOne = async (frameIndex) => {
    if (!state.exporting) throw new Error("Exportación cancelada.");
    const timelineTime = Math.min(
      Det.frameTime(frameIndex, fps),
      Math.max(0, duration - 1e-4)
    );
    state.currentTime = timelineTime;
    const tSeek0 = performance.now();
    await prepareDeterministicSourcesAt(timelineTime);
    profile.seekMs += performance.now() - tSeek0;
    const tDraw0 = performance.now();
    drawExportFrame(ctx, recordCanvas.width, recordCanvas.height, timelineTime);
    profile.renderMs += performance.now() - tDraw0;
    profile.frames += 1;
    exportDebugLog(frameIndex, timelineTime, {
      note: `ts=${Det.frameTimestampUs(frameIndex, fps)}us`
    });
    /* Mantener en play solo los clips del próximo fotograma (secuencial) */
    const nextT = Math.min(
      Det.frameTime(frameIndex + 1, fps),
      Math.max(0, duration - 1e-4)
    );
    pauseExportVideosNotNeededAt(nextT);
    if (frameIndex % 5 === 0 || frameIndex === totalFrames - 1) {
      onProgress?.(frameIndex / totalFrames, timelineTime);
      setExportProgress(
        5 + (frameIndex / totalFrames) * 55,
        `Render determinista ${frameIndex + 1}/${totalFrames} · ${timelineTime.toFixed(2)}s @ ${fps}fps`
      );
    }
    if (frameIndex % 8 === 0) await waitMs(0);
    return timelineTime;
  };

  try {
    /* Fast path: WebCodecs H.264 → mux copy (evita JPEG por frame) */
    if (wantMp4 && settings.format !== "h265" && typeof Det.encodeCanvasSequenceWebCodecs === "function") {
      setExportProgress(8, "Intentando ruta rápida WebCodecs…");
      let wc = null;
      try {
        wc = await Det.encodeCanvasSequenceWebCodecs({
          canvas: recordCanvas,
          totalFrames,
          fps,
          bitrate: videoBitrate,
          encodeNext: renderOne,
          onProgress: (ratio) => onProgress?.(ratio)
        });
      } catch (err) {
        profile.webcodecsSkip = String(err?.message || err);
        wc = null;
      }
      if (wc?.annexB?.length) {
        profile.path = "webcodecs+ffmpeg-copy";
        setExportProgress(62, "Mezclando audio…");
        let audioWav = null;
        try {
          audioWav = await Promise.race([
            mixExportAudioToWav(duration),
            waitMs(12000).then(() => null)
          ]);
        } catch {
          audioWav = null;
        }
        setExportProgress(70, "Mux MP4 (WebCodecs)…");
        const tEnc0 = performance.now();
        try {
          const encoded = await encodeAnnexBWithFFmpeg(
            wc.annexB,
            settings,
            audioWav,
            (ratio, msg) => setExportProgress(70 + ratio * 22, msg || "Mux…")
          );
          profile.encodeMs = performance.now() - tEnc0;
          profile.jpegMs = 0;
          profile.totalMs = performance.now() - profile.startedAt;
          window.__E2E_EXPORT_PROFILE__ = { ...profile };
          return encoded;
        } catch (muxErr) {
          profile.webcodecsSkip = `mux: ${muxErr?.message || muxErr}`;
          /* cae al fallback JPEG (re-render) */
        }
      } else if (!profile.webcodecsSkip) {
        profile.webcodecsSkip = "encoder-no-soportado-o-vacio";
      }
    }

    /* Fallback: secuencia de fotogramas + FFmpeg reencode */
    profile.path = usePngFrames ? "png+ffmpeg" : "jpeg+ffmpeg";
    const frameFiles = [];
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      await renderOne(frameIndex);
      const tJpg0 = performance.now();
      let bytes;
      if (usePngFrames && typeof Det.canvasToPngBytes === "function") {
        bytes = await Det.canvasToPngBytes(recordCanvas);
      } else {
        bytes = await (Det.canvasToJpegBytesFast || Det.canvasToJpegBytes)(recordCanvas, jpegQuality);
      }
      profile.jpegMs += performance.now() - tJpg0;
      frameFiles.push(bytes);
    }

    setExportProgress(62, "Mezclando audio (misma base temporal)…");
    let audioWav = null;
    try {
      audioWav = await Promise.race([
        mixExportAudioToWav(duration),
        waitMs(12000).then(() => null)
      ]);
    } catch {
      audioWav = null;
    }

    setExportProgress(68, "Codificando contenedor CFR…");
    const tEnc0 = performance.now();
    const encoded = await encodeJpegSequenceWithFFmpeg(
      frameFiles,
      settings,
      audioWav,
      (ratio, msg) => {
        setExportProgress(68 + ratio * 25, msg || "Codificando…");
      }
    );
    profile.encodeMs = performance.now() - tEnc0;
    profile.totalMs = performance.now() - profile.startedAt;
    window.__E2E_EXPORT_PROFILE__ = { ...profile };
    return encoded;
  } finally {
    state.exportDeterministic = false;
    state.exportFps = null;
    state.playing = false;
    exportClipIndex = null;
    ui.video.pause();
    if (ui.videoSecondary) ui.videoSecondary.pause();
    if (activeAudio) activeAudio.pause();
    for (const [, el] of exportMediaCache) {
      if (el && typeof el.pause === "function") el.pause();
    }
    lastArmedExportKeys = new Set();
    prearmedExportKeys = new Set();
    lastPrearmedTransitionId = null;
    monitor?.classList.remove("export-capture");
    restoreMonitorAudioRouting();
    ui.video.muted = false;
    if (ui.videoSecondary) ui.videoSecondary.muted = false;
    state.currentTime = savedTime;
    if (ui.canvas) ui.canvas.hidden = true;
    await renderPreview();
    syncAudio();
  }
}

async function exportOneJob(job) {
  const settings = exportSettingsFromUi(job);
  if (!projectDuration()) throw new Error("No hay contenido en la línea de tiempo.");

  const targetExt = extensionForExportFormat(settings.format);
  setExportProgress(2, `Preparando «${settings.name}.${targetExt}»…`);
  setExportProgress(
    4,
    `Render CFR ${settings.width}×${settings.height} @ ${settings.fps}fps · reloj frameIndex/${settings.fps}…`
  );
  const recorded = await recordTimeline(settings, (ratio) => {
    setExportProgress(5 + ratio * 55, `Render determinista ${Math.round(ratio * 100)}%…`);
  });

  let finalBlob = recorded.blob;
  let extension = recorded.extension;

  /*
   * El motor determinista ya entrega CFR (JPEG→FFmpeg).
   * Solo convertir si el contenedor/códec no coincide con lo pedido.
   */
  const needsConvert = settings.format === "gif"
    || settings.format === "h265"
    || settings.format === "mov"
    || (settings.format === "mp4" && recorded.extension !== "mp4")
    || (settings.format === "webm" && recorded.extension !== "webm" && recorded.extension !== "mp4");

  /* Si pedimos WebM y el motor solo pudo H.264, no reintentar convert (provocaba "one command at a time") */
  if (settings.format === "webm" && recorded.extension === "mp4") {
    setExportProgress(90, "WebM no disponible en FFmpeg.wasm local → MP4 H.264 CFR.");
  }

  if (needsConvert) {
    const mb = (recorded.blob.size / 1e6).toFixed(1);
    setExportProgress(
      82,
      `Ajustando a ${String(settings.format).toUpperCase()} (.${targetExt}) · ${mb} MB…`
    );
    try {
      const converted = await convertWithFFmpeg(recorded.blob, settings);
      finalBlob = converted.blob;
      extension = targetExt;
      if (finalBlob.type !== mimeForExportExtension(targetExt)) {
        finalBlob = new Blob([finalBlob], { type: mimeForExportExtension(targetExt) });
      }
    } catch (error) {
      if (settings.format === "gif") throw error;
      const wantsContainer = settings.format === "mp4"
        || settings.format === "mov"
        || settings.format === "h265";
      if (wantsContainer) {
        setExportProgress(0, `Error: no se pudo crear .${targetExt} (${error.message}). Pruebe WebM o baje a 720p/30fps.`);
        throw new Error(`No se pudo exportar .${targetExt}: ${error.message}`);
      }
      setExportProgress(
        90,
        `No se pudo convertir a .${targetExt} (${error.message}). Se descarga .${recorded.extension}.`
      );
      extension = recorded.extension;
      finalBlob = recorded.blob;
    }
  } else {
    extension = targetExt;
    if (finalBlob.type !== mimeForExportExtension(extension)) {
      finalBlob = new Blob([finalBlob], { type: mimeForExportExtension(extension) });
    }
  }

  const filename = `${settings.name}.${extension}`;
  downloadBlob(finalBlob, filename);
  setExportProgress(
    100,
    extension === targetExt
      ? `Listo: ${filename} · CFR ${settings.fps}fps · formato ${String(settings.format).toUpperCase()}`
      : `Listo: ${filename} (formato solicitado: .${targetExt}) · ${settings.fps}fps`
  );
  return filename;
}

async function processExportQueue() {
  if (state.exporting) {
    setExportProgress(ui.exportProgress?.value || 0, "Ya hay una exportación en curso.");
    return;
  }
  if (typeof convertState !== "undefined" && convertState.busy) {
    setExportProgress(0, "Espere: hay una conversión de archivo en curso.");
    return;
  }
  if (ffmpegExclusiveDepth > 0 || ffmpegActiveLabel) {
    setExportProgress(0, `FFmpeg ocupado («${ffmpegActiveLabel}»). Espere…`);
    return;
  }

  const pending = state.exportQueue.filter((item) => item.status === "Pendiente" || item.status === "Error");
  if (!pending.length) {
    setExportProgress(0, "Agregue al menos una tarea a la cola.");
    return;
  }

  const powerMode = resolveExportPowerMode();
  setExportProgress(1, `Exportando en esta laptop · modo ${powerMode} · potencia ${LOCAL_EXPORT_POWER.label}.`);

  state.exporting = true;
  stopPlayback("Exportando…");
  if ($("startQueueBtn")) $("startQueueBtn").disabled = true;
  if ($("addQueueBtn")) $("addQueueBtn").disabled = true;

  try {
    for (const job of pending) {
      job.status = "Renderizando";
      renderQueue();
      try {
        await exportOneJob(job);
        job.status = "Completado";
      } catch (error) {
        job.status = "Error";
        setExportProgress(0, `Error al exportar: ${error.message}`);
      } finally {
        /* Liberar instancia entre trabajos de la cola (evita flag "running" residual) */
        try { await resetFFmpegInstance(); } catch {}
      }
      renderQueue();
    }
  } finally {
    state.exporting = false;
    if ($("startQueueBtn")) $("startQueueBtn").disabled = false;
    if ($("addQueueBtn")) $("addQueueBtn").disabled = false;
    await renderAll();
  }
}

$("addQueueBtn").addEventListener("click", () => {
  if (!projectDuration()) {
    setExportProgress(0, "Agregue clips a la línea de tiempo antes de exportar.");
    return;
  }
  const fps = Math.min(120, Math.max(1, Math.round(Number($("exportFps").value) || 30)));
  $("exportFps").value = String(fps);
  state.exportQueue.push({
    id: uid(),
    name: $("exportFilename").value.trim() || "video-obra-final",
    format: $("exportFormat").value,
    resolution: $("exportResolution").value,
    fps,
    preset: $("exportPreset").value,
    bitrateMbps: Number($("exportBitrateMbps").value) || 0,
    audioKbps: Number($("exportAudioKbps").value) || 192,
    status: "Pendiente"
  });
  renderQueue();
  updateExportSettingsHint();
  const ext = extensionForExportFormat($("exportFormat").value);
  setExportProgress(0, `En cola: ${$("exportFilename").value.trim() || "video-obra-final"}.${ext} · ${fps} fps · ${$("exportResolution").value}. Pulse «Procesar cola».`);
});

$("startQueueBtn").addEventListener("click", () => {
  processExportQueue();
});

$("exportPowerMode")?.addEventListener("change", () => {
  if ($("exportPowerMode")) $("exportPowerMode").dataset.userTouched = "1";
  applyLocalExportRecommendations(true);
  setExportProgress(0, `Rendimiento local: ${resolveExportPowerMode()}. La conversión usa los recursos de esta laptop.`);
});

["exportResolution", "exportFps", "exportPreset", "exportBitrateMbps", "exportAudioKbps", "exportFormat"].forEach((id) => {
  $(id)?.addEventListener("input", updateExportSettingsHint);
  $(id)?.addEventListener("change", updateExportSettingsHint);
});

ui.video.addEventListener("error", () => {
  setStatus("El navegador no puede decodificar este video. Use MP4 H.264 o WebM.");
});
ui.video.addEventListener("ended", () => {
  if (!state.playing) return;
  const clip = activeClip("video");
  if (clip) state.currentTime = Math.min(projectDuration(), clip.start + clip.duration);
});

document.addEventListener("keydown", (event) => {
  if (event.code === "Space" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    if (!state.exporting) togglePlayback();
  }
  if (event.key === "Delete" && !state.exporting) $("deleteBtn").click();
});

window.addEventListener("beforeunload", () => objectUrls.forEach(URL.revokeObjectURL));

/* ---------- Pestaña Conversión (standalone, no toca timeline/export) ---------- */
const convertState = {
  file: null,
  meta: null,
  busy: false,
  objectUrl: null,
  resultUrl: null
};

function setConvertProgress(value, message, stateClass) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const bar = $("convertProgress");
  const fill = $("convertProgressFill");
  const pctEl = $("convertProgressPct");
  const track = $("convertProgressTrack");
  const panel = $("convertProgressPanel");
  const status = $("convertStatus");
  const label = $("convertProgressLabel");

  if (bar) bar.value = pct;
  if (fill) fill.style.width = `${pct}%`;
  if (pctEl) pctEl.textContent = `${pct}%`;
  if (track) track.setAttribute("aria-valuenow", String(pct));
  if (status && message) status.textContent = message;
  if (label) {
    if (pct <= 0 && !convertState.busy) label.textContent = "Progreso de conversión";
    else if (pct >= 100) label.textContent = "Conversión completada";
    else if (convertState.busy) label.textContent = "Convirtiendo…";
    else label.textContent = "Progreso de conversión";
  }
  if (panel) {
    panel.classList.remove("is-active", "is-done", "is-error");
    const mode = stateClass
      || (pct >= 100 ? "is-done" : (convertState.busy || pct > 0 ? "is-active" : ""));
    if (mode) panel.classList.add(mode);
  }
  if (message) setStatus(message);
}

/** Mapea el avance interno de FFmpeg (≈78–98) a un % más legible para el usuario */
function mapConvertDisplayProgress(value) {
  const v = Number(value) || 0;
  if (v <= 0) return 0;
  if (v >= 100) return 100;
  if (v < 20) return Math.max(2, Math.round(v));
  /* Carga motor / prep: 20–40 · Codificación: 40–96 · Cierre: 96–99 */
  if (v < 78) return Math.round(20 + (v / 78) * 20);
  if (v < 98) return Math.round(40 + ((v - 78) / 20) * 56);
  return Math.min(99, Math.round(96 + (v - 98) * 1.5));
}

function selectedConvertCodec() {
  return document.querySelector('input[name="convertCodec"]:checked')?.value === "h265" ? "h265" : "h264";
}

function syncConvertCodecCards() {
  document.querySelectorAll(".convert-codec-card").forEach((card) => {
    const input = card.querySelector('input[name="convertCodec"]');
    card.classList.toggle("active", Boolean(input?.checked));
  });
}

function updateConvertCapabilityUI() {
  const box = $("convertCapabilityBox");
  const h265Input = $("convertCodecH265");
  const h265Card = $("convertCodecH265Card");
  const h265Desc = $("convertCodecH265Desc");
  const mem = studioCapabilities.deviceMemoryGb
    ? `${studioCapabilities.deviceMemoryGb} GB (estimados)`
    : "no reportada";
  const sab = studioCapabilities.sharedArrayBuffer && studioCapabilities.crossOriginIsolated
    ? "disponible (posible multihilo)"
    : "no aislado → monohilo (GitHub Pages)";
  if (box) {
    box.textContent = [
      `Motor: ${studioCapabilities.ffmpegVersion}`,
      `Origen FFmpeg: ${studioCapabilities.ffmpegSource}`,
      `Modo: ${studioCapabilities.threadMode === "single" ? "monohilo (core-st)" : "multihilo"}`,
      `CPU lógica: ${studioCapabilities.hardwareConcurrency} · RAM: ${mem}`,
      `WebAssembly: ${studioCapabilities.wasm ? "sí" : "no"} · Workers: ${studioCapabilities.workers ? "sí" : "no"}`,
      `Canvas2D: ${studioCapabilities.canvas2d ? "sí" : "no"} · WebGL: ${studioCapabilities.webgl ? "sí" : "no"} · WebGL2: ${studioCapabilities.webgl2 ? "sí" : "no"} · WebGPU: ${studioCapabilities.webgpu ? "sí" : "no"}`,
      `WebCodecs: ${studioCapabilities.webCodecs ? "sí" : "no"} · H.264 play: ${studioCapabilities.codecH264 ? "sí" : "?"} · H.265 play: ${studioCapabilities.codecH265 ? "sí" : "no/desconocido"}`,
      `SharedArrayBuffer: ${sab}`,
      `Encoder H.264 (libx264): ${studioCapabilities.h264 ? "disponible" : "no"}`,
      `Encoder H.265 (libx265): ${studioCapabilities.h265 ? "disponible" : "no disponible en esta compilación"}`,
      "Privacidad: los archivos no se suben; se procesan en este dispositivo."
    ].join("\n");
  }
  if (h265Input && h265Card && h265Desc) {
    if (studioCapabilities.h265) {
      h265Input.disabled = false;
      h265Card.classList.remove("is-disabled");
      h265Desc.textContent = "Menor tamaño · HEVC real (libx265)";
    } else {
      h265Input.disabled = true;
      h265Input.checked = false;
      const h264 = document.querySelector('input[name="convertCodec"][value="h264"]');
      if (h264) h264.checked = true;
      h265Card.classList.add("is-disabled");
      h265Card.classList.remove("active");
      h265Desc.textContent = "No disponible: esta compilación FFmpeg.wasm no incluye libx265";
      syncConvertCodecCards();
    }
  }
}

async function probeFFmpegEncoders() {
  if (studioCapabilities.probed) {
    updateConvertCapabilityUI();
    return studioCapabilities;
  }
  updateConvertCapabilityUI();
  try {
    await withFFmpegQueue(async () => {
      const lines = [];
      const ffmpeg = await loadFFmpeg();
      if (typeof ffmpeg.setLogger === "function") {
        ffmpeg.setLogger(({ message }) => {
          if (message) lines.push(String(message));
        });
      }
      try {
        await ffmpegRun(["-hide_banner", "-encoders"], "probe-encoders");
      } catch (err) {
        console.warn("probe encoders:", err);
      }
      const text = lines.join("\n");
      const listedX264 = /^[\s]*V[^\n]*\blibx264\b/im.test(text) || /\blibx264\b/i.test(text);
      const listedX265 = /^[\s]*V[^\n]*\blibx265\b/im.test(text);
      studioCapabilities.h264 = listedX264 || true;
      studioCapabilities.h265 = false;

      if (listedX265) {
        const probeOut = `probe_out_${Date.now()}.mp4`;
        try {
          await ffmpegRun([
            "-hide_banner", "-y",
            "-f", "lavfi", "-i", "color=c=black:s=64x64:d=0.2",
            "-frames:v", "2",
            "-c:v", "libx265", "-pix_fmt", "yuv420p", "-tag:v", "hvc1",
            "-an",
            probeOut
          ], "probe-libx265");
          const ff = await loadFFmpeg();
          const data = ff.FS("readFile", probeOut);
          studioCapabilities.h265 = Boolean(data && data.length > 32);
          try { ff.FS("unlink", probeOut); } catch {}
        } catch (hevcErr) {
          studioCapabilities.h265 = false;
          console.info("[capacidades] libx265 no usable:", hevcErr?.message || hevcErr);
        }
      }

      studioCapabilities.ffmpegReady = true;
      studioCapabilities.probed = true;
      studioCapabilities.threadMode = "single";
      await resetFFmpegInstance();
    }, "probe-capabilities");
  } catch (error) {
    studioCapabilities.h264 = true;
    studioCapabilities.h265 = false;
    studioCapabilities.probed = true;
    console.warn("No se pudieron listar encoders:", error);
  }
  updateConvertCapabilityUI();
  return studioCapabilities;
}

function registerStudioServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const proto = window.location.protocol || "";
  if (proto !== "https:" && proto !== "http:") return;
  if (proto === "http:" && !/^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname || "")) return;
  const swUrl = new URL("service-worker.js", appBaseUrl()).href;
  navigator.serviceWorker.register(swUrl).catch((err) => {
    console.info("[PWA] Service Worker no registrado:", err?.message || err);
  });
}

function warnLowResourcesIfNeeded(file) {
  const sizeMb = (file?.size || 0) / 1e6;
  const mem = studioCapabilities.deviceMemoryGb;
  const tips = [];
  if (sizeMb >= 80) tips.push(`Archivo grande (${sizeMb.toFixed(0)} MB): la conversión puede ser lenta.`);
  if (mem && mem <= 4) tips.push("Laptop con poca RAM estimada: use 720p o calidad ligera.");
  if (studioCapabilities.hardwareConcurrency <= 2) tips.push("Pocos núcleos CPU: prefiera preset rápido / resolución menor.");
  if (!tips.length) return;
  setConvertProgress(0, tips.join(" "));
}

function formatBytes(n) {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function clearConvertResultLink() {
  const link = $("convertDownloadLink");
  if (convertState.resultUrl) {
    try { URL.revokeObjectURL(convertState.resultUrl); } catch {}
    convertState.resultUrl = null;
  }
  if (link) {
    link.hidden = true;
    link.removeAttribute("href");
  }
}

function clearConvertFile() {
  if (convertState.objectUrl) {
    try { URL.revokeObjectURL(convertState.objectUrl); } catch {}
  }
  convertState.file = null;
  convertState.meta = null;
  convertState.objectUrl = null;
  clearConvertResultLink();
  const input = $("convertFileInput");
  if (input) input.value = "";
  if ($("convertFileCard")) $("convertFileCard").hidden = true;
  if ($("convertFileName")) $("convertFileName").textContent = "—";
  if ($("convertFileInfo")) $("convertFileInfo").textContent = "Sin archivo";
  setConvertProgress(0, "Seleccione un video para comenzar.");
}

async function probeConvertVideo(file) {
  const url = URL.createObjectURL(file);
  convertState.objectUrl = url;
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.src = url;
  const meta = await new Promise((resolve) => {
    const done = (info) => {
      video.removeAttribute("src");
      try { video.load(); } catch {}
      resolve(info);
    };
    video.onloadedmetadata = () => {
      done({
        duration: Number.isFinite(video.duration) ? video.duration : null,
        width: video.videoWidth || null,
        height: video.videoHeight || null
      });
    };
    video.onerror = () => done({ duration: null, width: null, height: null });
    setTimeout(() => done({ duration: null, width: null, height: null }), 8000);
  });
  return meta;
}

async function setConvertFile(file) {
  if (!file) return;
  if (!String(file.type || "").startsWith("video/") && !/\.(mp4|webm|mov|mkv|avi|m4v|wmv|flv|ts|mts)$/i.test(file.name || "")) {
    setConvertProgress(0, "El archivo no parece un video válido.");
    return;
  }
  clearConvertResultLink();
  if (convertState.objectUrl) {
    try { URL.revokeObjectURL(convertState.objectUrl); } catch {}
    convertState.objectUrl = null;
  }
  convertState.file = file;
  setConvertProgress(0, "Leyendo metadatos…");
  const meta = await probeConvertVideo(file);
  convertState.meta = meta;
  const parts = [formatBytes(file.size)];
  if (meta.width && meta.height) parts.push(`${meta.width}×${meta.height}`);
  if (meta.duration) parts.push(`${meta.duration.toFixed(1)} s`);
  if ($("convertFileCard")) $("convertFileCard").hidden = false;
  if ($("convertFileName")) $("convertFileName").textContent = file.name;
  if ($("convertFileInfo")) $("convertFileInfo").textContent = parts.join(" · ");
  const base = (file.name || "video").replace(/\.[^.]+$/, "");
  if ($("convertFilename") && !$("convertFilename").value.trim()) {
    $("convertFilename").value = `${base}-mp4`;
  } else if ($("convertFilename")) {
    $("convertFilename").value = `${base}-mp4`;
  }
  setConvertProgress(0, "Listo para convertir. Elija códec y pulse Convertir.");
  warnLowResourcesIfNeeded(file);
}

function convertQualityToSettings(quality) {
  if (quality === "max") return { preset: "max", crf: 18, bitrate: 16_000_000 };
  if (quality === "high") return { preset: "high", crf: 20, bitrate: 12_000_000 };
  if (quality === "small") return { preset: "small", crf: 28, bitrate: 3_500_000 };
  return { preset: "balanced", crf: 23, bitrate: 8_000_000 };
}

async function startStandaloneConversion() {
  if (convertState.busy) return;
  if (state.exporting) {
    setConvertProgress(0, "Espere: hay una exportación del proyecto en curso.");
    return;
  }
  const file = convertState.file;
  if (!file) {
    setConvertProgress(0, "Seleccione un video primero.");
    return;
  }

  const codec = selectedConvertCodec();
  if (codec === "h265" && !studioCapabilities.h265) {
    setConvertProgress(0, "H.265 no está disponible: esta compilación no incluye libx265. Use MP4 H.264.", "is-error");
    return;
  }
  const quality = convertQualityToSettings($("convertQuality")?.value || "balanced");
  const resMode = $("convertResolution")?.value || "original";
  const fpsVal = Number($("convertFps")?.value || 0);
  const outBase = ($("convertFilename")?.value || "video-convertido").trim().replace(/[\\/:*?"<>|]+/g, "-") || "video-convertido";
  const widthHint = resMode === "original"
    ? (convertState.meta?.width || 1280)
    : Number(resMode);

  convertState.busy = true;
  clearConvertResultLink();
  if ($("convertStartBtn")) $("convertStartBtn").disabled = true;
  if ($("convertCancelBtn")) $("convertCancelBtn").hidden = false;

  activeProgressReporter = (value, message) => {
    setConvertProgress(mapConvertDisplayProgress(value), message, "is-active");
  };
  let usedCodec = codec;
  try {
    setConvertProgress(4, `Preparando ${codec === "h265" ? "H.265" : "H.264"}…`, "is-active");
    const runConvert = (format) => convertWithFFmpeg(file, {
      format,
      /* CFR fijo: FPS 0 = 30 (evita congelar WebM VFR del navegador) */
      fps: fpsVal > 0 ? fpsVal : 30,
      keepFps: false,
      width: widthHint,
      keepResolution: resMode === "original",
      forceScale: resMode === "original" ? null : Number(resMode),
      preset: quality.preset,
      crf: quality.crf,
      bitrate: quality.bitrate,
      audioBitrate: 192000,
      powerMode: "auto"
    });

    let result;
    try {
      result = await runConvert(codec === "h265" ? "h265" : "mp4");
    } catch (err) {
      if (codec === "h265") {
        throw new Error(
          `No se pudo generar H.265 real (${err.message || err}). No se cambiará la extensión ni se etiquetará H.264 como H.265.`
        );
      }
      throw err;
    }

    if (codec === "h265" && !studioCapabilities.h265) {
      throw new Error("H.265 no disponible en el motor.");
    }

    const filename = `${outBase}.mp4`;
    const url = URL.createObjectURL(result.blob);
    convertState.resultUrl = url;
    const link = $("convertDownloadLink");
    if (link) {
      link.href = url;
      link.download = filename;
      link.textContent = `Descargar ${filename} (${formatBytes(result.blob.size)})`;
      link.hidden = false;
    }
    downloadBlob(result.blob, filename);
    const codecLabel = usedCodec === "h265" ? "H.265" : "H.264";
    setConvertProgress(100, `Listo: ${filename} · ${formatBytes(result.blob.size)} · ${codecLabel}`, "is-done");
  } catch (error) {
    setConvertProgress(
      Math.max(0, Number($("convertProgress")?.value) || 0),
      `Error de conversión: ${error.message || error}`,
      "is-error"
    );
  } finally {
    activeProgressReporter = null;
    convertState.busy = false;
    if ($("convertStartBtn")) $("convertStartBtn").disabled = false;
    if ($("convertCancelBtn")) $("convertCancelBtn").hidden = true;
  }
}

(function wireConvertPanel() {
  const drop = $("convertDropzone");
  const input = $("convertFileInput");
  if (!drop || !input) return;

  const openPicker = () => {
    if (convertState.busy) return;
    input.click();
  };
  drop.addEventListener("click", openPicker);
  drop.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker();
    }
  });
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) setConvertFile(file);
  });

  ["dragenter", "dragover"].forEach((ev) => {
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.add("is-dragover");
    });
  });
  ["dragleave", "drop"].forEach((ev) => {
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.remove("is-dragover");
    });
  });
  drop.addEventListener("drop", (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) setConvertFile(file);
  });

  document.querySelectorAll('input[name="convertCodec"]').forEach((radio) => {
    radio.addEventListener("change", syncConvertCodecCards);
  });
  syncConvertCodecCards();

  $("convertClearBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (convertState.busy) return;
    clearConvertFile();
  });
  $("convertStartBtn")?.addEventListener("click", () => startStandaloneConversion());
  $("convertCancelBtn")?.addEventListener("click", () => {
    setConvertProgress($("convertProgress")?.value || 0, "La conversión en curso terminará el trabajo actual; espere un momento.");
  });

  updateConvertCapabilityUI();
  probeFFmpegEncoders().catch(() => updateConvertCapabilityUI());
})();

function updateEffectsPreviewOverlay() {
  const canvas = $("effectsPreviewCanvas");
  if (!canvas) return;
  const clip = activeClip("video") || activeClip("image");
  const need = clip
    && window.StudioEffects
    && window.StudioEffects.needsPixelPass(clip)
    && !state.effectsCompare
    && !state.exporting;
  if (!need) {
    canvas.hidden = true;
    canvas.style.display = "none";
    return;
  }
  const monitor = document.querySelector(".program-monitor");
  const w = 640;
  const h = 360;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  /* Captura aproximada del frame visible (video/img primario) */
  const src = (ui.video.style.display !== "none" && ui.video.readyState >= 2)
    ? ui.video
    : (ui.image.style.display !== "none" ? ui.image : null);
  if (!src) {
    canvas.hidden = true;
    return;
  }
  try {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const sw = src.videoWidth || src.naturalWidth || w;
    const sh = src.videoHeight || src.naturalHeight || h;
    const fit = Math.min(w / sw, h / sh);
    const tw = sw * fit;
    const th = sh * fit;
    ctx.drawImage(src, (w - tw) / 2, (h - th) / 2, tw, th);
    window.StudioEffects.applyPixelEffects(ctx, w, h, clip, state.currentTime);
    canvas.hidden = false;
    canvas.style.display = "block";
  } catch {
    canvas.hidden = true;
  }
}

async function insertFreezeAtPlayhead(durationSec) {
  const clip = selectedClip();
  if (!clip || clip.type !== "video") {
    setStatus("Seleccione un clip de video para congelar el fotograma.");
    return;
  }
  const t = state.currentTime;
  if (t <= clip.start + 0.05 || t >= clip.start + clip.duration - 0.05) {
    setStatus("Coloque el cabezal dentro del clip (no en los extremos).");
    return;
  }
  const media = mediaById(clip.mediaId);
  if (!media) return;
  const freezeDur = Math.max(0.2, Number(durationSec) || 2);
  const elapsed = t - clip.start;
  const sourceTime = clipLocalTime(clip, t);

  /* Capturar frame */
  const video = document.createElement("video");
  video.src = media.url;
  video.muted = true;
  await new Promise((resolve, reject) => {
    video.onloadeddata = resolve;
    video.onerror = reject;
    setTimeout(resolve, 3000);
  });
  try { video.currentTime = sourceTime; } catch {}
  await new Promise((resolve) => {
    video.onseeked = resolve;
    setTimeout(resolve, 800);
  });
  const c = document.createElement("canvas");
  c.width = video.videoWidth || 1280;
  c.height = video.videoHeight || 720;
  c.getContext("2d").drawImage(video, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, "image/png"));
  const url = URL.createObjectURL(blob);
  objectUrls.push(url);
  const freezeMedia = {
    id: uid(),
    type: "image",
    name: `Freeze ${formatTime(sourceTime)}`,
    url,
    duration: freezeDur,
    file: null
  };
  state.media.push(freezeMedia);

  const right = {
    ...clip,
    id: uid(),
    start: t + freezeDur,
    duration: clip.duration - elapsed,
    sourceStart: (clip.sourceStart || 0) + elapsed * (clip.speed?.rate || 1),
    effects: clip.effects ? clip.effects.map((e) => ({ ...e, params: { ...e.params } })) : [],
    speed: clip.speed ? { ...clip.speed, ramp: clip.speed.ramp ? clip.speed.ramp.map((p) => ({ ...p })) : null } : undefined
  };
  clip.duration = elapsed;

  const freezeClip = {
    id: uid(),
    mediaId: freezeMedia.id,
    type: "image",
    track: "V2",
    name: freezeMedia.name,
    start: t,
    duration: freezeDur,
    sourceStart: 0,
    x: clip.x || 0,
    y: clip.y || 0,
    scale: clip.scale || 1,
    rotation: clip.rotation || 0,
    opacity: 1,
    brightness: 1,
    contrast: 1,
    saturation: 1,
    temperature: 0,
    volume: 1,
    muted: true,
    fadeIn: 0,
    fadeOut: 0,
    effects: [],
    freezeFrame: true,
    freezeSourceTime: sourceTime,
    speed: { rate: 1, reverse: false, keepPitch: true, muteAudio: true, ramp: null }
  };

  /* Empujar clips posteriores en la misma pista de video */
  state.clips.forEach((c) => {
    if (c.id === clip.id || c.id === right.id) return;
    if (c.track === clip.track && c.start >= t) c.start += freezeDur;
  });

  state.clips.push(freezeClip);
  state.clips.push(right);
  state.selectedId = freezeClip.id;
  await renderAll();
  setStatus(`Fotograma congelado insertado (${freezeDur.toFixed(1)} s).`);
}

async function exportPlayheadFramePng() {
  const clip = activeClip("video") || selectedClip();
  if (!clip || clip.type !== "video") {
    setStatus("No hay video en el cabezal para exportar.");
    return;
  }
  const media = mediaById(clip.mediaId);
  if (!media) return;
  const sourceTime = clipLocalTime(clip, state.currentTime);
  const video = document.createElement("video");
  video.src = media.url;
  video.muted = true;
  await new Promise((resolve) => {
    video.onloadeddata = resolve;
    setTimeout(resolve, 3000);
  });
  try { video.currentTime = sourceTime; } catch {}
  await new Promise((resolve) => {
    video.onseeked = resolve;
    setTimeout(resolve, 800);
  });
  const c = document.createElement("canvas");
  c.width = video.videoWidth || 1280;
  c.height = video.videoHeight || 720;
  c.getContext("2d").drawImage(video, 0, 0, c.width, c.height);
  c.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fotograma-${formatTime(sourceTime).replace(":", "-")}.png`;
    a.click();
    setStatus("Fotograma exportado como PNG.");
  }, "image/png");
}

registerStudioServiceWorker();

renderMediaLibrary();
renderTransitionsCatalog();
renderQueue();
applyLocalExportRecommendations(true);
updateExportSettingsHint();
renderAll();

window.StudioApp = {
  get state() { return state; },
  selectedClip,
  mediaById,
  renderAll,
  renderPreview,
  renderProperties,
  renderTimeline,
  setStatus,
  openModulePanel,
  uid,
  formatTime,
  insertFreezeAtPlayhead,
  exportPlayheadFramePng,
  updateEffectsPreviewOverlay,
  TRACK_LABEL_WIDTH,
  MAGNETIC_SNAP_PX,
  timeToTrackPixels,
  trackPixelsToTime,
  clipTimelineEnd,
  applyMagneticSnap,
  updatePlayhead,
  projectDuration,
  getCapabilities: () => ({ ...studioCapabilities })
};

/* ---------- Harness E2E (?e2e=1): preview + export en navegador ---------- */
(function installE2EHarness() {
  if (new URLSearchParams(location.search).get("e2e") !== "1") return;

  async function makeColorVideoBlob(color, seconds = 2, label = "VIDEO", w = 640, h = 360) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const stream = canvas.captureStream(30);
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    gain.gain.value = 0.08;
    osc.frequency.value = color === "#c62828" ? 220 : 440;
    osc.connect(gain);
    const dest = audioCtx.createMediaStreamDestination();
    gain.connect(dest);
    osc.start();
    dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));

    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm";
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1_000_000 });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    const stopped = new Promise((resolve) => { rec.onstop = resolve; });
    rec.start(100);

    const t0 = performance.now();
    await new Promise((resolve) => {
      const draw = () => {
        const t = (performance.now() - t0) / 1000;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 56px sans-serif";
        ctx.fillText(label, 36, h / 2);
        ctx.font = "bold 28px sans-serif";
        ctx.fillText(`${t.toFixed(2)}s`, 36, h / 2 + 48);
        if (t >= seconds) resolve();
        else requestAnimationFrame(draw);
      };
      draw();
    });

    rec.stop();
    await stopped;
    osc.stop();
    await audioCtx.close().catch(() => {});
    stream.getTracks().forEach((t) => t.stop());
    return new Blob(chunks, { type: "video/webm" });
  }

  /**
   * Video con movimiento continuo verificable (barra + marcador X(t)).
   * Permite freezedetect/motionScore: si export congela, X no avanza.
   */
  async function makeMotionVideoBlob(bg, seconds = 5, label = "MOTION", w = 960, h = 540) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const stream = canvas.captureStream(30);
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    gain.gain.value = 0.05;
    osc.frequency.value = bg === "#c62828" ? 196 : (bg === "#1565c0" ? 330 : 262);
    osc.connect(gain);
    const dest = audioCtx.createMediaStreamDestination();
    gain.connect(dest);
    osc.start();
    dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));

    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm";
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    const stopped = new Promise((resolve) => { rec.onstop = resolve; });
    rec.start(50);

    const t0 = performance.now();
    await new Promise((resolve) => {
      const draw = () => {
        const t = (performance.now() - t0) / 1000;
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
        /* Barra horizontal: posición proporcional al tiempo (movimiento continuo) */
        const x = ((t % seconds) / seconds) * (w - 80);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x, h * 0.35, 70, 90);
        ctx.fillStyle = "#111111";
        ctx.fillRect(x + 10, h * 0.4, 50, 60);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 42px sans-serif";
        ctx.fillText(label, 24, 56);
        ctx.font = "bold 36px monospace";
        ctx.fillText(`t=${t.toFixed(3)}`, 24, 110);
        ctx.fillText(`x=${Math.round(x)}`, 24, 155);
        if (t >= seconds) resolve();
        else requestAnimationFrame(draw);
      };
      draw();
    });

    rec.stop();
    await stopped;
    osc.stop();
    await audioCtx.close().catch(() => {});
    stream.getTracks().forEach((t) => t.stop());
    return new Blob(chunks, { type: "video/webm" });
  }

  function makeImageBlob(color = "#f9a825", w = 320, h = 180) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = "#111";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("IMAGEN DE PRUEBA", 16, h / 2 + 8);
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  }

  /**
   * Composición de prueba (especificación):
   * V1 0→3.7 | V2 2.7→6.2 (solape 1s) | dissolve 1s | imagen overlay 1→5 con fade
   * Duración esperada = max(ends) = 6.2 = dV1+dV2-transición (3.7+3.5-1).
   */
  async function buildMixedTimeline() {
    state.clips = [];
    state.media = [];
    state.selectedId = null;
    state.exportQueue = [];
    state.currentTime = 0;
    state.playing = false;

    const v1 = await makeColorVideoBlob("#c62828", 4.0, "VIDEO 1");
    const v2 = await makeColorVideoBlob("#1565c0", 4.0, "VIDEO 2");
    const img = await makeImageBlob("#f9a825");

    await importFiles([new File([v1], "video1-prueba.webm", { type: "video/webm" })], "video");
    await importFiles([new File([v2], "video2-prueba.webm", { type: "video/webm" })], "video");
    await importFiles([new File([img], "imagen-prueba.png", { type: "image/png" })], "image");

    const mediaVideo = state.media.filter((m) => m.type === "video");
    const mediaImage = state.media.filter((m) => m.type === "image");
    await addMedia(mediaVideo[0]);
    await addMedia(mediaVideo[1]);
    await addMedia(mediaImage[0]);

    const videos = state.clips.filter((c) => c.type === "video");
    const images = state.clips.filter((c) => c.type === "image");
    const transDur = 1.0;
    videos[0].name = "VIDEO 1";
    videos[0].start = 0;
    videos[0].duration = 3.7;
    videos[1].name = "VIDEO 2";
    videos[1].start = 2.7;
    videos[1].duration = 3.5;

    /* Imagen encima: antes / durante / después de la transición */
    images[0].name = "IMAGEN DE PRUEBA";
    images[0].start = 1.0;
    images[0].duration = 4.0;
    images[0].fadeIn = 0.5;
    images[0].fadeOut = 0.5;
    images[0].scale = 0.42;
    images[0].x = 0;
    images[0].y = -80;
    images[0].opacity = 1;

    state.currentTime = videos[1].start + transDur / 2;
    insertTransition("dissolve");
    const tr = state.clips.find((c) => c.type === "transition");
    if (tr) {
      tr.transitionType = "dissolve";
      tr.duration = transDur;
      tr.start = videos[1].start;
      tr.easing = "linear";
      tr.intensity = 1;
      tr.fromClipId = videos[0].id;
      tr.toClipId = videos[1].id;
    }
    ensureAllTransitionsOverlap();

    await renderAll();
    const expectedDuration = Math.max(
      videos[0].start + videos[0].duration,
      videos[1].start + videos[1].duration,
      images[0].start + images[0].duration
    );
    const formulaDuration = videos[0].duration + videos[1].duration - transDur;
    return {
      duration: projectDuration(),
      expectedDuration,
      formulaDuration,
      transition: tr ? { start: tr.start, duration: tr.duration, type: tr.transitionType } : null,
      image: { start: images[0].start, duration: images[0].duration, fadeIn: images[0].fadeIn, fadeOut: images[0].fadeOut },
      clips: state.clips.map((c) => ({
        id: c.id, type: c.type, start: c.start, duration: c.duration,
        transitionType: c.transitionType || null, name: c.name
      })),
      media: state.media.map((m) => ({ id: m.id, type: m.type, name: m.name }))
    };
  }

  /**
   * Proyecto de validación Crossfade (rojo → azul, 2 s dissolve, sin overlay).
   * insertTransition crea el solape; Cut B→C + FX visibles.
   */
  async function buildCrossfadeProbeTimeline() {
    state.clips = [];
    state.media = [];
    state.selectedId = null;
    state.exportQueue = [];
    state.currentTime = 0;
    state.playing = false;

    const v1 = await makeColorVideoBlob("#c62828", 5.2, "A-RED");
    const v2 = await makeColorVideoBlob("#1565c0", 5.2, "B-BLUE");
    const v3 = await makeColorVideoBlob("#2e7d32", 5.2, "C-GREEN");

    await importFiles([new File([v1], "a-red.webm", { type: "video/webm" })], "video");
    await importFiles([new File([v2], "b-blue.webm", { type: "video/webm" })], "video");
    await importFiles([new File([v3], "c-green.webm", { type: "video/webm" })], "video");

    const mediaVideo = state.media.filter((m) => m.type === "video");
    await addMedia(mediaVideo[0]);
    await addMedia(mediaVideo[1]);
    await addMedia(mediaVideo[2]);

    const videos = state.clips.filter((c) => c.type === "video").sort((a, b) => a.start - b.start);
    videos[0].name = "A-RED";
    videos[0].start = 0;
    videos[0].duration = 5;
    videos[0].saturation = 1.7;
    videos[0].contrast = 1.15;

    videos[1].name = "B-BLUE";
    videos[1].start = 5;
    videos[1].duration = 5;
    videos[1].saturation = 0.85;
    videos[1].contrast = 1.25;

    videos[2].name = "C-GREEN";
    videos[2].start = 10;
    videos[2].duration = 5;
    videos[2].saturation = 1.2;
    videos[2].brightness = 1.1;

    if ($("transitionDefaultDuration")) $("transitionDefaultDuration").value = "2";

    state.currentTime = 5;
    insertTransition("dissolve");
    let dissolve = state.clips.find((c) => c.type === "transition" && (c.transitionType || "dissolve") !== "cut");
    if (dissolve) {
      dissolve.transitionType = "dissolve";
      dissolve.duration = 2;
      dissolve.easing = "linear";
      dissolve.intensity = 1;
      dissolve.fromClipId = videos[0].id;
      dissolve.toClipId = videos[1].id;
      /* Centrar en el corte original (5 s) */
      dissolve.start = 5 - dissolve.duration / 2;
      ensureTransitionClipOverlap(videos[0], videos[1], dissolve.start, dissolve.duration);
    }

    state.currentTime = videos[1].start + videos[1].duration;
    insertTransition("cut");
    const cut = [...state.clips].reverse().find((c) => c.type === "transition" && c.transitionType === "cut");
    if (cut) {
      cut.fromClipId = videos[1].id;
      cut.toClipId = videos[2].id;
      cut.duration = 0.05;
      cut.start = videos[1].start + videos[1].duration - cut.duration / 2;
    }

    /* Título breve */
    state.clips.push({
      id: uid(),
      type: "text",
      track: "V3",
      name: "Título prueba",
      text: "CROSSFADE TEST",
      start: 0.3,
      duration: 2.2,
      x: 0,
      y: -200,
      scale: 1,
      opacity: 1,
      fontSize: 42,
      color: "#ffffff",
      layerPosition: "front"
    });

    ensureAllTransitionsOverlap();
    await renderAll();

    dissolve = state.clips.find((c) => c.type === "transition" && (c.transitionType || "") !== "cut");
    const vNow = state.clips.filter((c) => c.type === "video").sort((a, b) => a.start - b.start);
    return {
      duration: projectDuration(),
      dissolve: dissolve ? {
        start: dissolve.start,
        duration: dissolve.duration,
        from: dissolve.fromClipId,
        to: dissolve.toClipId
      } : null,
      cut: cut ? { start: cut.start, duration: cut.duration } : null,
      videos: vNow.map((c) => ({
        name: c.name, start: c.start, duration: c.duration,
        saturation: c.saturation, contrast: c.contrast
      })),
      sampleTimes: dissolve ? [
        dissolve.start,
        dissolve.start + dissolve.duration * 0.25,
        dissolve.start + dissolve.duration * 0.5,
        dissolve.start + dissolve.duration * 0.75,
        dissolve.start + dissolve.duration * 0.999
      ] : []
    };
  }

  /**
   * Proyecto fluidez: 3 clips con movimiento continuo + dissolve 2s + cut + FX + título + imagen.
   * opts.urls: rutas http a MP4 H.264 GOP corto (preferido). Si no, genera canvas/WebM.
   */
  async function buildMotionFluencyTimeline(opts = {}) {
    state.clips = [];
    state.media = [];
    state.selectedId = null;
    state.exportQueue = [];
    state.currentTime = 0;
    state.playing = false;

    const urls = opts.urls || null;
    const filesIn = opts.files || null;
    if (filesIn && filesIn.length >= 3) {
      await importFiles(filesIn.slice(0, 3), "video");
    } else if (urls && urls.length >= 3) {
      const files = [];
      for (let i = 0; i < 3; i++) {
        const res = await fetch(urls[i]);
        if (!res.ok) throw new Error(`fetch ${urls[i]} → ${res.status}`);
        const blob = await res.blob();
        files.push(new File([blob], `motion-${i + 1}.mp4`, { type: blob.type || "video/mp4" }));
      }
      await importFiles(files, "video");
    } else {
      const v1 = await makeMotionVideoBlob("#c62828", 5.3, "A-MOVE");
      const v2 = await makeMotionVideoBlob("#1565c0", 5.3, "B-MOVE");
      const v3 = await makeMotionVideoBlob("#2e7d32", 5.3, "C-MOVE");
      await importFiles([new File([v1], "a-move.webm", { type: "video/webm" })], "video");
      await importFiles([new File([v2], "b-move.webm", { type: "video/webm" })], "video");
      await importFiles([new File([v3], "c-move.webm", { type: "video/webm" })], "video");
    }

    const img = await makeImageBlob("#f9a825");
    await importFiles([new File([img], "overlay.png", { type: "image/png" })], "image");

    const mediaVideo = state.media.filter((m) => m.type === "video");
    const mediaImage = state.media.filter((m) => m.type === "image");
    await addMedia(mediaVideo[0]);
    await addMedia(mediaVideo[1]);
    await addMedia(mediaVideo[2]);
    await addMedia(mediaImage[0]);

    const videos = state.clips.filter((c) => c.type === "video").sort((a, b) => a.start - b.start);
    const images = state.clips.filter((c) => c.type === "image");

    videos[0].name = "A-MOVE";
    videos[0].start = 0;
    videos[0].duration = 5;
    videos[0].saturation = 1.55;
    videos[0].contrast = 1.1;

    videos[1].name = "B-MOVE";
    videos[1].start = 5;
    videos[1].duration = 5;
    videos[1].saturation = 0.35;
    videos[1].contrast = 1.35;

    videos[2].name = "C-MOVE";
    videos[2].start = 10;
    videos[2].duration = 5;
    videos[2].brightness = 1.12;
    videos[2].saturation = 1.25;

    images[0].name = "OVERLAY";
    images[0].start = 1.5;
    images[0].duration = 3.5;
    images[0].scale = 0.28;
    images[0].x = 380;
    images[0].y = -220;
    images[0].opacity = 0.95;
    images[0].fadeIn = 0.25;
    images[0].fadeOut = 0.25;

    if ($("transitionDefaultDuration")) $("transitionDefaultDuration").value = "2";
    state.currentTime = 5;
    insertTransition("dissolve");
    let dissolve = state.clips.find((c) => c.type === "transition" && (c.transitionType || "dissolve") !== "cut");
    if (dissolve) {
      dissolve.transitionType = "dissolve";
      dissolve.duration = 2;
      dissolve.easing = "linear";
      dissolve.intensity = 1;
      dissolve.fromClipId = videos[0].id;
      dissolve.toClipId = videos[1].id;
      dissolve.start = 5 - dissolve.duration / 2;
      ensureTransitionClipOverlap(videos[0], videos[1], dissolve.start, dissolve.duration);
    }

    state.currentTime = videos[1].start + videos[1].duration;
    insertTransition("cut");
    const cut = [...state.clips].reverse().find((c) => c.type === "transition" && c.transitionType === "cut");
    if (cut) {
      cut.fromClipId = videos[1].id;
      cut.toClipId = videos[2].id;
      cut.duration = 0.05;
      cut.start = videos[1].start + videos[1].duration - cut.duration / 2;
    }

    state.clips.push({
      id: uid(),
      type: "text",
      track: "V3",
      name: "Título fluidez",
      text: "FLUENCY TEST",
      start: 0.2,
      duration: 2.5,
      x: 0,
      y: -260,
      scale: 1,
      opacity: 1,
      fontSize: 48,
      color: "#ffffff",
      layerPosition: "front"
    });

    ensureAllTransitionsOverlap();
    await renderAll();

    dissolve = state.clips.find((c) => c.type === "transition" && (c.transitionType || "") !== "cut");
    const vNow = state.clips.filter((c) => c.type === "video").sort((a, b) => a.start - b.start);
    return {
      duration: projectDuration(),
      sourceMode: (filesIn || urls) ? "h264-gop30" : "canvas-webm",
      dissolve: dissolve ? { start: dissolve.start, duration: dissolve.duration } : null,
      cut: cut ? { start: cut.start, duration: cut.duration } : null,
      videos: vNow.map((c) => ({
        name: c.name, start: c.start, duration: c.duration,
        end: c.start + c.duration,
        saturation: c.saturation, contrast: c.contrast, brightness: c.brightness
      })),
      motionWindows: [
        { name: "A-MOVE", from: 0.4, to: 3.7 },
        { name: "B-MOVE", from: 6.3, to: 9.5 },
        { name: "C-MOVE", from: 10.4, to: 14.5 }
      ],
      sampleTimes: dissolve ? [
        dissolve.start,
        dissolve.start + dissolve.duration * 0.25,
        dissolve.start + dissolve.duration * 0.5,
        dissolve.start + dissolve.duration * 0.75,
        dissolve.start + dissolve.duration * 0.999
      ] : []
    };
  }

  /**
   * Caso real del usuario: Video A → Imagen (puente) → Video B,
   * con disolvenias en ambas uniones (fuentes distintas).
   */
  async function buildVideoImageBridgeTimeline(opts = {}) {
    state.clips = [];
    state.media = [];
    state.selectedId = null;
    state.exportQueue = [];
    state.currentTime = 0;
    state.playing = false;

    const filesIn = opts.files || null;
    if (filesIn && filesIn.length >= 2) {
      await importFiles(filesIn.slice(0, 2), "video");
    } else {
      const v1 = await makeMotionVideoBlob("#c62828", 5.5, "A-SRC");
      const v2 = await makeMotionVideoBlob("#1565c0", 5.5, "B-SRC");
      await importFiles([new File([v1], "a-src.webm", { type: "video/webm" })], "video");
      await importFiles([new File([v2], "b-src.webm", { type: "video/webm" })], "video");
    }

    const img = await makeImageBlob("#f9a825", 1280, 720);
    await importFiles([new File([img], "bridge.png", { type: "image/png" })], "image");

    const mediaVideo = state.media.filter((m) => m.type === "video");
    const mediaImage = state.media.filter((m) => m.type === "image");
    await addMedia(mediaVideo[0]);
    await addMedia(mediaImage[0]);
    await addMedia(mediaVideo[1]);

    const videos = state.clips.filter((c) => c.type === "video").sort((a, b) => a.start - b.start);
    const images = state.clips.filter((c) => c.type === "image");

    videos[0].name = "VIDEO-A";
    videos[0].start = 0;
    videos[0].duration = 4;
    videos[0].saturation = 1.2;

    images[0].name = "IMAGEN-PUENTE";
    images[0].start = 4;
    images[0].duration = 3;
    images[0].scale = 1;
    images[0].x = 0;
    images[0].y = 0;
    images[0].opacity = 1;
    images[0].track = "V1"; /* misma pista visual secuencial */

    videos[1].name = "VIDEO-B";
    videos[1].start = 7;
    videos[1].duration = 4;
    videos[1].contrast = 1.15;

    if ($("transitionDefaultDuration")) $("transitionDefaultDuration").value = "1.2";

    state.currentTime = 4;
    insertTransition("dissolve");
    let tr1 = state.clips.find((c) => c.type === "transition" && c.fromClipId === videos[0].id);
    if (!tr1) {
      tr1 = state.clips.find((c) => c.type === "transition");
    }
    if (tr1) {
      tr1.transitionType = "dissolve";
      tr1.duration = 1.2;
      tr1.easing = "linear";
      tr1.intensity = 1;
      tr1.fromClipId = videos[0].id;
      tr1.toClipId = images[0].id;
      tr1.start = 4 - tr1.duration / 2;
      ensureTransitionClipOverlap(videos[0], images[0], tr1.start, tr1.duration);
    }

    state.currentTime = 7;
    insertTransition("dissolve");
    let tr2 = [...state.clips].reverse().find((c) =>
      c.type === "transition" && c.fromClipId === images[0].id
    );
    if (!tr2) {
      tr2 = [...state.clips].reverse().find((c) =>
        c.type === "transition" && c.id !== tr1?.id
      );
    }
    if (tr2) {
      tr2.transitionType = "dissolve";
      tr2.duration = 1.2;
      tr2.easing = "linear";
      tr2.intensity = 1;
      tr2.fromClipId = images[0].id;
      tr2.toClipId = videos[1].id;
      tr2.start = 7 - tr2.duration / 2;
      ensureTransitionClipOverlap(images[0], videos[1], tr2.start, tr2.duration);
    }

    ensureAllTransitionsOverlap();
    await renderAll();

    const transitions = state.clips
      .filter((c) => c.type === "transition")
      .sort((a, b) => a.start - b.start)
      .map((c) => ({
        id: c.id,
        start: c.start,
        duration: c.duration,
        from: c.fromClipId,
        to: c.toClipId,
        type: c.transitionType
      }));

    return {
      duration: projectDuration(),
      videos: state.clips.filter((c) => c.type === "video").map((c) => ({
        id: c.id, name: c.name, start: c.start, duration: c.duration, end: c.start + c.duration
      })),
      image: images[0] ? {
        id: images[0].id, name: images[0].name, start: images[0].start,
        duration: images[0].duration, end: images[0].start + images[0].duration
      } : null,
      transitions,
      motionWindows: [
        { name: "A", from: 0.4, to: 3.2 },
        { name: "bridge", from: 4.8, to: 6.2 },
        { name: "B", from: 7.8, to: 10.5 }
      ],
      joinWindows: transitions.map((t) => ({
        from: t.start,
        to: t.start + t.duration
      }))
    };
  }

  async function measurePreviewFluency(passes = 3) {
    const results = [];
    const total = projectDuration();
    for (let p = 0; p < passes; p += 1) {
      stopPlayback();
      state.currentTime = 0;
      await renderPreview();
      const hitches = [];
      let frames = 0;
      let last = performance.now();
      const budget = 1000 / 30;
      const onFrame = (now) => {
        if (!state.playing) return;
        const dt = now - last;
        last = now;
        frames += 1;
        if (dt > budget * 2.8 && frames > 3) hitches.push({ t: state.currentTime, dt });
        requestAnimationFrame(onFrame);
      };

      togglePlayback();
      requestAnimationFrame(onFrame);
      await new Promise((resolve) => {
        const check = () => {
          if (!state.playing || state.currentTime >= total - 0.05) resolve();
          else setTimeout(check, 40);
        };
        setTimeout(check, 80);
        setTimeout(resolve, (total + 2) * 1000);
      });
      stopPlayback();

      const transitionHits = hitches.filter((h) =>
        state.clips.some((c) => c.type === "transition"
          && h.t >= c.start - 0.05 && h.t <= c.start + c.duration + 0.05)
      );
      results.push({
        pass: p + 1,
        frames,
        hitches: hitches.length,
        transitionHitches: transitionHits.length,
        maxDt: hitches.reduce((m, h) => Math.max(m, h.dt), 0) || 0
      });
    }
    return results;
  }

  async function exportCapture(format = "webm", options = {}) {
    window.__E2E_LAST_EXPORT__ = {};
    window.__E2E_EXPORT_METRICS__ = { seeks: 0, seeksInLock: 0, seeksInTransition: 0 };
    window.__E2E_EXPORT_PROFILE__ = null;

    const resolution = options.resolution || "640x360";
    const fps = options.fps != null ? options.fps : 12;
    const preset = options.preset || "small";
    const bitrateMbps = options.bitrateMbps != null ? options.bitrateMbps : 1.5;

    $("exportFormat").value = format;
    $("exportResolution").value = resolution;
    $("exportFps").value = String(fps);
    $("exportPreset").value = preset;
    $("exportPowerMode").value = options.powerMode || "turbo";
    $("exportFilename").value = options.filename || `e2e-${format}`;
    updateExportSettingsHint();

    const targetExt = extensionForExportFormat(format);
    state.exportQueue = [{
      id: uid(),
      name: options.filename || `e2e-${format}`,
      format,
      resolution,
      fps,
      preset,
      bitrateMbps,
      audioKbps: options.audioKbps || 96,
      status: "Pendiente"
    }];
    renderQueue();

    const longFrames = [];
    let lastRaf = performance.now();
    let rafId = 0;
    const watch = (now) => {
      if (!state.exporting) return;
      const dt = now - lastRaf;
      lastRaf = now;
      if (dt > 90) longFrames.push({ t: state.currentTime, dt });
      rafId = requestAnimationFrame(watch);
    };
    rafId = requestAnimationFrame(watch);

    const exportTimeoutMs = options.timeoutMs || (format === "gif" ? 360_000 : 420_000);
    await Promise.race([
      processExportQueue(),
      new Promise((_, reject) => setTimeout(
        () => reject(new Error(`Timeout exportando ${format} (${exportTimeoutMs}ms)`)),
        exportTimeoutMs
      ))
    ]).catch((err) => {
      setExportProgress(0, `Error al exportar: ${err.message}`);
      state.exporting = false;
    });
    cancelAnimationFrame(rafId);

    const last = window.__E2E_LAST_EXPORT__ || {};
    const filename = last.filename || "";
    const ext = filename.includes(".") ? filename.split(".").pop() : "";
    const metrics = window.__E2E_EXPORT_METRICS__ || {};
    const profile = window.__E2E_EXPORT_PROFILE__ || window.__EXPORT_PROFILE__ || null;

    let playable = false;
    let playDuration = 0;
    if (last.blob && format !== "gif") {
      playable = await new Promise((resolve) => {
        const v = document.createElement("video");
        v.preload = "auto";
        v.muted = true;
        const url = URL.createObjectURL(last.blob);
        v.onloadedmetadata = () => {
          playDuration = v.duration || 0;
          URL.revokeObjectURL(url);
          resolve(playDuration > 0.5);
        };
        v.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(false);
        };
        v.src = url;
        setTimeout(() => resolve(playDuration > 0.5), 4000);
      });
    } else if (last.blob && format === "gif") {
      playable = last.blob.size > 500;
    }

    const transitionLong = longFrames.filter((f) =>
      state.clips.some((c) => c.type === "transition"
        && f.t >= c.start && f.t <= c.start + c.duration)
    );

    /* Capturar error de cola si no hubo blob */
    const statusText = $("exportStatus")?.textContent || "";
    if (!last.filename) {
      return {
        format,
        targetExt,
        filename: "",
        extension: "",
        extensionOk: false,
        size: 0,
        mime: "",
        playable: false,
        playDuration: 0,
        metrics,
        profile,
        exportLongFrames: longFrames.length,
        exportTransitionLongFrames: transitionLong.length,
        projectDuration: projectDuration(),
        error: statusText
      };
    }

    return {
      format,
      targetExt,
      filename,
      extension: ext,
      extensionOk: ext === targetExt,
      size: last.size || 0,
      mime: last.type || "",
      playable,
      playDuration,
      metrics,
      profile,
      exportLongFrames: longFrames.length,
      exportTransitionLongFrames: transitionLong.length,
      projectDuration: projectDuration(),
      blobBase64: null
    };
  }

  /** Seek de todos los medios visibles (y extremos FX) antes de dibujar un fotograma de muestra */
  async function seekExportClipsForSample(t) {
    const needed = new Map();
    for (const clip of state.clips) {
      if (clip.type !== "video" && clip.type !== "image" && clip.type !== "audio") continue;
      if (t >= clip.start - 0.05 && t < clip.start + clip.duration + 0.05) needed.set(clip.id, clip);
    }
    const tr = activeClip("transition", t);
    if (tr?.fromClipId) {
      const c = state.clips.find((x) => x.id === tr.fromClipId);
      if (c) needed.set(c.id, c);
    }
    if (tr?.toClipId) {
      const c = state.clips.find((x) => x.id === tr.toClipId);
      if (c) needed.set(c.id, c);
    }
    await Promise.all([...needed.values()].map(async (clip) => {
      const el = await getExportMediaElement(clip);
      if (!el || el.tagName !== "VIDEO") return;
      const local = clipLocalTime(clip, t);
      await seekAndWaitForFrame(el, local);
    }));
  }

  /** Muestrea colores del compositor de export en tiempos clave (sin grabar) */
  async function sampleCompositionFrames(times) {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext("2d", { alpha: false });
    ensureAllTransitionsOverlap();
    exportClipIndex = buildExportClipIndex();
    await preloadExportMedia().catch(() => {});
    const wasExporting = state.exporting;
    const wasDet = state.exportDeterministic;
    state.exporting = true;
    state.exportDeterministic = true;
    const samples = [];
    const avg = (d) => (d[0] + d[1] + d[2]) / 3;
    const regionAvg = (x0, y0, w, h) => {
      const data = ctx.getImageData(x0, y0, w, h).data;
      let r = 0;
      let g = 0;
      let b = 0;
      const n = w * h;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }
      return [r / n, g / n, b / n];
    };
    try {
      for (const t of times) {
        state.currentTime = t;
        await prepareDeterministicSourcesAt(t);
        drawExportFrame(ctx, canvas.width, canvas.height, t);
        let area = regionAvg(40, 30, 240, 120);
        if ((area[0] + area[1] + area[2]) / 3 < 25) {
          await waitMs(60);
          await prepareDeterministicSourcesAt(t);
          drawExportFrame(ctx, canvas.width, canvas.height, t);
          area = regionAvg(40, 30, 240, 120);
        }
        const mid = ctx.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
        const corner = ctx.getImageData(16, 16, 1, 1).data;
        samples.push({
          t,
          mid: [mid[0], mid[1], mid[2]],
          corner: [corner[0], corner[1], corner[2]],
          area: [area[0], area[1], area[2]],
          midBright: avg(mid),
          cornerBright: avg(corner),
          areaBright: (area[0] + area[1] + area[2]) / 3,
          notBlack: avg(corner) > 12 || avg(mid) > 12 || (area[0] + area[1] + area[2]) / 3 > 12,
          hasTransition: Boolean(activeClip("transition", t)),
          overlayImages: overlayImageClipsAt(t).length
        });
      }
    } finally {
      state.exporting = wasExporting;
      state.exportDeterministic = wasDet;
    }
    return samples;
  }

  /** Extrae fotogramas RGB del blob exportado (validación post-export) */
  async function sampleExportedBlobFrames(blobBase64, mime, times) {
    const bin = atob(blobBase64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime || "video/webm" });
    const url = URL.createObjectURL(blob);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = () => reject(new Error("blob no reproducible"));
      setTimeout(() => reject(new Error("timeout metadata")), 15000);
    });
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext("2d", { alpha: false });
    const out = [];
    const avg = (d) => (d[0] + d[1] + d[2]) / 3;
    for (const t of times) {
      const target = Math.min(Math.max(0, t), Math.max(0, video.duration - 0.05));
      video.currentTime = target;
      await Promise.race([
        new Promise((resolve) => {
          const done = () => { video.removeEventListener("seeked", done); resolve(); };
          video.addEventListener("seeked", done);
        }),
        waitMs(2000)
      ]);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const mid = ctx.getImageData(160, 90, 1, 1).data;
      const corner = ctx.getImageData(16, 16, 1, 1).data;
      out.push({
        t: target,
        mid: [mid[0], mid[1], mid[2]],
        corner: [corner[0], corner[1], corner[2]],
        midBright: avg(mid),
        cornerBright: avg(corner),
        notBlack: avg(corner) > 8 || avg(mid) > 8,
        pngBase64: canvas.toDataURL("image/png").slice(22)
      });
    }
    URL.revokeObjectURL(url);
    return { duration: video.duration, width: video.videoWidth, height: video.videoHeight, frames: out };
  }

  async function scrubPreview(times) {
    const results = [];
    for (const t of times) {
      stopPlayback();
      state.currentTime = t;
      await renderPreview();
      await waitMs(40);
      const tr = activeClip("transition");
      const img = overlayImageClipsAt(t, tr);
      results.push({
        t,
        hasTransition: Boolean(tr),
        overlayImages: img.length,
        imageOverlayVisible: ui.imageOverlay?.style.display === "block"
          || (!tr && ui.image?.style.display === "block")
      });
    }
    return results;
  }

  /**
   * Paridad preview (monitor) ↔ compositor de export en los mismos tiempos T.
   * También mide continuidad temporal del export (anti-freeze / anti-temblor).
   */
  async function comparePreviewExportParity(times, opts = {}) {
    const w = opts.width || 320;
    const h = opts.height || 180;
    const maeLimit = opts.maeLimit != null ? opts.maeLimit : 28;
    const motionFloor = opts.motionFloor != null ? opts.motionFloor : 1.2;

    const previewCanvas = document.createElement("canvas");
    previewCanvas.width = w;
    previewCanvas.height = h;
    const previewCtx = previewCanvas.getContext("2d", { alpha: false, willReadFrequently: true });

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = w;
    exportCanvas.height = h;
    const exportCtx = exportCanvas.getContext("2d", { alpha: false, willReadFrequently: true });

    ensureAllTransitionsOverlap();
    exportClipIndex = buildExportClipIndex();
    await preloadExportMedia().catch(() => {});

    const wasExporting = state.exporting;
    const wasDet = state.exportDeterministic;
    const savedFps = state.exportFps;
    state.exportFps = opts.fps || state.exportFps || 30;

    const meanRgb = (data) => {
      let r = 0;
      let g = 0;
      let b = 0;
      const n = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }
      return [r / n, g / n, b / n];
    };
    const maeBetween = (a, b) => {
      let sum = 0;
      const n = Math.min(a.length, b.length) / 4;
      for (let i = 0; i < n * 4; i += 4) {
        sum += (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])) / 3;
      }
      return sum / n;
    };
    const frameMotion = (prev, cur) => {
      if (!prev || !cur || prev.length !== cur.length) return 0;
      let sum = 0;
      const n = cur.length / 4;
      for (let i = 0; i < cur.length; i += 4) {
        sum += (Math.abs(cur[i] - prev[i]) + Math.abs(cur[i + 1] - prev[i + 1]) + Math.abs(cur[i + 2] - prev[i + 2])) / 3;
      }
      return sum / n;
    };

    const samples = [];
    let prevExportData = null;
    let prevPreviewData = null;
    const profile = { duplicateMediaFrames: 0, badFrameSnaps: 0, stuckRetries: 0 };

    try {
      stopPlayback();
      /* Warm-up del monitor: evita el primer scrub en negro/gris vacío */
      state.exporting = false;
      state.exportDeterministic = false;
      state.currentTime = 0.25;
      await renderPreview();
      await waitMs(120);
      state.currentTime = 1.0;
      await renderPreview();
      await waitMs(80);

      for (const t of times) {
        /* --- Preview (scrub + RVFC) --- */
        state.exporting = false;
        state.exportDeterministic = false;
        state.currentTime = t;
        await renderPreview();
        await waitMs(50);
        const vis = [ui.video, ui.videoSecondary].filter((v) => v && v.style.display !== "none" && v.readyState >= 2);
        await Promise.all(vis.map((v) => new Promise((resolve) => {
          if (typeof v.requestVideoFrameCallback === "function") {
            const id = v.requestVideoFrameCallback(() => resolve());
            setTimeout(() => {
              try { v.cancelVideoFrameCallback?.(id); } catch { /* ignore */ }
              resolve();
            }, 120);
          } else setTimeout(resolve, 40);
        })));
        /* Si el monitor aún no pintó (negro) tras seek, reintentar — no es fallo de export */
        let previewData = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          capturePreviewToCanvas(previewCtx, w, h);
          previewData = previewCtx.getImageData(0, 0, w, h).data;
          const pm = meanRgb(previewData);
          const bright = (pm[0] + pm[1] + pm[2]) / 3;
          if (bright > 8 || attempt === 2) break;
          await renderPreview();
          await waitMs(70);
          await Promise.all(vis.map((v) => new Promise((resolve) => {
            if (typeof v.requestVideoFrameCallback === "function") {
              const id = v.requestVideoFrameCallback(() => resolve());
              setTimeout(() => resolve(), 100);
              try { /* keep */ } catch { /* ignore */ }
              void id;
            } else setTimeout(resolve, 40);
          })));
        }
        const previewMean = meanRgb(previewData);
        const previewMotion = frameMotion(prevPreviewData, previewData);
        prevPreviewData = new Uint8ClampedArray(previewData);

        /* --- Export compositor (misma ruta que recordTimeline) --- */
        state.exporting = true;
        state.exportDeterministic = true;
        state.currentTime = t;
        window.__EXPORT_PROFILE__ = window.__EXPORT_PROFILE__ || profile;
        await prepareDeterministicSourcesAt(t);
        drawExportFrame(exportCtx, w, h, t);
        const exportData = exportCtx.getImageData(0, 0, w, h).data;
        const exportMean = meanRgb(exportData);
        const exportMotion = frameMotion(prevExportData, exportData);
        prevExportData = new Uint8ClampedArray(exportData);

        const mae = maeBetween(previewData, exportData);
        const previewBright = (previewMean[0] + previewMean[1] + previewMean[2]) / 3;
        const exportBright = (exportMean[0] + exportMean[1] + exportMean[2]) / 3;
        const previewFlat = Math.max(...previewMean) - Math.min(...previewMean) < 4;
        /* Monitor sin frame real (negro o gris plano) → no contar como fallo de export */
        const previewReady = (previewBright > 8 && !previewFlat) || exportBright <= 8;
        const parityOk = previewReady ? mae <= maeLimit : true;

        const activeVideos = [];
        for (const [, el] of exportMediaCache) {
          if (!el || el.tagName !== "VIDEO") continue;
          activeVideos.push({
            media: el._exportLastMedia,
            ok: el._exportFrameOk !== false,
            t: el.currentTime
          });
        }

        samples.push({
          t,
          mae,
          previewMean,
          exportMean,
          previewMotion,
          exportMotion,
          hasTransition: Boolean(activeClip("transition", t)),
          activeVideos,
          parityOk,
          previewReady
        });
      }
    } finally {
      state.exporting = wasExporting;
      state.exportDeterministic = wasDet;
      state.exportFps = savedFps;
    }

    const expProf = window.__EXPORT_PROFILE__ || {};
    const motionTimes = times.filter((t, i) => {
      /* Ventanas con movimiento esperado (fuera de disolvenias) */
      const s = samples[i];
      if (!s || s.hasTransition) return false;
      return (t > 0.4 && t < 4.5) || (t > 6.5 && t < 9.2);
    });
    const motionSamples = samples.filter((s) => motionTimes.includes(s.t));
    const avgExportMotion = motionSamples.length
      ? motionSamples.reduce((a, s) => a + s.exportMotion, 0) / motionSamples.length
      : 0;
    const avgPreviewMotion = motionSamples.length
      ? motionSamples.reduce((a, s) => a + s.previewMotion, 0) / motionSamples.length
      : 0;

    /* Congelación: export casi sin cambio mientras preview sí se mueve (ignora cortes) */
    const freezeMismatches = samples.filter((s, i) => {
      if (i === 0 || s.hasTransition) return false;
      const nearCut = samples[i + 1]?.hasTransition || samples[i - 1]?.hasTransition;
      if (nearCut) return false;
      return s.previewMotion >= motionFloor && s.exportMotion < motionFloor * 0.35;
    });

    /* Temblor: oscilación A-B-A en media del export */
    const flickerEvents = [];
    for (let i = 2; i < samples.length; i++) {
      const a = samples[i - 2].exportMean;
      const b = samples[i - 1].exportMean;
      const c = samples[i].exportMean;
      const bright = (m) => (m[0] + m[1] + m[2]) / 3;
      const ba = bright(a);
      const bb = bright(b);
      const bc = bright(c);
      if (Math.abs(bb - ba) > 14 && Math.abs(bc - bb) > 14 && Math.abs(bc - ba) < 5) {
        flickerEvents.push({ t: samples[i].t, ba, bb, bc });
      }
    }

    const avgMae = samples.length ? samples.reduce((a, s) => a + s.mae, 0) / samples.length : 999;
    const parityFails = samples.filter((s) => !s.parityOk);
    const pass = parityFails.length === 0
      && freezeMismatches.length === 0
      && flickerEvents.length === 0
      && avgExportMotion >= motionFloor * 0.85
      && (expProf.badFrameSnaps || 0) < Math.max(3, Math.floor(times.length * 0.08));

    return {
      pass,
      avgMae,
      maeLimit,
      avgExportMotion,
      avgPreviewMotion,
      motionFloor,
      parityFails: parityFails.slice(0, 12),
      freezeMismatches: freezeMismatches.slice(0, 12),
      flickerEvents: flickerEvents.slice(0, 12),
      profile: {
        badFrameSnaps: expProf.badFrameSnaps || 0,
        stuckRetries: expProf.stuckRetries || 0,
        fingerprintStalls: expProf.fingerprintStalls || 0,
        overshootAccepted: expProf.overshootAccepted || 0,
        overshootCatchup: expProf.overshootCatchup || 0,
        sequentialAdvances: expProf.sequentialAdvances || 0,
        seeks: expProf.seeks || 0
      },
      samples
    };
  }

  window.__STUDIO_E2E__ = {
    ready: true,
    buildMixedTimeline,
    buildCrossfadeProbeTimeline,
    buildMotionFluencyTimeline,
    buildVideoImageBridgeTimeline,
    measurePreviewFluency,
    exportCapture,
    processExportQueue,
    sampleCompositionFrames,
    sampleExportedBlobFrames,
    scrubPreview,
    comparePreviewExportParity,
    extensionForExportFormat,
    getProject() {
      return {
        duration: projectDuration(),
        clips: state.clips.length,
        transitions: state.clips.filter((c) => c.type === "transition").length,
        videos: state.clips.filter((c) => c.type === "video").length,
        images: state.clips.filter((c) => c.type === "image").length
      };
    }
  };
  console.info("[E2E] harness listo");
})();
