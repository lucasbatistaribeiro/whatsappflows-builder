// Renders a single Flow JSON component into a WhatsApp-styled Figma node.
// Footer is handled by the screen assembler, not here.
import type { Component, DataSourceItem } from "../model/flowTypes";
import { COLOR, RADIUS, SPACE, fill } from "./theme";
import { FONT } from "./fonts";
import { autoFrame, text, strokedBox } from "./nodes";

function stretch(node: SceneNode & LayoutMixin): void {
  node.layoutAlign = "STRETCH";
}

// Text that wraps to the container width instead of hugging its content.
function para(chars: string, opts: Parameters<typeof text>[1] = {}): TextNode {
  const t = text(chars, opts);
  t.textAutoResize = "HEIGHT";
  t.layoutAlign = "STRETCH";
  return t;
}

function label(chars: string): TextNode {
  return para(chars, { font: FONT.medium, size: 13, color: COLOR.textSecondary });
}

function helper(chars: string): TextNode {
  return para(chars, { size: 12, color: COLOR.textSecondary });
}

// A labelled field: label on top, a control box, optional helper text.
function field(labelText: string, control: SceneNode, helperText?: string): FrameNode {
  const wrap = autoFrame({ gap: SPACE.gapXs });
  stretch(wrap);
  if (labelText) wrap.appendChild(label(labelText));
  wrap.appendChild(control);
  if (helperText) wrap.appendChild(helper(helperText));
  return wrap;
}

function inputBox(placeholder: string, height = 48, trailing?: string): FrameNode {
  const box = strokedBox({
    radius: RADIUS.input, axis: "HORIZONTAL",
    padding: [0, 12, 0, 12], gap: 8,
  });
  box.counterAxisAlignItems = "CENTER";
  box.counterAxisSizingMode = "FIXED"; // fix height (counter axis of a horizontal frame)
  box.resize(box.width || 1, height);
  stretch(box); // fill width
  const ph = text(placeholder, { color: COLOR.placeholder, size: 15 });
  ph.layoutGrow = 1;
  box.appendChild(ph);
  if (trailing) box.appendChild(text(trailing, { size: 15, color: COLOR.textSecondary }));
  return box;
}

function radioMark(selected: boolean): EllipseNode {
  const e = figma.createEllipse();
  e.resize(20, 20);
  e.fills = [];
  e.strokes = [fill(selected ? COLOR.primary : COLOR.inputBorder)];
  e.strokeWeight = selected ? 6 : 1.5;
  return e;
}

function checkMark(selected: boolean): FrameNode {
  const b = autoFrame({
    radius: 4, bg: selected ? COLOR.primary : COLOR.surface,
    width: 20, height: 20, align: "CENTER", counterAlign: "CENTER",
  });
  b.strokes = [fill(selected ? COLOR.primary : COLOR.inputBorder)];
  b.strokeWeight = 1.5;
  if (selected) b.appendChild(text("✓", { color: COLOR.onPrimary, size: 12, font: FONT.bold }));
  return b;
}

function optionRow(mark: SceneNode, title: string, description?: string): FrameNode {
  const row = autoFrame({ axis: "HORIZONTAL", gap: 12, padding: [8, 0, 8, 0] });
  row.counterAxisAlignItems = "CENTER";
  stretch(row);
  row.appendChild(mark);
  const texts = autoFrame({ gap: 2 });
  texts.layoutGrow = 1;
  texts.appendChild(para(title, { size: 15 }));
  if (description) texts.appendChild(para(description, { size: 13, color: COLOR.textSecondary }));
  row.appendChild(texts);
  return row;
}

function selectionGroup(c: Component, kind: "radio" | "check"): FrameNode {
  const items = (c["data-source"] as DataSourceItem[]) ?? [];
  const wrap = autoFrame({ gap: SPACE.gapXs });
  stretch(wrap);
  if (c.label) wrap.appendChild(label(c.label));
  items.forEach((it, i) => {
    const mark = kind === "radio" ? radioMark(i === 0) : checkMark(i === 0);
    wrap.appendChild(optionRow(mark, it.title, it.description));
  });
  return wrap;
}

