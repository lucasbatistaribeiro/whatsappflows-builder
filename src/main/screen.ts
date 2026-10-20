// Assembles one Flow screen into a phone-sized Figma frame and reports which
// nodes should navigate where (wired into prototype reactions afterwards).
import type { Screen, Component } from "../model/flowTypes";
import { screenChildren } from "../model/flowTypes";
import { COLOR, DEVICE, RADIUS, SPACE } from "./theme";
import { FONT } from "./fonts";
import { autoFrame, text, divider, markFill } from "./nodes";
import { statusBar, header, progressBar } from "./chrome";
import { renderComponent, type NodeLink } from "./components";

// Captions for footer actions that a Figma prototype can't execute.
const ACTION_NOTE: Record<string, string> = {
  complete: "completes the flow (sends result to chat)",
  data_exchange: "calls the data endpoint (server decides next screen)",
  update_data: "updates screen data",
};

export interface NavTarget {
  node: SceneNode;
  target: string; // destination screen id
}

export interface BuiltScreen {
  id: string;
  frame: FrameNode;
  navTargets: NavTarget[];
}

// The component-level target. A NavigationList usually has none: its rows carry
// one `on-click-action` each, and the renderer reports those as NodeLinks.
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
  markFill(btn);
  btn.appendChild(text(c.label ?? "Continue", { font: FONT.semibold, size: 15, color: COLOR.onPrimary }));
  return btn;
}

export function buildScreen(screen: Screen, index = 0, total = 1): BuiltScreen {
  const navTargets: NavTarget[] = [];

  // Fixed phone width; height hugs the content so the screen grows with it.
  const frame = autoFrame({
    name: screen.id, bg: COLOR.bg,
    width: DEVICE.width,
  });
  frame.clipsContent = true;
  const sb = statusBar(); frame.appendChild(sb); markFill(sb);
  // First screen in authoring order = entry: it gets a close "✕", not a back arrow.
  const hd = header(screen.title ?? "", index === 0); frame.appendChild(hd); markFill(hd);

  // Segmented step-progress bar, matching the live preview (multi-screen only).
  if (total > 1) {
    const pb = progressBar(index + 1, total); frame.appendChild(pb); markFill(pb);
  }

  // Body fills the width and hugs its height (the screen grows with the content).
  const body = autoFrame({ name: "body", gap: SPACE.gap, padding: SPACE.screenPad });
  frame.appendChild(body);
  markFill(body);

  const children = screenChildren(screen); // descends into a Form container if present
  const footer = children.find((c) => c.type === "Footer");

  for (const c of children) {
    if (c.type === "Footer") continue;
    const links: NodeLink[] = [];
    const node = renderComponent(c, links);
    if (!node) continue;
    body.appendChild(node);
    const t = navTargetOf(c);
    if (t) navTargets.push({ node, target: t });
    // Per-item targets (NavigationList rows): one reaction per row, not per list.
    for (const link of links) navTargets.push(link);
  }

  if (footer) {
    const area = autoFrame({ name: "footer", padding: [8, SPACE.screenPad, 20, SPACE.screenPad], gap: 8, bg: COLOR.bg });
    markFill(area);
    area.appendChild(divider());
    const btn = footerButton(footer);
    area.appendChild(btn);

    const t = navTargetOf(footer);
    if (t) {
      navTargets.push({ node: btn, target: t });
    } else {
      // Non-navigate actions can't be prototyped — annotate what happens.
      const action = footer["on-click-action"];
      const note = action ? ACTION_NOTE[action.name] : undefined;
      if (note) {
        const cap = text(note, { size: 11, color: COLOR.textSecondary });
        cap.textAlignHorizontal = "CENTER";
        area.appendChild(cap);
        markFill(cap);
      }
    }
    frame.appendChild(area);
  }

  return { id: screen.id, frame, navTargets };
}
