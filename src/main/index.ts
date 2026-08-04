// Plugin main thread (Figma sandbox). Receives a Flow JSON from the UI and
// renders navigable WhatsApp-styled screens on the canvas.
import type { FlowJSON } from "../model/flowTypes";
import type { UIToMain, Prefs, GenOptions } from "../shared/messages";
import { SCREEN_HEIGHTS, setPalette } from "./theme";
import { applyFills } from "./nodes";
import { loadFonts } from "./fonts";
import { buildScreen, type BuiltScreen } from "./screen";
import { wireNavigation } from "./routing";

const GAP = 56;

const PREFS_KEY = "flows-builder-prefs";
const DEFAULT_PREFS: Prefs = { theme: "system", lang: "en", os: "ios", previewTheme: "light", interactive: true, size: "md" };

figma.showUI(__html__, { width: 500, height: 740, themeColors: true });

// Send saved preferences to the UI once it's up. Merge over defaults so prefs
// saved before newer fields existed still load with sensible values.
figma.clientStorage.getAsync(PREFS_KEY).then((saved: unknown) => {
  const prefs = { ...DEFAULT_PREFS, ...(saved && typeof saved === "object" ? saved : {}) } as Prefs;
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
      await generate(msg.flow, msg.options);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    figma.notify(`Generation failed: ${message}`, { error: true });
    figma.ui.postMessage({ type: "error", message });
  }
};

const DEFAULT_OPTIONS: GenOptions = { os: "ios", theme: "light", interactive: true, size: "md" };

// ---- Generated section + embedded Flow JSON ------------------------------
// Each Generate wraps its screens in a Section named with today's date, holding
// an invisible, locked TEXT node with the whole Flow JSON. Clicking that section
// later lets the plugin offer to load the flow back into the builder.

const SECTION_PAD = 100;
const JSON_MARKER = "flow.json";
const JSON_NODE_NAME = "flow.json - do not delete";

function todayLabel(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? "0" + n : String(n));
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Drop the new section below whatever is already on the page.
function nextSectionY(): number {
  let bottom = 0;
  for (const n of figma.currentPage.children) {
    const box = n.absoluteBoundingBox;
    if (box) bottom = Math.max(bottom, box.y + box.height);
  }
  return bottom > 0 ? bottom + 120 : 0;
}

function embedFlowJson(section: SectionNode, flow: FlowJSON): void {
  const t = figma.createText();
  t.name = JSON_NODE_NAME;
  t.fontSize = 8;
  t.characters = JSON.stringify(flow);
  section.appendChild(t);
  t.x = SECTION_PAD;
  t.y = SECTION_PAD;
  t.visible = false; // never renders, never exports, ignored by layout
  t.locked = true;   // and can't be grabbed by accident on the canvas
}

// Read the flow embedded in a section, or null when there's none. Only warns
// when a marker node exists but its contents can't be used.
function readEmbeddedFlow(section: SectionNode): FlowJSON | null {
  const node = section.findChild(
    (n) => n.type === "TEXT" && n.name.indexOf(JSON_MARKER) >= 0,
  ) as TextNode | null;
  if (!node) return null;
  try {
    const parsed = JSON.parse(node.characters) as FlowJSON;
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.screens) && parsed.screens.length) {
      return parsed;
    }
  } catch { /* hand-edited into invalid JSON */ }
  figma.notify("This section's embedded Flow JSON is invalid.", { error: true });
  return null;
}

// Offer an import when the user selects a single generated section, and withdraw
// it as soon as the selection moves elsewhere (another node, or nothing).
let lastOfferedSectionId: string | null = null;
function endOffer(): void {
  lastOfferedSectionId = null;
  figma.ui.postMessage({ type: "importOfferEnd" });
}
figma.on("selectionchange", () => {
  const sel = figma.currentPage.selection;
  if (sel.length !== 1 || sel[0].type !== "SECTION") { endOffer(); return; }
  const section = sel[0];
  if (section.id === lastOfferedSectionId) return; // already offered for this one
  const flow = readEmbeddedFlow(section);
  if (!flow) { endOffer(); return; }
  lastOfferedSectionId = section.id;
  figma.ui.postMessage({ type: "importOffer", name: section.name, flow });
});

// Give a short screen a standard phone height: fix the frame height and let the
// body absorb the slack so the footer stays pinned to the bottom. Taller content
// is left alone (the frame already grew past the minimum).
function enforceMinHeight(frame: FrameNode, minH: number): void {
  if (frame.height >= minH) return;
  const body = frame.findChild((n) => n.name === "body") as FrameNode | null;
  frame.primaryAxisSizingMode = "FIXED";
  frame.resize(frame.width, minH);
  if (body) { try { (body as SceneNode & { layoutSizingVertical?: string }).layoutSizingVertical = "FILL"; } catch { /* not fillable */ } }
}

async function generate(flow: FlowJSON, options: GenOptions = DEFAULT_OPTIONS): Promise<void> {
  if (!flow || !Array.isArray(flow.screens) || flow.screens.length === 0) {
    throw new Error("Flow has no screens.");
  }

  await loadFonts();
  await figma.loadAllPagesAsync();

  setPalette(options.theme); // switch the active palette before building any node

  const built: BuiltScreen[] = flow.screens.map((s, i) => buildScreen(s, i, flow.screens.length));

  // Wrap this run in a dated section, padded on all sides.
  const sectionY = nextSectionY(); // measure the page before adding the section
  const section = figma.createSection();
  section.name = todayLabel();
  figma.currentPage.appendChild(section);

  // Lay the screens out in a row inside the section.
  const minH = SCREEN_HEIGHTS[options.size] ?? SCREEN_HEIGHTS.md;
  let cursorX = SECTION_PAD;
  built.forEach((b) => {
    section.appendChild(b.frame);
    b.frame.x = cursorX;
    b.frame.y = SECTION_PAD;
    // Resolve "fill container" sizing now the frame is in the document tree.
    applyFills(b.frame);
    enforceMinHeight(b.frame, minH); // standard phone height for short screens
    cursorX += b.frame.width + GAP;
  });

  // Size the section around the final frame geometry, then park it on the page.
  const contentW = cursorX - GAP;
  const contentH = built.reduce((h, b) => Math.max(h, b.frame.height), 0);
  section.resizeWithoutConstraints(contentW + SECTION_PAD, contentH + SECTION_PAD * 2);
  section.x = 0;
  section.y = sectionY;

  embedFlowJson(section, flow); // hidden JSON so this section can be re-imported

  // Interactive = wire the clickable prototype; otherwise leave plain frames.
  if (options.interactive) {
    await wireNavigation(built);
    const entryId = entryScreen(flow);
    const entry = built.find((b) => b.id === entryId) ?? built[0];
    figma.currentPage.flowStartingPoints = [{ nodeId: entry.frame.id, name: `Start: ${entry.id}` }];
  }

  // Select the frames (not the section) so this run doesn't immediately offer to
  // re-import what was just generated.
  figma.currentPage.selection = built.map((b) => b.frame);
  figma.viewport.scrollAndZoomIntoView([section]);
  figma.notify(`Generated ${built.length} screen${built.length > 1 ? "s" : ""} in "${section.name}".`);
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
