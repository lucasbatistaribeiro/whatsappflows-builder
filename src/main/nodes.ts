// Thin helpers over the Figma node API used by every component renderer.
import { COLOR, fill } from "./theme";
import { FONT } from "./fonts";

interface TextOpts {
  font?: FontName;
  size?: number;
  color?: string;
  lineHeight?: number;
  width?: number; // fixed width -> wraps
}

export function text(chars: string, opts: TextOpts = {}): TextNode {
  const t = figma.createText();
  t.fontName = opts.font ?? FONT.regular;
  t.characters = chars;
  t.fontSize = opts.size ?? 15;
  t.fills = [fill(opts.color ?? COLOR.textPrimary)];
  if (opts.lineHeight) t.lineHeight = { value: opts.lineHeight, unit: "PIXELS" };
  if (opts.width !== undefined) {
    t.textAutoResize = "HEIGHT";
    t.resize(opts.width, t.height);
  } else {
    t.textAutoResize = "WIDTH_AND_HEIGHT";
  }
  return t;
}

type Axis = "VERTICAL" | "HORIZONTAL";

interface FrameOpts {
  name?: string;
  axis?: Axis;
  gap?: number;
  padding?: number | [number, number, number, number]; // t,r,b,l
  bg?: string;
  radius?: number;
  align?: "MIN" | "CENTER" | "MAX";
  counterAlign?: "MIN" | "CENTER" | "MAX";
  width?: number;
  height?: number;
}

export function autoFrame(opts: FrameOpts = {}): FrameNode {
  const f = figma.createFrame();
  f.name = opts.name ?? "Frame";
  f.layoutMode = opts.axis ?? "VERTICAL";
  f.itemSpacing = opts.gap ?? 0;
  f.primaryAxisSizingMode = "AUTO";
  f.counterAxisSizingMode = "AUTO";
  if (opts.align) f.primaryAxisAlignItems = opts.align;
  if (opts.counterAlign) f.counterAxisAlignItems = opts.counterAlign;

  const p = opts.padding;
  if (Array.isArray(p)) {
    [f.paddingTop, f.paddingRight, f.paddingBottom, f.paddingLeft] = p;
  } else if (typeof p === "number") {
    f.paddingTop = f.paddingRight = f.paddingBottom = f.paddingLeft = p;
  }

  f.fills = opts.bg ? [fill(opts.bg)] : [];
  if (opts.radius) f.cornerRadius = opts.radius;

  // Fix the requested pixel dimensions, respecting which axis is primary.
  const horizontal = (opts.axis ?? "VERTICAL") === "HORIZONTAL";
  if (opts.width !== undefined) {
    if (horizontal) f.primaryAxisSizingMode = "FIXED";
    else f.counterAxisSizingMode = "FIXED";
  }
  if (opts.height !== undefined) {
    if (horizontal) f.counterAxisSizingMode = "FIXED";
    else f.primaryAxisSizingMode = "FIXED";
  }
  if (opts.width !== undefined || opts.height !== undefined) {
    f.resize(opts.width ?? (f.width || 1), opts.height ?? (f.height || 1));
  }
  return f;
}

// Make a child stretch across the container's counter axis (full width in a column).
export function fillWidth(node: SceneNode & LayoutMixin): void {
  node.layoutAlign = "STRETCH";
}

// Make a child grow along the container's main axis (fill remaining space).
export function grow(node: SceneNode & LayoutMixin): void {
  node.layoutGrow = 1;
}

export function divider(): RectangleNode {
  const r = figma.createRectangle();
  r.name = "divider";
  r.resize(1, 1);
  r.fills = [fill(COLOR.divider)];
  r.layoutAlign = "STRETCH";
  return r;
}

export function strokedBox(opts: {
  radius?: number;
  strokeColor?: string;
  bg?: string;
  padding?: number | [number, number, number, number];
  gap?: number;
  axis?: Axis;
}): FrameNode {
  const f = autoFrame({
    axis: opts.axis ?? "VERTICAL",
    gap: opts.gap ?? 0,
    padding: opts.padding,
    bg: opts.bg ?? COLOR.inputBg,
    radius: opts.radius,
  });
  f.strokes = [fill(opts.strokeColor ?? COLOR.inputBorder)];
  f.strokeWeight = 1;
  return f;
}
