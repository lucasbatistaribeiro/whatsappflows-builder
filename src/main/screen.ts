// Assembles one Flow screen into a phone-sized Figma frame and reports which
// nodes should navigate where (wired into prototype reactions afterwards).
import type { Screen, Component } from "../model/flowTypes";
import { COLOR, DEVICE, RADIUS, SPACE } from "./theme";
import { FONT } from "./fonts";
import { autoFrame, text, divider } from "./nodes";
import { statusBar, header } from "./chrome";
import { renderComponent } from "./components";

export interface NavTarget {
  node: SceneNode;
  target: string; // destination screen id
}

export interface BuiltScreen {
  id: string;
  frame: FrameNode;
  navTargets: NavTarget[];
}

function navTargetOf(c: Component): string | undefined {
  const a = c["on-click-action"];
  if (a && a.name === "navigate" && a.next && a.next.type === "screen") {
    return a.next.name || undefined;
  }
  return undefined;
}

function footerButton(c: Component): FrameNode {
  const btn = autoFrame({
    name: "footer-button", axis: "HORIZONTAL", height: 48, radius: RADIUS.button,
    bg: COLOR.primary, align: "CENTER", counterAlign: "CENTER",
  });
  btn.layoutAlign = "STRETCH";
  btn.appendChild(text(c.label ?? "Continue", { font: FONT.semibold, size: 15, color: COLOR.onPrimary }));
  return btn;
}

export function buildScreen(screen: Screen): BuiltScreen {
  const navTargets: NavTarget[] = [];

  const frame = autoFrame({
    name: screen.id, bg: COLOR.bg,
    width: DEVICE.width, height: DEVICE.height,
  });
  frame.clipsContent = true;
  frame.appendChild(statusBar());
  frame.appendChild(header(screen.title ?? ""));

  const body = autoFrame({ name: "body", gap: SPACE.gap, padding: SPACE.screenPad });
  body.layoutAlign = "STRETCH";
  body.layoutGrow = 1;
  body.primaryAxisSizingMode = "FIXED";
  frame.appendChild(body);

  const children = screen.layout.children ?? [];
  const footer = children.find((c) => c.type === "Footer");

  for (const c of children) {
    if (c.type === "Footer") continue;
    const node = renderComponent(c);
    if (!node) continue;
    body.appendChild(node);
    const t = navTargetOf(c);
    if (t) navTargets.push({ node, target: t });
  }

  if (footer) {
    const area = autoFrame({ name: "footer", padding: [8, SPACE.screenPad, 20, SPACE.screenPad], gap: 8, bg: COLOR.bg });
    area.layoutAlign = "STRETCH";
    area.appendChild(divider());
    const btn = footerButton(footer);
    area.appendChild(btn);
    frame.appendChild(area);
    const t = navTargetOf(footer);
    if (t) navTargets.push({ node: btn, target: t });
  }

  return { id: screen.id, frame, navTargets };
}
