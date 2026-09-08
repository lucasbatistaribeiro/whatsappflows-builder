// WhatsApp Flows visual tokens. Two curated palettes (light default + dark).
// `COLOR` is a live view of the active palette — call setPalette() before a
// render to switch. Consumers read COLOR.* at call time (never bake at load),
// so a single proxy keeps the whole generator/preview theme-aware.

export const DEVICE = { width: 360, height: 780 };

// Standard Android phone heights (dp, at the 360dp width) used as the *minimum*
// height of a generated screen so short flows don't collapse to a tiny frame.
// Content taller than this still grows the frame.
export const SCREEN_HEIGHTS: Record<"sm" | "md" | "lg", number> = { sm: 640, md: 800, lg: 915 };

export interface Palette {
  bg: string; surface: string; textPrimary: string; textSecondary: string;
  divider: string; primary: string; onPrimary: string; link: string;
  inputBorder: string; inputBg: string; chipBg: string; chipSelectedBg: string;
  chipSelectedBorder: string; statusBar: string; placeholder: string;
  // Chat mode (see knowledge/CHAT_UI.md). Unconfirmed until calibrated against a
  // real screenshot — treat as starting values, like the dark palette below.
  bubbleIn: string; bubbleOut: string; wallpaper: string; tick: string;
  chatHeader: string; systemPill: string;
}

export const COLOR_LIGHT: Palette = {
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  textPrimary: "#111B21",
  textSecondary: "#667781",
  divider: "#E9EDEF",
  primary: "#008069", // CTA / accents
  onPrimary: "#FFFFFF",
  link: "#027EB5",
  inputBorder: "#D1D7DB",
  inputBg: "#FFFFFF",
  chipBg: "#F0F2F5",
  chipSelectedBg: "#D9FDD3",
  chipSelectedBorder: "#008069",
  statusBar: "#F7F8FA",
  placeholder: "#8696A0",
  bubbleIn: "#FFFFFF",
  bubbleOut: "#D9FDD3", // same green as chipSelectedBg above
  wallpaper: "#EFEAE2",
  tick: "#53BDEB",
  chatHeader: "#F0F2F5",
  systemPill: "#FFEECC",
};

// WhatsApp dark theme (curated approximations of the real tokens).
export const COLOR_DARK: Palette = {
  bg: "#111B21",
  surface: "#1F2C34",
  textPrimary: "#E9EDEF",
  textSecondary: "#8696A0",
  divider: "#2A3942",
  primary: "#00A884",
  onPrimary: "#111B21",
  link: "#53BDEB",
  inputBorder: "#2A3942",
  inputBg: "#1F2C34",
  chipBg: "#2A3942",
  chipSelectedBg: "#0B3D2E",
  chipSelectedBorder: "#00A884",
  statusBar: "#1F2C34",
  placeholder: "#8696A0",
  bubbleIn: "#202C33",
  bubbleOut: "#005C4B",
  wallpaper: "#0B141A",
  tick: "#53BDEB", // the read tick keeps the same blue in both themes
  chatHeader: "#202C33",
  systemPill: "#182229",
};

let active: Palette = COLOR_LIGHT; // light is always the default

export function setPalette(theme: "light" | "dark"): void {
  active = theme === "dark" ? COLOR_DARK : COLOR_LIGHT;
}

// Live view of the active palette: `COLOR.bg` always reflects the current theme
// at access time, so no call site needs to change to become theme-aware.
export const COLOR: Palette = new Proxy({} as Palette, {
  get: (_t, prop: string) => active[prop as keyof Palette],
}) as Palette;

export const RADIUS = { input: 8, button: 24, chip: 16, card: 12 };

export const SPACE = { screenPad: 16, gap: 16, gapSm: 8, gapXs: 4 };

// hex "#RRGGBB" -> Figma RGB (0..1)
export function rgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

export function fill(hex: string): SolidPaint {
  return { type: "SOLID", color: rgb(hex) };
}
