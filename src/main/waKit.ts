// Generates a reusable "WhatsApp UI Kit" — master ComponentNodes for the core
// primitives — so the produced Figma file ships real, editable components a
// designer can drop into screens. Additive: it does not change how the flow
// screens themselves are drawn.
import { COLOR, RADIUS, SPACE, fill } from "./theme";
import { FONT } from "./fonts";
import { autoFrame, text, strokedBox } from "./nodes";

function component(name: string, axis: "VERTICAL" | "HORIZONTAL" = "VERTICAL"): ComponentNode {
  const c = figma.createComponent();
  c.name = name;
  c.layoutMode = axis;
  c.primaryAxisSizingMode = "AUTO";
  c.counterAxisSizingMode = "AUTO";
  c.fills = [];
  return c;
}

function footerButton(): ComponentNode {
  const c = component("Footer Button", "HORIZONTAL");
  c.primaryAxisAlignItems = "CENTER";
  c.counterAxisAlignItems = "CENTER";
  c.fills = [fill(COLOR.primary)];
  c.cornerRadius = RADIUS.button;
  c.paddingTop = c.paddingBottom = 14;
  c.primaryAxisSizingMode = "FIXED"; // fixed width
  c.counterAxisSizingMode = "FIXED"; // fixed height
  c.resize(320, 48);
  const label = text("Continue", { font: FONT.semibold, size: 15, color: COLOR.onPrimary });
  label.name = "Label";
  c.appendChild(label);
  return c;
}

function textInput(): ComponentNode {
  const c = component("Text Input");
  c.itemSpacing = SPACE.gapXs;
  c.counterAxisSizingMode = "FIXED";
  c.resize(320, 1);
  const label = text("Label", { font: FONT.medium, size: 13, color: COLOR.textSecondary });
  label.name = "Label";
  label.layoutAlign = "STRETCH";
  c.appendChild(label);
  const box = strokedBox({ radius: RADIUS.input, axis: "HORIZONTAL", padding: [0, 12, 0, 12] });
  box.counterAxisAlignItems = "CENTER";
  box.counterAxisSizingMode = "FIXED";
  box.resize(1, 48);
  box.layoutAlign = "STRETCH";
  const ph = text("Type here...", { color: COLOR.placeholder, size: 15 });
  ph.name = "Placeholder";
  ph.layoutGrow = 1;
  box.appendChild(ph);
  c.appendChild(box);
  return c;
}

function optionRow(kind: "Radio" | "Checkbox"): ComponentNode {
  const c = component(`${kind} Row`, "HORIZONTAL");
  c.counterAxisAlignItems = "CENTER";
  c.itemSpacing = 12;
  c.paddingTop = c.paddingBottom = 8;
  c.primaryAxisSizingMode = "FIXED"; // fixed width; height hugs content
  c.resize(320, 1);

  let mark: SceneNode;
  if (kind === "Radio") {
    const e = figma.createEllipse();
    e.resize(20, 20);
    e.fills = [];
    e.strokes = [fill(COLOR.inputBorder)];
    e.strokeWeight = 1.5;
    mark = e;
  } else {
    const b = autoFrame({ width: 20, height: 20, radius: 4, bg: COLOR.surface });
    b.strokes = [fill(COLOR.inputBorder)];
    b.strokeWeight = 1.5;
    mark = b;
  }
  mark.name = "Mark";
  c.appendChild(mark);

  const title = text("Option", { size: 15 });
  title.name = "Title";
  title.layoutGrow = 1;
  c.appendChild(title);
  return c;
}

function chip(): ComponentNode {
  const c = component("Chip", "HORIZONTAL");
  c.fills = [fill(COLOR.chipBg)];
  c.cornerRadius = RADIUS.chip;
  c.paddingTop = c.paddingBottom = 8;
  c.paddingLeft = c.paddingRight = 14;
  const label = text("Tag", { size: 14, color: COLOR.textPrimary });
  label.name = "Label";
  c.appendChild(label);
  return c;
}

// Builds the kit and returns a titled board frame containing captioned masters.
export function createUIKit(): FrameNode {
  const board = autoFrame({
    name: "WhatsApp UI Kit", axis: "VERTICAL", gap: SPACE.gap,
    padding: 24, bg: COLOR.statusBar, radius: RADIUS.card,
  });

  const title = text("WhatsApp UI Kit", { font: FONT.bold, size: 18 });
  board.appendChild(title);

  const masters: ComponentNode[] = [footerButton(), textInput(), optionRow("Radio"), optionRow("Checkbox"), chip()];
  for (const m of masters) {
    const caption = text(m.name, { size: 11, color: COLOR.textSecondary });
    board.appendChild(caption);
    board.appendChild(m);
  }
  return board;
}
