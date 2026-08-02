// Plugin main thread (Figma sandbox). Receives a Flow JSON from the UI and
// renders navigable WhatsApp-styled screens on the canvas.
import type { FlowJSON } from "../model/flowTypes";
import type { UIToMain, Prefs } from "../shared/messages";
import { DEVICE } from "./theme";
import { applyFills } from "./nodes";
import { loadFonts } from "./fonts";
import { buildScreen, type BuiltScreen } from "./screen";
import { wireNavigation } from "./routing";

const GAP = 56;

const PREFS_KEY = "flows-builder-prefs";
const DEFAULT_PREFS: Prefs = { theme: "system", lang: "en" };

figma.showUI(__html__, { width: 500, height: 740, themeColors: true });

// Send saved preferences to the UI once it's up.
figma.clientStorage.getAsync(PREFS_KEY).then((saved: unknown) => {
  const prefs = (saved && typeof saved === "object" ? saved : DEFAULT_PREFS) as Prefs;
  figma.ui.postMessage({ type: "prefs", prefs });
});

figma.ui.onmessage = async (msg: UIToMain) => {
  try {
    if (msg.type === "resize") {
      figma.ui.resize(Math.max(360, msg.width), Math.max(480, msg.height));
      return;
    }
    if (msg.type === "notify") {
      figma.notify(msg.message);
      return;
    }
    if (msg.type === "savePrefs") {
      await figma.clientStorage.setAsync(PREFS_KEY, msg.prefs);
      return;
    }
    if (msg.type === "generate") {
      await generate(msg.flow);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    figma.notify(`Generation failed: ${message}`, { error: true });
    figma.ui.postMessage({ type: "error", message });
  }
};

async function generate(flow: FlowJSON): Promise<void> {
  if (!flow || !Array.isArray(flow.screens) || flow.screens.length === 0) {
    throw new Error("Flow has no screens.");
  }

  await loadFonts();
  await figma.loadAllPagesAsync();

  const built: BuiltScreen[] = flow.screens.map((s) => buildScreen(s));

  const section = figma.createSection();
  section.name = `WhatsApp Flow — ${flow.screens[0].id}`;

  built.forEach((b, i) => {
    section.appendChild(b.frame);
    b.frame.x = i * (DEVICE.width + GAP);
    b.frame.y = 0;
    // Resolve "fill container" sizing now the frame is on the page/auto-layout tree.
    applyFills(b.frame);
  });

  await wireNavigation(built);

  // Entry screen = the prototype starting point.
  const entryId = entryScreen(flow);
  const entry = built.find((b) => b.id === entryId) ?? built[0];
  figma.currentPage.flowStartingPoints = [{ nodeId: entry.frame.id, name: `Start: ${entry.id}` }];

  figma.currentPage.selection = [section];
  figma.viewport.scrollAndZoomIntoView(built.map((b) => b.frame));
  figma.notify(`Generated ${built.length} screen${built.length > 1 ? "s" : ""}.`);
  figma.ui.postMessage({ type: "generated", screenCount: built.length });
}

// Entry = a screen that is never a navigation target; fall back to the first.
function entryScreen(flow: FlowJSON): string {
  const targets = new Set<string>();
  const model = flow.routing_model ?? {};
  for (const key of Object.keys(model)) for (const t of model[key]) targets.add(t);
  const entry = flow.screens.find((s) => !targets.has(s.id));
  return (entry ?? flow.screens[0]).id;
}
