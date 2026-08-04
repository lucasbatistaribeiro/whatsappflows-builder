// WhatsApp screen chrome: status bar and the top app bar shown above the flow body.
import { COLOR, DEVICE, SPACE } from "./theme";
import { FONT } from "./fonts";
import { autoFrame, text, divider, markFill } from "./nodes";
import { fill } from "./theme";

// iOS-style status bar icons (same shapes as the plugin's live preview). The
// ink color is read from the ACTIVE palette at render time (built per-generate),
// so dark theme gets light icons — never bake it at module load.
const signalSvg = (ink: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="11" viewBox="0 0 18 12" fill="${ink}">` +
  `<rect x="0" y="7.5" width="3" height="4.5" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/>` +
  `<rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>`;
const wifiSvg = (ink: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="11" viewBox="0 0 16 12" fill="${ink}">` +
  `<path d="M8 2.2c2.5 0 4.8 1 6.5 2.6l1.3-1.6A11 11 0 0 0 8 .3 11 11 0 0 0 .2 3.2l1.3 1.6A9.3 9.3 0 0 1 8 2.2z"/>` +
  `<path d="M8 6.1c1.5 0 2.9.6 4 1.6l1.3-1.6A8 8 0 0 0 8 4a8 8 0 0 0-5.3 2.1L4 7.7A6 6 0 0 1 8 6.1z"/>` +
  `<path d="M8 10.1 9.8 8a2.7 2.7 0 0 0-3.6 0L8 10.1z"/></svg>`;
const batterySvg = (ink: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="11" viewBox="0 0 27 12" fill="none">` +
  `<rect x="1" y="1" width="22" height="10" rx="3" stroke="${ink}" stroke-opacity="0.4"/>` +
  `<rect x="3" y="3" width="16" height="6" rx="1.5" fill="${ink}"/>` +
  `<path d="M25 4.2a2 2 0 0 1 0 3.6z" fill="${ink}" fill-opacity="0.4"/></svg>`;

// Flow-sheet header icons. The leading control is a close "✕" on the entry
// screen (there is nowhere to go back to) and a back arrow on every screen after.
const strokeSvg = (ink: string, paths: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" ` +
  `stroke="${ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
const backSvg = (ink: string): string => strokeSvg(ink, `<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>`);
const closeSvg = (ink: string): string => strokeSvg(ink, `<path d="M18 6 6 18"/><path d="m6 6 12 12"/>`);
const moreSvg = (ink: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${ink}">` +
  `<circle cx="12" cy="5" r="1.75"/><circle cx="12" cy="12" r="1.75"/><circle cx="12" cy="19" r="1.75"/></svg>`;

// Import an SVG and rescale it to a fixed height, whatever size Figma gives it.
function iconNode(svg: string, targetH = 11): FrameNode {
  const n = figma.createNodeFromSvg(svg);
  if (n.height > 0 && Math.abs(n.height - targetH) > 0.5) n.rescale(targetH / n.height);
  return n;
}

function statusIcons(): FrameNode {
  const ink = COLOR.textPrimary; // active palette, at render time
  const wrap = autoFrame({ axis: "HORIZONTAL", gap: 6, counterAlign: "CENTER" });
  wrap.appendChild(iconNode(signalSvg(ink)));
  wrap.appendChild(iconNode(wifiSvg(ink)));
  wrap.appendChild(iconNode(batterySvg(ink)));
  return wrap;
}

export function statusBar(): FrameNode {
  const bar = autoFrame({
    name: "status-bar", axis: "HORIZONTAL", gap: 0,
    padding: [9, 16, 6, 16], bg: COLOR.statusBar,
    counterAlign: "CENTER", width: DEVICE.width,
  });
  bar.primaryAxisAlignItems = "SPACE_BETWEEN"; // time left, icons right (no filler frame)
  bar.appendChild(text("9:41", { font: FONT.semibold, size: 13, color: COLOR.textPrimary }));
  bar.appendChild(statusIcons());
  return bar;
}

// Segmented step-progress bar (one segment per screen, filled up to the current
// one) — mirrors WhatsApp's multi-screen flow header. `done` = 1-based position.
export function progressBar(done: number, total: number): FrameNode {
  const bar = autoFrame({
    name: "progress", axis: "HORIZONTAL", gap: 3,
    padding: [2, SPACE.screenPad, 8, SPACE.screenPad],
    bg: COLOR.surface, width: DEVICE.width, counterAlign: "CENTER",
  });
  for (let i = 0; i < total; i++) {
    const seg = figma.createRectangle();
    seg.name = "step";
    seg.resize(1, 3);
    seg.cornerRadius = 2;
    seg.fills = [fill(i < done ? COLOR.primary : COLOR.divider)];
    markFill(seg); // segments share the width equally (FILL resolved in applyFills)
    bar.appendChild(seg);
  }
  return bar;
}

// Business name shown under the flow title. Toggled + edited from the plugin
// menu and sent with `generate`; set it before building any node (like the
// palette) so every screen in a run agrees.
let business = { show: true, name: "Business name" };
export function setBusiness(show: boolean, name: string): void {
  business = { show, name };
}

// WhatsApp's flow modal is a bottom sheet — it opens with a drag handle on top.
function dragHandle(): FrameNode {
  const row = autoFrame({
    name: "handle", axis: "HORIZONTAL", padding: [8, 0, 4, 0],
    align: "CENTER", counterAlign: "CENTER",
  });
  const pill = figma.createRectangle();
  pill.name = "grabber";
  pill.resize(36, 4);
  pill.cornerRadius = 2;
  pill.fills = [fill(COLOR.inputBorder)];
  row.appendChild(pill);
  return row;
}

// A centered text line that fills its parent's width (so "centered" means
// centered on the sheet, not inside the text's own hugging box).
function centered(node: TextNode): TextNode {
  node.textAlignHorizontal = "CENTER";
  node.textAutoResize = "HEIGHT"; // required before a FILL width sticks
  return markFill(node);
}

// `first` = the flow's entry screen, which closes the sheet instead of going back.
export function header(title: string, first = false): FrameNode {
  const wrap = autoFrame({ name: "header", bg: COLOR.surface, width: DEVICE.width });

  const handle = dragHandle();
  wrap.appendChild(handle);
  markFill(handle);

  // close/back | titles | overflow. Both icons are the same width, so a filling
  // titles column puts the title in the true center of the sheet.
  const row = autoFrame({
    axis: "HORIZONTAL", gap: 8, padding: [6, 12, 14, 12],
    align: "MIN", counterAlign: "CENTER",
  });
  markFill(row);
  const lead = first ? closeSvg(COLOR.textPrimary) : backSvg(COLOR.textPrimary);
  row.appendChild(iconNode(lead, 24));

  const titles = autoFrame({ gap: 1, counterAlign: "CENTER" });
  markFill(titles);
  titles.appendChild(centered(text(title || "Flow", { font: FONT.semibold, size: 16 })));
  const name = business.show ? business.name.trim() : "";
  if (name) titles.appendChild(centered(text(name, { size: 12, color: COLOR.textSecondary })));
  row.appendChild(titles);

  row.appendChild(iconNode(moreSvg(COLOR.textPrimary), 24));

  wrap.appendChild(row);
  wrap.appendChild(divider());
  return wrap;
}
