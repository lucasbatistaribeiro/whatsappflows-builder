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

// Auto-layout "Fill container" is applied in a second pass (applyFills) once the
// whole tree is assembled, because layoutSizingHorizontal/Vertical requires the
// node to already be inside an auto-layout parent whose own sizing isn't "hug".
// We just mark intent here; applyFills resolves it top-down.
const FILL_H = new WeakSet<SceneNode>();
const FILL_V = new WeakSet<SceneNode>();

export function markFill<T extends SceneNode>(node: T): T { FILL_H.add(node); return node; }
export function markFillV<T extends SceneNode>(node: T): T { FILL_V.add(node); return node; }

// Back-compat: "fill width" = fill the horizontal axis.
export function fillWidth(node: SceneNode): void { FILL_H.add(node); }

// Pre-order walk: a parent is sized before its children, so a FILL child always
// sees a non-hug parent. Failures are swallowed so one node can't abort a screen.
export function applyFills(root: SceneNode): void {
  const set = (n: SceneNode) => {
    if (FILL_H.has(n)) { try { (n as SceneNode & { layoutSizingHorizontal?: string }).layoutSizingHorizontal = "FILL"; } catch { /* not fillable */ } }
    if (FILL_V.has(n)) { try { (n as SceneNode & { layoutSizingVertical?: string }).layoutSizingVertical = "FILL"; } catch { /* not fillable */ } }
    if ("children" in n) for (const c of (n as ChildrenMixin & SceneNode).children) set(c);
  };
  set(root);
}

export function divider(): RectangleNode {
  const r = figma.createRectangle();
  r.name = "divider";
  r.resize(1, 1);
  r.fills = [fill(COLOR.divider)];
  FILL_H.add(r);
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
