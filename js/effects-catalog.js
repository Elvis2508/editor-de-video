/**
 * Catálogo de efectos reales (Fase 1+). Solo tipos implementados en effects-engine.js.
 */
(function (global) {
  const PARAM = (key, label, min, max, step, def, unit) => ({
    key, label, min, max, step, default: def, unit: unit || ""
  });

  const EFFECTS = [
    {
      type: "blur",
      name: "Desenfoque gaussiano",
      category: "Desenfoque y enfoque",
      tags: ["blur", "desenfoque"],
      css: true,
      params: [PARAM("amount", "Intensidad", 0, 20, 0.5, 4, "px")]
    },
    {
      type: "sharpen",
      name: "Nitidez / Claridad",
      category: "Desenfoque y enfoque",
      tags: ["nitidez", "enfoque"],
      css: true,
      params: [
        PARAM("amount", "Cantidad", 0, 2, 0.05, 0.6),
        PARAM("contrastBoost", "Contraste bordes", 0, 1, 0.05, 0.2)
      ]
    },
    {
      type: "vignette",
      name: "Viñeta",
      category: "Iluminación",
      tags: ["viñeta", "cine"],
      pixel: true,
      params: [
        PARAM("intensity", "Intensidad", 0, 1, 0.05, 0.55),
        PARAM("size", "Punto medio", 0.2, 1.2, 0.05, 0.65),
        PARAM("softness", "Suavidad", 0.1, 1, 0.05, 0.45),
        PARAM("brightness", "Claridad (neg=oscura)", -1, 1, 0.05, -1)
      ]
    },
    {
      type: "glow",
      name: "Resplandor",
      category: "Iluminación",
      tags: ["glow", "resplandor"],
      css: true,
      params: [
        PARAM("amount", "Intensidad", 0, 1, 0.05, 0.45),
        PARAM("radius", "Radio", 0, 24, 1, 8, "px")
      ]
    },
    {
      type: "bw",
      name: "Blanco y negro",
      category: "FX",
      tags: ["bn", "gris"],
      css: true,
      params: [PARAM("amount", "Intensidad", 0, 1, 0.05, 1)]
    },
    {
      type: "sepia",
      name: "Sepia",
      category: "FX",
      tags: ["vintage"],
      css: true,
      params: [PARAM("amount", "Intensidad", 0, 1, 0.05, 0.7)]
    },
    {
      type: "vintage",
      name: "Vintage",
      category: "FX",
      tags: ["cine", "retro"],
      css: true,
      pixel: true,
      params: [
        PARAM("amount", "Intensidad", 0, 1, 0.05, 0.7),
        PARAM("grain", "Grano", 0, 1, 0.05, 0.25)
      ]
    },
    {
      type: "highcontrast",
      name: "Alto contraste",
      category: "Estilización",
      tags: ["contraste"],
      css: true,
      params: [PARAM("amount", "Intensidad", 0, 1, 0.05, 0.55)]
    },
    {
      type: "cold",
      name: "Frío",
      category: "Corrección",
      tags: ["azul", "temperatura"],
      css: true,
      params: [PARAM("amount", "Intensidad", 0, 1, 0.05, 0.45)]
    },
    {
      type: "warm",
      name: "Cálido",
      category: "Corrección",
      tags: ["naranja", "temperatura"],
      css: true,
      params: [PARAM("amount", "Intensidad", 0, 1, 0.05, 0.45)]
    },
    {
      type: "grain",
      name: "Grano de película",
      category: "FX",
      tags: ["ruido", "film"],
      pixel: true,
      params: [
        PARAM("amount", "Intensidad", 0, 1, 0.05, 0.35),
        PARAM("size", "Tamaño", 1, 4, 0.5, 1.5)
      ]
    },
    {
      type: "pixelate",
      name: "Pixelado / Mosaico",
      category: "FX",
      tags: ["pixel", "mosaico"],
      pixel: true,
      params: [PARAM("block", "Tamaño bloque", 2, 48, 1, 12, "px")]
    },
    {
      type: "posterize",
      name: "Posterización",
      category: "Estilización",
      tags: ["poster"],
      pixel: true,
      params: [PARAM("levels", "Niveles", 2, 16, 1, 6)]
    },
    {
      type: "rgbsplit",
      name: "RGB Split",
      category: "VFX",
      tags: ["glitch", "aberración"],
      pixel: true,
      params: [PARAM("amount", "Separación", 0, 20, 1, 4, "px")]
    },
    {
      type: "scanlines",
      name: "Scanlines",
      category: "FX",
      tags: ["vhs", "crt"],
      pixel: true,
      params: [
        PARAM("amount", "Opacidad", 0, 1, 0.05, 0.35),
        PARAM("gap", "Espaciado", 2, 8, 1, 3, "px")
      ]
    },
    {
      type: "glitch",
      name: "Glitch digital",
      category: "VFX",
      tags: ["distorsión"],
      pixel: true,
      params: [
        PARAM("amount", "Intensidad", 0, 1, 0.05, 0.35),
        PARAM("slices", "Franjas", 2, 16, 1, 6)
      ]
    },
    {
      type: "shadow",
      name: "Sombra suave",
      category: "Estilización",
      tags: ["sombra"],
      css: true,
      params: [
        PARAM("opacity", "Opacidad", 0, 1, 0.05, 0.45),
        PARAM("blur", "Desenfoque", 0, 30, 1, 12, "px"),
        PARAM("distance", "Distancia", 0, 40, 1, 8, "px")
      ]
    },
    {
      type: "kenburns",
      name: "Zoom Ken Burns",
      category: "Movimiento",
      tags: ["zoom", "paneo"],
      transform: true,
      params: [
        PARAM("scaleStart", "Escala inicial", 1, 2.5, 0.05, 1),
        PARAM("scaleEnd", "Escala final", 1, 2.5, 0.05, 1.35),
        PARAM("xStart", "X inicial", -400, 400, 5, 0),
        PARAM("yStart", "Y inicial", -300, 300, 5, 0),
        PARAM("xEnd", "X final", -400, 400, 5, 40),
        PARAM("yEnd", "Y final", -300, 300, 5, -20)
      ]
    },
    {
      type: "pan",
      name: "Paneo horizontal",
      category: "Movimiento y desenfoque",
      tags: ["pan", "recorrido"],
      transform: true,
      perf: "realtime",
      params: [
        PARAM("xStart", "X inicial", -500, 500, 5, -120),
        PARAM("xEnd", "X final", -500, 500, 5, 120),
        PARAM("y", "Y", -300, 300, 5, 0),
        PARAM("scale", "Escala", 1, 2, 0.05, 1.15)
      ]
    },
    {
      type: "directionalblur",
      name: "Desenfoque direccional",
      category: "Movimiento y desenfoque",
      tags: ["motion", "dirección"],
      pixel: true,
      perf: "medium",
      params: [
        PARAM("amount", "Intensidad", 0, 1, 0.05, 0.55),
        PARAM("length", "Longitud", 1, 40, 1, 12, "px"),
        PARAM("angle", "Ángulo", 0, 360, 1, 0, "°"),
        PARAM("samples", "Muestras", 3, 16, 1, 8)
      ]
    },
    {
      type: "zoomblur",
      name: "Desenfoque zoom",
      category: "Movimiento y desenfoque",
      tags: ["zoom", "radial"],
      pixel: true,
      perf: "medium",
      params: [
        PARAM("amount", "Intensidad", 0, 1, 0.05, 0.45),
        PARAM("centerX", "Centro X", 0, 1, 0.01, 0.5),
        PARAM("centerY", "Centro Y", 0, 1, 0.01, 0.5),
        PARAM("samples", "Muestras", 3, 16, 1, 8)
      ]
    },
    {
      type: "radialblur",
      name: "Desenfoque radial",
      category: "Movimiento y desenfoque",
      tags: ["spin", "giro"],
      pixel: true,
      perf: "medium",
      params: [
        PARAM("amount", "Giro", 0, 1, 0.05, 0.4),
        PARAM("centerX", "Centro X", 0, 1, 0.01, 0.5),
        PARAM("centerY", "Centro Y", 0, 1, 0.01, 0.5),
        PARAM("samples", "Muestras", 3, 16, 1, 8)
      ]
    },
    {
      type: "camerashake",
      name: "Temblor de cámara",
      category: "Movimiento y desenfoque",
      tags: ["shake", "mano"],
      transform: true,
      perf: "realtime",
      params: [
        PARAM("intensity", "Intensidad", 0, 80, 1, 18),
        PARAM("frequency", "Frecuencia", 1, 40, 1, 12),
        PARAM("rotation", "Rotación", 0, 8, 0.1, 1.5, "°"),
        PARAM("seed", "Semilla", 0, 100, 1, 7)
      ]
    },
    {
      type: "lightrays",
      name: "Rayos de luz",
      category: "Luz y destellos",
      tags: ["rays", "luz"],
      pixel: true,
      perf: "medium",
      params: [
        PARAM("intensity", "Intensidad", 0, 1, 0.05, 0.45),
        PARAM("length", "Longitud", 0.1, 1, 0.05, 0.55),
        PARAM("angle", "Ángulo", 0, 360, 1, 45, "°"),
        PARAM("threshold", "Umbral", 0, 1, 0.05, 0.55)
      ]
    },
    {
      type: "lensflare",
      name: "Destello de lente",
      category: "Luz y destellos",
      tags: ["flare", "lens"],
      pixel: true,
      perf: "realtime",
      params: [
        PARAM("x", "Posición X", 0, 1, 0.01, 0.7),
        PARAM("y", "Posición Y", 0, 1, 0.01, 0.3),
        PARAM("brightness", "Brillo", 0, 1, 0.05, 0.7),
        PARAM("size", "Tamaño", 0.1, 1, 0.05, 0.45)
      ]
    },
    {
      type: "filmdamage",
      name: "Desgaste de película",
      category: "Texturas",
      tags: ["damage", "rayas", "polvo"],
      pixel: true,
      perf: "medium",
      params: [
        PARAM("amount", "Intensidad", 0, 1, 0.05, 0.4),
        PARAM("scratches", "Rayas", 0, 1, 0.05, 0.35),
        PARAM("dust", "Polvo", 0, 1, 0.05, 0.3),
        PARAM("flicker", "Parpadeo", 0, 1, 0.05, 0.2)
      ]
    },
    {
      type: "halftone",
      name: "Mediotono",
      category: "Estilización",
      tags: ["halftone", "puntos"],
      pixel: true,
      perf: "heavy",
      params: [
        PARAM("size", "Tamaño punto", 2, 16, 1, 6, "px"),
        PARAM("contrast", "Contraste", 0.5, 2, 0.05, 1.2),
        PARAM("angle", "Ángulo", 0, 90, 1, 45, "°")
      ]
    },
    {
      type: "deband",
      name: "Reducción de banding",
      category: "Restauración",
      tags: ["deband", "dither"],
      pixel: true,
      perf: "medium",
      params: [
        PARAM("amount", "Intensidad", 0, 1, 0.05, 0.35),
        PARAM("dither", "Dithering", 0, 1, 0.05, 0.45)
      ]
    },
    {
      type: "lensdistort",
      name: "Distorsión de lente",
      category: "Corrección óptica",
      tags: ["barril", "cojín", "lente"],
      pixel: true,
      perf: "heavy",
      params: [
        PARAM("amount", "Distorsión (+barril/-cojín)", -1, 1, 0.05, 0.25),
        PARAM("scale", "Escala", 0.8, 1.4, 0.01, 1.05),
        PARAM("chroma", "Aberración cromática", 0, 1, 0.05, 0.15)
      ]
    },
    {
      type: "blankingfill",
      name: "Relleno de bordes",
      category: "Corrección óptica",
      tags: ["letterbox", "relleno", "fondo"],
      pixel: true,
      perf: "medium",
      params: [
        PARAM("blur", "Desenfoque fondo", 0, 40, 1, 18, "px"),
        PARAM("darken", "Oscurecer fondo", 0, 1, 0.05, 0.35),
        PARAM("scale", "Escala contenido", 0.5, 1, 0.01, 0.82)
      ]
    },
    {
      type: "softlight",
      name: "Iluminación virtual suave",
      category: "Luz y destellos",
      tags: ["luz", "relleno"],
      pixel: true,
      perf: "realtime",
      params: [
        PARAM("intensity", "Intensidad", 0, 1, 0.05, 0.4),
        PARAM("x", "Posición X", 0, 1, 0.01, 0.3),
        PARAM("y", "Posición Y", 0, 1, 0.01, 0.25),
        PARAM("radius", "Radio", 0.2, 1.5, 0.05, 0.7),
        PARAM("temperature", "Temperatura (-frío/+cálido)", -1, 1, 0.05, 0.2)
      ]
    }
  ];

  const CATEGORIES = [
    "Favoritos",
    "Recientes",
    "Movimiento y desenfoque",
    "Luz y destellos",
    "Estilización",
    "Texturas",
    "Restauración",
    "Corrección óptica",
    "Corrección",
    "Desenfoque y enfoque",
    "Iluminación",
    "Movimiento",
    "FX",
    "VFX",
    "Presets"
  ];

  const PRESETS = [
    { id: "preset-cine", name: "Look cine", effects: [{ type: "vintage", params: { amount: 0.55, grain: 0.2 } }, { type: "vignette", params: { intensity: 0.5, size: 0.7, softness: 0.5, brightness: -1 } }] },
    { id: "preset-drama", name: "Dramático", effects: [{ type: "highcontrast", params: { amount: 0.7 } }, { type: "vignette", params: { intensity: 0.65, size: 0.55, softness: 0.4, brightness: -1 } }] },
    { id: "preset-vhs", name: "VHS", effects: [{ type: "scanlines", params: { amount: 0.4, gap: 3 } }, { type: "rgbsplit", params: { amount: 3 } }, { type: "grain", params: { amount: 0.3, size: 1.5 } }] },
    { id: "preset-night", name: "Noche", effects: [{ type: "cold", params: { amount: 0.55 } }, { type: "grain", params: { amount: 0.4, size: 2 } }] },
    { id: "preset-action", name: "Acción (temblor)", effects: [{ type: "camerashake", params: { intensity: 28, frequency: 16, rotation: 2.2, seed: 3 } }, { type: "directionalblur", params: { amount: 0.35, length: 10, angle: 15, samples: 6 } }] },
    { id: "preset-dream", name: "Ensueño", effects: [{ type: "glow", params: { amount: 0.55, radius: 14 } }, { type: "softlight", params: { intensity: 0.35, x: 0.4, y: 0.3, radius: 0.8, temperature: 0.3 } }] },
    { id: "preset-handheld", name: "Cámara en mano", effects: [{ type: "camerashake", params: { intensity: 14, frequency: 9, rotation: 1.2, seed: 11 } }] }
  ];

  const BLEND_MODES = [
    { id: "normal", name: "Normal" },
    { id: "multiply", name: "Multiplicar" },
    { id: "screen", name: "Trama" },
    { id: "overlay", name: "Superponer" },
    { id: "soft-light", name: "Luz suave" },
    { id: "hard-light", name: "Luz fuerte" },
    { id: "lighten", name: "Aclarar" },
    { id: "darken", name: "Oscurecer" },
    { id: "difference", name: "Diferencia" },
    { id: "exclusion", name: "Exclusión" },
    { id: "color", name: "Color" },
    { id: "luminosity", name: "Luminosidad" }
  ];

  global.StudioEffectsCatalog = {
    EFFECTS,
    CATEGORIES,
    PRESETS,
    BLEND_MODES,
    byType(type) {
      return EFFECTS.find((e) => e.type === type) || null;
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
