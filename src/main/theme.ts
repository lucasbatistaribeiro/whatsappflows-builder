// WhatsApp Flows visual tokens. Two palettes (light default + dark).
//
// Provenance matters here, because "close enough" greens drift: the accent and
// the chat tokens are *measured* off WhatsApp's own surfaces (see the comments
// on each), not picked by eye. Re-measure rather than adjust by taste.
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
  // Chat mode (see knowledge/CHAT_UI.md). Sampled from WhatsApp LLC's own Play
  // Store screenshots — Android, which is what this mocks. The earlier guesses
  // were WhatsApp *Web* values, which is why they were consistently off.
  bubbleIn: string; bubbleOut: string; wallpaper: string; tick: string;
  chatHeader: string; systemPill: string;
}

export const COLOR_LIGHT: Palette = {
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  textPrimary: "#111B21",
  textSecondary: "#667781",
  divider: "#E9EDEF",
  // The accent: the footer CTA, the selected radio/checkbox mark, the progress
  // bar. Measured 2026-10-20 off Meta's own flow renderer — the live preview on
  // the Flows Playground page, with the CTA enabled (it is a translucent grey
  // while the form is incomplete, which is not the colour to sample). #008069,
  // the value before this, is WhatsApp's *older* teal from the classic web
  // header; the current flow UI is this lighter green.
  primary: "#1DAA61", // CTA / accents
  onPrimary: "#FFFFFF",
  link: "#027EB5",
  inputBorder: "#D1D7DB",
  inputBg: "#FFFFFF",
  chipBg: "#F0F2F5",
  chipSelectedBg: "#D9FDD3",
  chipSelectedBorder: "#1DAA61", // same accent as `primary`
  statusBar: "#F7F8FA",
  placeholder: "#8696A0",
  bubbleIn: "#FFFFFF",
  bubbleOut: "#CFFFCF",
  wallpaper: "#F4F1E9",
  tick: "#53BDEB",
  chatHeader: "#FFFFFF", // same as an incoming bubble; the shadow separates them
  systemPill: "#FFEFD1",
};

// WhatsApp dark theme (curated approximations of the real tokens).
export const COLOR_DARK: Palette = {
  bg: "#111B21",
  surface: "#1F2C34",
  textPrimary: "#E9EDEF",
  textSecondary: "#8696A0",
  divider: "#2A3942",
  primary: "#21C063", // same source as light, with the Playground set to dark
  onPrimary: "#111B21",
  link: "#53BDEB",
  inputBorder: "#2A3942",
  inputBg: "#1F2C34",
  chipBg: "#2A3942",
  chipSelectedBg: "#0B3D2E",
  chipSelectedBorder: "#21C063", // same accent as `primary`
  statusBar: "#1F2C34",
  placeholder: "#8696A0",
  bubbleIn: "#1D272B",
  bubbleOut: "#004F37",
  wallpaper: "#091015",
  tick: "#53BDEB", // the read tick keeps the same blue in both themes
  chatHeader: "#091015", // measured the same as the wallpaper (edge-to-edge header)
  systemPill: "#182229", // not visible in the sampled screenshot — still a guess
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

// Figma's RGB / SolidPaint named structurally rather than through the plugin
// typings. The preview imports this module for the palette (one source of
// tokens for the generator and the mockup), and the UI compiles without the
// Figma globals — see build/tsconfig.ui.json. Both shapes are assignable to the
// real `RGB` / `Paint`, so `node.fills = [fill(x)]` still typechecks in src/main.
export interface Rgb { r: number; g: number; b: number }
export interface SolidFill { type: "SOLID"; color: Rgb }

// hex "#RRGGBB" -> Figma RGB (0..1)
export function rgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

export function fill(hex: string): SolidFill {
  return { type: "SOLID", color: rgb(hex) };
}
