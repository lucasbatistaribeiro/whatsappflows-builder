// WhatsApp Flows visual tokens (light theme). Tweak here to restyle every screen.

export const DEVICE = { width: 360, height: 780 };

// Standard Android phone heights (dp, at the 360dp width) used as the *minimum*
// height of a generated screen so short flows don't collapse to a tiny frame.
// Content taller than this still grows the frame.
export const SCREEN_HEIGHTS: Record<"sm" | "md" | "lg", number> = { sm: 640, md: 800, lg: 915 };

export const COLOR = {
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
};

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
