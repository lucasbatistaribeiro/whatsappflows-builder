// WhatsApp screen chrome: status bar and the top app bar shown above the flow body.
import { COLOR, DEVICE } from "./theme";
import { FONT } from "./fonts";
import { autoFrame, text, divider, markFill } from "./nodes";

// iOS-style status bar icons (same shapes as the plugin's live preview), with
// the theme's dark ink baked in so they import cleanly as Figma vectors.
const INK = COLOR.textPrimary;
const SIGNAL_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="11" viewBox="0 0 18 12" fill="${INK}">` +
  `<rect x="0" y="7.5" width="3" height="4.5" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/>` +
  `<rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>`;
const WIFI_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="11" viewBox="0 0 16 12" fill="${INK}">` +
  `<path d="M8 2.2c2.5 0 4.8 1 6.5 2.6l1.3-1.6A11 11 0 0 0 8 .3 11 11 0 0 0 .2 3.2l1.3 1.6A9.3 9.3 0 0 1 8 2.2z"/>` +
  `<path d="M8 6.1c1.5 0 2.9.6 4 1.6l1.3-1.6A8 8 0 0 0 8 4a8 8 0 0 0-5.3 2.1L4 7.7A6 6 0 0 1 8 6.1z"/>` +
  `<path d="M8 10.1 9.8 8a2.7 2.7 0 0 0-3.6 0L8 10.1z"/></svg>`;
const BATTERY_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="11" viewBox="0 0 27 12" fill="none">` +
  `<rect x="1" y="1" width="22" height="10" rx="3" stroke="${INK}" stroke-opacity="0.4"/>` +
  `<rect x="3" y="3" width="16" height="6" rx="1.5" fill="${INK}"/>` +
  `<path d="M25 4.2a2 2 0 0 1 0 3.6z" fill="${INK}" fill-opacity="0.4"/></svg>`;

// Import an SVG and rescale it to a fixed height, whatever size Figma gives it.
function iconNode(svg: string, targetH = 11): FrameNode {
  const n = figma.createNodeFromSvg(svg);
  if (n.height > 0 && Math.abs(n.height - targetH) > 0.5) n.rescale(targetH / n.height);
  return n;
}

function statusIcons(): FrameNode {
  const wrap = autoFrame({ axis: "HORIZONTAL", gap: 6, counterAlign: "CENTER" });
  wrap.appendChild(iconNode(SIGNAL_SVG));
  wrap.appendChild(iconNode(WIFI_SVG));
  wrap.appendChild(iconNode(BATTERY_SVG));
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

export function header(title: string): FrameNode {
  const wrap = autoFrame({ name: "header", bg: COLOR.surface, width: DEVICE.width });

  const row = autoFrame({
    axis: "HORIZONTAL", gap: 16, padding: [14, 16, 14, 16],
    align: "MIN", counterAlign: "CENTER",
  });
  markFill(row);

  const close = text("✕", { size: 20, color: COLOR.textPrimary });
  const titles = autoFrame({ gap: 1 });
  titles.appendChild(text(title || "Flow", { font: FONT.semibold, size: 16 }));
  titles.appendChild(text("Business name", { size: 12, color: COLOR.textSecondary }));

  row.appendChild(close);
  row.appendChild(titles);
  wrap.appendChild(row);
  wrap.appendChild(divider());
  return wrap;
}
