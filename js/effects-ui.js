/**
 * UI de Efectos visuales + Control de velocidad (Fase 1+).
 * Depende de StudioEffectsCatalog, StudioEffects, StudioSpeed y StudioApp.
 */
(function () {
  const $ = (id) => document.getElementById(id);
  let activeCategory = "Todos";
  let viewMode = "thumbs";
  let favorites = new Set(JSON.parse(localStorage.getItem("studioFxFavorites") || "[]"));
  let recent = JSON.parse(localStorage.getItem("studioFxRecent") || "[]");

  function app() {
    return window.StudioApp;
  }

  function saveMeta() {
    localStorage.setItem("studioFxFavorites", JSON.stringify([...favorites]));
    localStorage.setItem("studioFxRecent", JSON.stringify(recent.slice(0, 20)));
  }

  function pushRecent(type) {
    recent = [type, ...recent.filter((t) => t !== type)].slice(0, 12);
    saveMeta();
  }

  function clipOk(clip) {
    return clip && (clip.type === "video" || clip.type === "image");
  }

  function videoOk(clip) {
    return clip && clip.type === "video";
  }

  function filteredEffects() {
    const cat = window.StudioEffectsCatalog;
    if (!cat) return [];
    const q = ($("effectsSearch")?.value || "").trim().toLowerCase();
    let list = cat.EFFECTS.slice();
    if (activeCategory === "Favoritos") {
      list = list.filter((e) => favorites.has(e.type));
    } else if (activeCategory === "Recientes") {
      list = recent.map((t) => cat.byType(t)).filter(Boolean);
    } else if (activeCategory === "Presets") {
      return [];
    } else if (activeCategory !== "Todos" && activeCategory) {
      list = list.filter((e) => e.category === activeCategory);
    }
    if (q) {
      list = list.filter((e) =>
        e.name.toLowerCase().includes(q)
        || e.type.includes(q)
        || (e.tags || []).some((t) => t.includes(q))
      );
    }
    return list;
  }

  function renderCategories() {
    const bar = $("effectsCategoryBar");
    if (!bar || !window.StudioEffectsCatalog) return;
    const cats = ["Todos", ...window.StudioEffectsCatalog.CATEGORIES];
    bar.innerHTML = cats.map((c) =>
      `<button type="button" class="effects-cat-btn${c === activeCategory ? " active" : ""}" data-cat="${c}">${c}</button>`
    ).join("");
    bar.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeCategory = btn.dataset.cat;
        renderLibrary();
        renderCategories();
      });
    });
  }

  function renderLibrary() {
    const lib = $("effectsLibrary");
    if (!lib || !window.StudioEffectsCatalog) return;
    lib.classList.toggle("list-mode", viewMode === "list");

    if (activeCategory === "Presets") {
      lib.innerHTML = window.StudioEffectsCatalog.PRESETS.map((p) => `
        <button type="button" class="effect-card" data-preset="${p.id}" title="${p.name}">
          <span class="effect-card-thumb" data-fx="preset"></span>
          <strong>${p.name}</strong>
          <small>Preset</small>
        </button>`).join("");
      lib.querySelectorAll("[data-preset]").forEach((el) => {
        el.addEventListener("dblclick", () => applyPreset(el.dataset.preset));
        el.addEventListener("click", () => applyPreset(el.dataset.preset));
      });
      return;
    }

    const items = filteredEffects();
    lib.innerHTML = items.map((e) => `
      <button type="button" class="effect-card" draggable="true" data-fx="${e.type}" title="${e.name}">
        <span class="effect-card-thumb" data-fx="${e.type}"></span>
        <strong>${e.name}</strong>
        <small>${e.category}</small>
        <span class="effect-fav${favorites.has(e.type) ? " on" : ""}" data-fav="${e.type}" title="Favorito">★</span>
      </button>`).join("") || `<p class="muted">Sin resultados.</p>`;

    lib.querySelectorAll(".effect-card[data-fx]").forEach((el) => {
      el.addEventListener("dblclick", () => applyEffect(el.dataset.fx));
      el.addEventListener("dragstart", (ev) => {
        ev.dataTransfer.setData("text/studio-fx", el.dataset.fx);
        ev.dataTransfer.effectAllowed = "copy";
      });
    });
    lib.querySelectorAll("[data-fav]").forEach((star) => {
      star.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const t = star.dataset.fav;
        if (favorites.has(t)) favorites.delete(t);
        else favorites.add(t);
        saveMeta();
        renderLibrary();
      });
    });
  }

  function applyEffect(type) {
    const a = app();
    if (!a) return;
    const clip = a.selectedClip();
    if (!clipOk(clip)) {
      a.setStatus("Seleccione un clip de video o imagen.");
      return;
    }
    window.StudioEffects.addEffectToClip(clip, type);
    pushRecent(type);
    a.renderAll();
    refreshControls();
    a.setStatus(`Efecto aplicado: ${window.StudioEffectsCatalog.byType(type)?.name || type}`);
  }

  function applyPreset(presetId) {
    const a = app();
    if (!a) return;
    const clip = a.selectedClip();
    if (!clipOk(clip)) {
      a.setStatus("Seleccione un clip de video o imagen.");
      return;
    }
    window.StudioEffects.applyPreset(clip, presetId);
    a.renderAll();
    refreshControls();
    a.setStatus("Preset de efectos aplicado.");
  }

  function refreshControls() {
    const a = app();
    const box = $("effectsControls");
    const none = $("effectsNoClip");
    if (!box || !a) return;
    const clip = a.selectedClip();
    if (!clipOk(clip)) {
      box.hidden = true;
      if (none) none.hidden = false;
      return;
    }
    if (none) none.hidden = true;
    box.hidden = false;
    window.StudioEffects.ensureClip(clip);
    if (!clip.effects.length) {
      box.innerHTML = `<p class="muted">Sin efectos en este clip. Elija uno de la biblioteca.</p>`;
      return;
    }
    box.innerHTML = clip.effects.map((fx, index) => {
      const def = window.StudioEffectsCatalog.byType(fx.type);
      const blends = (window.StudioEffectsCatalog.BLEND_MODES || [])
        .map((b) => `<option value="${b.id}" ${fx.blendMode === b.id ? "selected" : ""}>${b.name}</option>`)
        .join("");
      const params = (def?.params || []).map((p) => {
        const val = fx.params?.[p.key] ?? p.default;
        return `<label>${p.label}
          <input type="range" data-fxid="${fx.id}" data-pkey="${p.key}"
            min="${p.min}" max="${p.max}" step="${p.step}" value="${val}">
          <span class="fx-val" data-fxval="${fx.id}-${p.key}">${val}${p.unit || ""}</span>
        </label>`;
      }).join("");
      const kfCount = (fx.keyframes || []).length;
      const perf = def?.perf ? `<span class="fx-perf fx-perf-${def.perf}">${def.perf}</span>` : "";
      return `<div class="fx-control-card" data-fxid="${fx.id}">
        <div class="fx-control-head">
          <label class="check"><input type="checkbox" data-toggle="${fx.id}" ${fx.enabled !== false ? "checked" : ""}> ${fx.name || def?.name || fx.type}</label>
          ${perf}
          <div class="fx-control-btns">
            <button type="button" data-up="${fx.id}" title="Subir">↑</button>
            <button type="button" data-down="${fx.id}" title="Bajar">↓</button>
            <button type="button" data-dup="${fx.id}" title="Duplicar">⧉</button>
            <button type="button" data-reset="${fx.id}" title="Restablecer">↺</button>
            <button type="button" data-del="${fx.id}" title="Eliminar">✕</button>
          </div>
        </div>
        <label>Opacidad
          <input type="range" data-fxopacity="${fx.id}" min="0" max="1" step="0.05" value="${fx.opacity ?? 1}">
        </label>
        <label>Modo de fusión
          <select data-fxblend="${fx.id}">${blends}</select>
        </label>
        <div class="fx-params">${params}</div>
        <div class="fx-kf-row">
          <button type="button" data-addkf="${fx.id}">＋ Fotograma clave</button>
          <button type="button" data-delkf="${fx.id}">Eliminar KF cercano</button>
          <small class="muted">${kfCount} KF</small>
        </div>
        <small class="muted">Orden ${index + 1}</small>
      </div>`;
    }).join("");

    box.querySelectorAll("[data-toggle]").forEach((el) => {
      el.addEventListener("change", () => {
        const fx = clip.effects.find((e) => e.id === el.dataset.toggle);
        if (fx) fx.enabled = el.checked;
        a.renderAll();
      });
    });
    box.querySelectorAll("[data-fxopacity]").forEach((el) => {
      el.addEventListener("input", () => {
        const fx = clip.effects.find((e) => e.id === el.dataset.fxopacity);
        if (fx) fx.opacity = Number(el.value);
        a.renderPreview();
      });
      el.addEventListener("change", () => a.renderAll());
    });
    box.querySelectorAll("[data-fxblend]").forEach((el) => {
      el.addEventListener("change", () => {
        const fx = clip.effects.find((e) => e.id === el.dataset.fxblend);
        if (fx) fx.blendMode = el.value;
        a.renderAll();
      });
    });
    box.querySelectorAll("input[type=range][data-fxid]").forEach((el) => {
      el.addEventListener("input", () => {
        const fx = clip.effects.find((e) => e.id === el.dataset.fxid);
        if (!fx) return;
        fx.params[el.dataset.pkey] = Number(el.value);
        const span = box.querySelector(`[data-fxval="${fx.id}-${el.dataset.pkey}"]`);
        const def = window.StudioEffectsCatalog.byType(fx.type);
        const meta = def?.params?.find((p) => p.key === el.dataset.pkey);
        if (span) span.textContent = `${el.value}${meta?.unit || ""}`;
        a.renderPreview();
      });
      el.addEventListener("change", () => a.renderAll());
    });
    box.querySelectorAll("[data-del]").forEach((el) => {
      el.addEventListener("click", () => {
        window.StudioEffects.removeEffect(clip, el.dataset.del);
        a.renderAll();
        refreshControls();
      });
    });
    box.querySelectorAll("[data-dup]").forEach((el) => {
      el.addEventListener("click", () => {
        window.StudioEffects.duplicateEffect(clip, el.dataset.dup);
        a.renderAll();
        refreshControls();
      });
    });
    box.querySelectorAll("[data-reset]").forEach((el) => {
      el.addEventListener("click", () => {
        window.StudioEffects.resetEffect(clip, el.dataset.reset);
        refreshControls();
        a.renderAll();
      });
    });
    box.querySelectorAll("[data-up]").forEach((el) => {
      el.addEventListener("click", () => {
        window.StudioEffects.reorderEffect(clip, el.dataset.up, -1);
        refreshControls();
        a.renderAll();
      });
    });
    box.querySelectorAll("[data-down]").forEach((el) => {
      el.addEventListener("click", () => {
        window.StudioEffects.reorderEffect(clip, el.dataset.down, 1);
        refreshControls();
        a.renderAll();
      });
    });
    box.querySelectorAll("[data-addkf]").forEach((el) => {
      el.addEventListener("click", () => {
        window.StudioEffects.addKeyframe(clip, el.dataset.addkf, a.state.currentTime);
        refreshControls();
        a.setStatus("Fotograma clave añadido en el cabezal.");
      });
    });
    box.querySelectorAll("[data-delkf]").forEach((el) => {
      el.addEventListener("click", () => {
        window.StudioEffects.removeKeyframeNear(clip, el.dataset.delkf, a.state.currentTime);
        refreshControls();
        a.setStatus("Fotograma clave cercano eliminado.");
      });
    });
  }

  function refreshSpeed() {
    const a = app();
    const wrap = $("speedControls");
    const none = $("speedNoClip");
    if (!a || !wrap) return;
    const clip = a.selectedClip();
    if (!videoOk(clip)) {
      wrap.hidden = true;
      if (none) none.hidden = false;
      return;
    }
    if (none) none.hidden = true;
    wrap.hidden = false;
    window.StudioSpeed.ensureClip(clip);
    const pct = Math.round((clip.speed.rate || 1) * 100);
    if ($("speedRateRange")) $("speedRateRange").value = String(pct);
    if ($("speedRateNumber")) $("speedRateNumber").value = String(pct);
    if ($("speedReverse")) $("speedReverse").checked = Boolean(clip.speed.reverse);
    if ($("speedKeepPitch")) $("speedKeepPitch").checked = clip.speed.keepPitch !== false;
    if ($("speedMuteAudio")) $("speedMuteAudio").checked = Boolean(clip.speed.muteAudio);
  }

  function applySpeedPercent(pct) {
    const a = app();
    const clip = a?.selectedClip();
    if (!videoOk(clip)) {
      a?.setStatus("Seleccione un clip de video.");
      return;
    }
    const media = a.mediaById(clip.mediaId);
    const rate = Math.max(0.1, Math.min(8, (Number(pct) || 100) / 100));
    window.StudioSpeed.applyConstantRate(clip, rate, a.state.clips, media?.duration);
    a.renderAll();
    refreshSpeed();
    a.setStatus(`Velocidad: ${Math.round(rate * 100)}% · duración ${clip.duration.toFixed(2)}s`);
  }

  function fillRampSelect() {
    const sel = $("speedRampPreset");
    if (!sel || !window.StudioSpeed) return;
    const presets = window.StudioSpeed.rampPresets();
    const cur = sel.value;
    sel.innerHTML = `<option value="">Sin rampa (velocidad constante)</option>`
      + presets.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
    sel.value = cur || "";
  }

  function wire() {
    renderCategories();
    renderLibrary();
    fillRampSelect();

    $("effectsSearch")?.addEventListener("input", renderLibrary);
    $("effectsViewThumbs")?.addEventListener("click", () => {
      viewMode = "thumbs";
      $("effectsViewThumbs").classList.add("active");
      $("effectsViewList")?.classList.remove("active");
      renderLibrary();
    });
    $("effectsViewList")?.addEventListener("click", () => {
      viewMode = "list";
      $("effectsViewList").classList.add("active");
      $("effectsViewThumbs")?.classList.remove("active");
      renderLibrary();
    });

    $("effectsCopyBtn")?.addEventListener("click", () => {
      const a = app();
      const clip = a?.selectedClip();
      if (!clipOk(clip)) return;
      a.state.effectsClipboard = JSON.parse(JSON.stringify(clip.effects || []));
      a.setStatus("Efectos copiados.");
    });
    $("effectsPasteBtn")?.addEventListener("click", () => {
      const a = app();
      const clip = a?.selectedClip();
      if (!clipOk(clip) || !a.state.effectsClipboard) {
        a?.setStatus("No hay efectos en el portapapeles.");
        return;
      }
      window.StudioEffects.ensureClip(clip);
      clip.effects = JSON.parse(JSON.stringify(a.state.effectsClipboard)).map((e) => ({
        ...e,
        id: `fx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      }));
      a.renderAll();
      refreshControls();
      a.setStatus("Efectos pegados.");
    });
    $("effectsClearBtn")?.addEventListener("click", () => {
      const a = app();
      const clip = a?.selectedClip();
      if (!clipOk(clip)) return;
      clip.effects = [];
      a.renderAll();
      refreshControls();
      a.setStatus("Efectos eliminados del clip.");
    });
    $("effectsCompareToggle")?.addEventListener("change", (e) => {
      const a = app();
      if (!a) return;
      a.state.effectsCompare = e.target.checked;
      a.renderPreview();
      a.setStatus(e.target.checked ? "Comparación: efectos desactivados temporalmente." : "Comparación desactivada.");
    });

    /* Drop sobre timeline / monitor */
    const dropTargets = [document.querySelector(".timeline"), document.querySelector(".program-monitor")];
    dropTargets.forEach((el) => {
      if (!el) return;
      el.addEventListener("dragover", (ev) => {
        if ([...ev.dataTransfer.types].includes("text/studio-fx")) {
          ev.preventDefault();
          ev.dataTransfer.dropEffect = "copy";
        }
      });
      el.addEventListener("drop", (ev) => {
        const type = ev.dataTransfer.getData("text/studio-fx");
        if (!type) return;
        ev.preventDefault();
        applyEffect(type);
      });
    });

    /* Speed */
    document.querySelectorAll("[data-speed]").forEach((btn) => {
      btn.addEventListener("click", () => applySpeedPercent(btn.dataset.speed));
    });
    $("speedRateRange")?.addEventListener("input", () => {
      if ($("speedRateNumber")) $("speedRateNumber").value = $("speedRateRange").value;
    });
    $("speedApplyBtn")?.addEventListener("click", () => {
      applySpeedPercent($("speedRateNumber")?.value || $("speedRateRange")?.value);
    });
    $("speedReverse")?.addEventListener("change", () => {
      const a = app();
      const clip = a?.selectedClip();
      if (!videoOk(clip)) return;
      window.StudioSpeed.setReverse(clip, $("speedReverse").checked);
      a.renderAll();
      a.setStatus(clip.speed.reverse ? "Velocidad inversa activada." : "Velocidad normal.");
    });
    $("speedKeepPitch")?.addEventListener("change", () => {
      const a = app();
      const clip = a?.selectedClip();
      if (!videoOk(clip)) return;
      window.StudioSpeed.setKeepPitch(clip, $("speedKeepPitch").checked);
      a.setStatus(clip.speed.keepPitch
        ? "Mantener tono: el navegador limitará el cambio de pitch cuando sea posible."
        : "El tono seguirá la velocidad (más agudo/grave).");
    });
    $("speedMuteAudio")?.addEventListener("change", () => {
      const a = app();
      const clip = a?.selectedClip();
      if (!videoOk(clip)) return;
      clip.speed.muteAudio = $("speedMuteAudio").checked;
      a.renderAll();
    });
    $("speedRampApplyBtn")?.addEventListener("click", () => {
      const a = app();
      const clip = a?.selectedClip();
      if (!videoOk(clip)) return;
      const id = $("speedRampPreset")?.value;
      const preset = window.StudioSpeed.rampPresets().find((p) => p.id === id);
      if (!preset) {
        a.setStatus("Elija un preset de rampa.");
        return;
      }
      window.StudioSpeed.setRamp(clip, preset.points);
      a.renderAll();
      a.setStatus(`Rampa aplicada: ${preset.name}`);
    });
    $("speedRampClearBtn")?.addEventListener("click", () => {
      const a = app();
      const clip = a?.selectedClip();
      if (!videoOk(clip)) return;
      window.StudioSpeed.setRamp(clip, null);
      a.renderAll();
      a.setStatus("Rampa eliminada.");
    });
    $("freezeAtPlayheadBtn")?.addEventListener("click", () => {
      app()?.insertFreezeAtPlayhead($("freezeDuration")?.value);
    });
    $("freezeExportPngBtn")?.addEventListener("click", () => {
      app()?.exportPlayheadFramePng();
    });

    /* Refresco al cambiar de pestaña / selección */
    document.querySelectorAll(".module-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        setTimeout(() => {
          refreshControls();
          refreshSpeed();
        }, 30);
      });
    });
  }

  window.StudioEffectsUI = {
    refresh() {
      renderLibrary();
      refreshControls();
      refreshSpeed();
    },
    refreshSoft() {
      refreshControls();
      refreshSpeed();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
