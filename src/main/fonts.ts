// Font loading. WhatsApp uses the system font; Inter is a good, always-available
// proxy in Figma. We load the weights we need up front before setting any text.

export const FONT = {
  regular: { family: "Inter", style: "Regular" } as FontName,
  medium: { family: "Inter", style: "Medium" } as FontName,
  semibold: { family: "Inter", style: "Semi Bold" } as FontName,
  bold: { family: "Inter", style: "Bold" } as FontName,
};

export async function loadFonts(): Promise<void> {
  await Promise.all(Object.values(FONT).map((f) => figma.loadFontAsync(f)));
}
