// WhatsApp screen chrome: status bar and the top app bar shown above the flow body.
import { COLOR, DEVICE } from "./theme";
import { FONT } from "./fonts";
import { autoFrame, text, divider, markFill } from "./nodes";

export function statusBar(): FrameNode {
  const bar = autoFrame({
    name: "status-bar", axis: "HORIZONTAL", gap: 0,
    padding: [12, 16, 8, 16], bg: COLOR.statusBar,
    align: "MIN", counterAlign: "CENTER", width: DEVICE.width,
  });
  const time = text("9:41", { font: FONT.semibold, size: 13, color: COLOR.textPrimary });
  const spacer = autoFrame({ axis: "HORIZONTAL" });
  markFill(spacer);
  const icons = text("▂▄▆  Wi-Fi  ▮", { size: 11, color: COLOR.textPrimary });
  bar.appendChild(time);
  bar.appendChild(spacer);
  bar.appendChild(icons);
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
