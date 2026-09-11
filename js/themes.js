/**
 * Theme definitions and application logic.
 */
window.Themes = (() => {
  const DEFAULT_CUSTOM = ["#ff78b2", "#f472b6", "#e4f0fa", "#ffffff"];

  const PRESETS = {
    "dark-cyber": {
      id: "dark-cyber",
      label: "Dark Cyber",
      vars: {
        "--bg": "#05070c",
        "--bg-elevated": "#0c111a",
        "--bg-panel": "#0f1623",
        "--bg-hover": "#162033",
        "--border": "#1e2a3d",
        "--text": "#e8eef8",
        "--text-muted": "#8b9bb4",
        "--accent": "#3b9eff",
        "--accent-2": "#00e5ff",
        "--accent-soft": "rgba(59, 158, 255, 0.15)",
        "--danger": "#ff5c7a",
        "--success": "#2ee59d",
        "--otp": "#00e5ff",
        "--link-badge": "#7c5cff",
        "--glow": "rgba(59, 158, 255, 0.35)",
        "--grid": "rgba(59, 158, 255, 0.04)",
        "--modal-scrim": "rgba(2, 4, 10, 0.78)",
      },
    },
    "velvet-rose": {
      id: "velvet-rose",
      label: "Velvet Rose",
      vars: {
        "--bg": "#120e14",
        "--bg-elevated": "#1a141c",
        "--bg-panel": "#211820",
        "--bg-hover": "#2c2130",
        "--border": "#3a2c3a",
        "--text": "#f5e9f0",
        "--text-muted": "#b89aaa",
        "--accent": "#f4a4c0",
        "--accent-2": "#c9a0ff",
        "--accent-soft": "rgba(244, 164, 192, 0.16)",
        "--danger": "#ff6b8a",
        "--success": "#9be7c4",
        "--otp": "#f4a4c0",
        "--link-badge": "#c9a0ff",
        "--glow": "rgba(201, 160, 255, 0.3)",
        "--grid": "rgba(244, 164, 192, 0.05)",
        "--modal-scrim": "rgba(10, 6, 12, 0.8)",
      },
    },
    "oled-minimal": {
      id: "oled-minimal",
      label: "Pure OLED Minimalist",
      vars: {
        "--bg": "#000000",
        "--bg-elevated": "#0a0a0a",
        "--bg-panel": "#111111",
        "--bg-hover": "#1a1a1a",
        "--border": "#2a2a2a",
        "--text": "#f5f5f5",
        "--text-muted": "#888888",
        "--accent": "#ffffff",
        "--accent-2": "#cccccc",
        "--accent-soft": "rgba(255, 255, 255, 0.08)",
        "--danger": "#ff5555",
        "--success": "#55ff99",
        "--otp": "#ffffff",
        "--link-badge": "#aaaaaa",
        "--glow": "rgba(255, 255, 255, 0.12)",
        "--grid": "rgba(255, 255, 255, 0.03)",
        "--modal-scrim": "rgba(0, 0, 0, 0.85)",
      },
    },
    custom: {
      id: "custom",
      label: "Custom Palette",
      vars: null,
    },
  };

  function hexToRgb(hex) {
    const h = String(hex || "")
      .replace("#", "")
      .trim();
    const full =
      h.length === 3
        ? h
            .split("")
            .map((c) => c + c)
            .join("")
        : h;
    const n = parseInt(full, 16);
    if (Number.isNaN(n) || full.length !== 6) return null;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function normalizeHex(raw) {
    if (!raw || typeof raw !== "string") return null;
    let h = raw.trim();
    if (!h.startsWith("#")) h = `#${h}`;
    const m = h.match(/^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/);
    if (!m) return null;
    if (m[1].length === 3) {
      return `#${m[1]
        .split("")
        .map((c) => c + c)
        .join("")
        .toLowerCase()}`;
    }
    return `#${m[1].toLowerCase()}`;
  }

  function isLight(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return false;
    const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return lum > 0.55;
  }

  function rgba(hex, a) {
    const rgb = hexToRgb(hex);
    if (!rgb) return `rgba(0,0,0,${a})`;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
  }

  /**
   * Palette order (Custom UI):
   * [primary, secondary, background, surface]
   */
  function buildCustomVars(palette) {
    const [
      primary = DEFAULT_CUSTOM[0],
      secondary = DEFAULT_CUSTOM[1],
      background = DEFAULT_CUSTOM[2],
      surface = DEFAULT_CUSTOM[3],
    ] = palette || DEFAULT_CUSTOM;

    const text = isLight(background) ? "#0f172a" : "#f8fafc";
    const muted = isLight(background)
      ? "rgba(15, 23, 42, 0.58)"
      : "rgba(248, 250, 252, 0.58)";
    const border = isLight(background)
      ? "rgba(15, 23, 42, 0.12)"
      : "rgba(248, 250, 252, 0.14)";

    return {
      "--bg": background,
      "--bg-elevated": surface,
      "--bg-panel": surface,
      "--bg-hover": rgba(primary, isLight(surface) ? 0.12 : 0.22),
      "--border": border,
      "--text": text,
      "--text-muted": muted,
      "--accent": primary,
      "--accent-2": secondary,
      "--accent-soft": rgba(primary, 0.18),
      "--danger": "#ff5c7a",
      "--success": "#2ee59d",
      "--otp": primary,
      "--link-badge": secondary,
      "--glow": rgba(primary, 0.35),
      "--grid": rgba(primary, 0.05),
      "--modal-scrim": rgba(background, 0.82),
    };
  }

  /** Parse " #abc123 #def456 ..." or Color Hunt URL ending in /hex1hex2hex3hex4 */
  function parsePaletteInput(raw) {
    if (!raw || typeof raw !== "string") return null;
    const trimmed = raw.trim();

    const hunt = trimmed.match(
      /colorhunt\.co\/palette\/([a-fA-F0-9]{24})/i
    );
    if (hunt) {
      return hunt[1].match(/.{6}/g).map((h) => `#${h.toLowerCase()}`);
    }

    const codes = trimmed.match(/#?[a-fA-F0-9]{6}|#?[a-fA-F0-9]{3}/g);
    if (!codes || codes.length < 4) return null;
    return codes
      .slice(0, 4)
      .map((c) => normalizeHex(c))
      .filter(Boolean);
  }

  function applyVars(vars) {
    const root = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  }

  function getSavedCustomPalette() {
    try {
      const raw = localStorage.getItem(APP_CONFIG.customPaletteKey);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!Array.isArray(parsed) || parsed.length < 4) return null;
      return parsed.slice(0, 4).map((c) => normalizeHex(c) || c);
    } catch {
      return null;
    }
  }

  function saveCustomPalette(palette) {
    localStorage.setItem(APP_CONFIG.customPaletteKey, JSON.stringify(palette));
  }

  function getActiveId() {
    return localStorage.getItem(APP_CONFIG.themeKey) || "dark-cyber";
  }

  function defaultCustomPalette() {
    return getSavedCustomPalette() || [...DEFAULT_CUSTOM];
  }

  /** Apply visually without writing localStorage (live preview). */
  function preview(themeId, customPalette) {
    const id = themeId || getActiveId();
    document.body.dataset.theme = id;

    if (id === "custom") {
      const palette = customPalette || defaultCustomPalette();
      applyVars(buildCustomVars(palette));
      return { id, palette };
    }

    const preset = PRESETS[id] || PRESETS["dark-cyber"];
    applyVars(preset.vars);
    return { id };
  }

  /** Apply and persist. */
  function apply(themeId, customPalette) {
    const result = preview(themeId, customPalette);
    localStorage.setItem(APP_CONFIG.themeKey, result.id);
    if (result.id === "custom") {
      saveCustomPalette(result.palette || defaultCustomPalette());
    }
    return result;
  }

  function list() {
    return Object.values(PRESETS).map(({ id, label }) => ({ id, label }));
  }

  return {
    PRESETS,
    DEFAULT_CUSTOM,
    list,
    apply,
    preview,
    getActiveId,
    parsePaletteInput,
    normalizeHex,
    getSavedCustomPalette,
    saveCustomPalette,
    defaultCustomPalette,
    buildCustomVars,
  };
})();