function chips(c: Component): FrameNode {
  const items = (c["data-source"] as DataSourceItem[]) ?? [];
  const wrap = autoFrame({ gap: SPACE.gapXs });
  stretch(wrap);
  if (c.label) wrap.appendChild(label(c.label));
  const row = autoFrame({ axis: "HORIZONTAL", gap: 8 });
  row.layoutWrap = "WRAP";
  (row as FrameNode & { counterAxisSpacing?: number }).counterAxisSpacing = 8;
  stretch(row);
  items.forEach((it, i) => {
    const selected = i === 0;
    const chip = autoFrame({
      axis: "HORIZONTAL", padding: [8, 14, 8, 14], radius: RADIUS.chip,
      bg: selected ? COLOR.chipSelectedBg : COLOR.chipBg,
    });
    if (selected) { chip.strokes = [fill(COLOR.chipSelectedBorder)]; chip.strokeWeight = 1; }
    chip.appendChild(text(it.title, { size: 14, color: COLOR.textPrimary }));
    row.appendChild(chip);
  });
  wrap.appendChild(row);
  return wrap;
}

function imagePlaceholder(c: Component): FrameNode {
  const box = autoFrame({
    bg: COLOR.divider, radius: RADIUS.card, height: 160,
    align: "CENTER", counterAlign: "CENTER",
  });
  stretch(box);
  box.appendChild(text(c.src ? "Image" : "Image (no src)", { color: COLOR.textSecondary, size: 13 }));
  return box;
}

export function renderComponent(c: Component): SceneNode | null {
  switch (c.type) {
    case "TextHeading":
      return para(c.text ?? "", { font: FONT.bold, size: 22, lineHeight: 28 });
    case "TextSubheading":
      return para(c.text ?? "", { font: FONT.semibold, size: 17, lineHeight: 22 });
    case "TextBody":
      return para(c.text ?? "", { size: 15, lineHeight: 20 });
    case "RichText":
      return para(c.text ?? "", { size: 15, lineHeight: 20 });
    case "TextCaption":
      return para(c.text ?? "", { size: 13, color: COLOR.textSecondary, lineHeight: 18 });

    case "TextInput":
      return field(c.label ?? "", inputBox(placeholderFor(c)), c["helper-text"]);
    case "TextArea":
      return field(c.label ?? "", inputBox("Type here...", 96), c["helper-text"]);
    case "DatePicker":
      return field(c.label ?? "", inputBox("Select date", 48, "📅"));
    case "Dropdown":
      return field(c.label ?? "", inputBox(firstTitle(c) ?? "Choose", 48, "▾"));

    case "RadioButtonsGroup":
      return selectionGroup(c, "radio");
    case "CheckboxGroup":
      return selectionGroup(c, "check");
    case "ChipsSelector":
      return chips(c);

    case "OptIn": {
      const row = optionRow(checkMark(false), c.label ?? "");
      return row;
    }

    case "EmbeddedLink":
      return para(c.text ?? "Link", { size: 15, color: COLOR.link, font: FONT.medium });

    case "Image":
      return imagePlaceholder(c);

    default:
      return para(`[${c.type}]`, { size: 13, color: COLOR.textSecondary });
  }
}

function firstTitle(c: Component): string | undefined {
  const items = c["data-source"] as DataSourceItem[] | undefined;
  return items && items.length ? items[0].title : undefined;
}

function placeholderFor(c: Component): string {
  switch (c["input-type"]) {
    case "email": return "name@example.com";
    case "phone": return "+55 11 90000-0000";
    case "number": return "0";
    case "password":
    case "passcode": return "••••••";
    default: return "Type here...";
  }
}
