// Plugin main thread (Figma sandbox). Receives a Flow JSON from the UI and
// renders navigable WhatsApp-styled screens on the canvas.
import type { FlowJSON } from "../model/flowTypes";
import type { Thread } from "../model/chatTypes";
import type { UIToMain, Prefs, GenOptions } from "../shared/messages";
import { SCREEN_HEIGHTS, setPalette, fill } from "./theme";
import { applyFills } from "./nodes";
import { loadFonts } from "./fonts";
import { setBusiness } from "./chrome";
import { buildScreen, type BuiltScreen } from "./screen";
import { buildThread } from "./thread";
import { wireNavigation } from "./routing";

const GAP = 56;

// Section geometry/appearance defaults. Declared before the prefs/options defaults
// below, which reference them.
const SECTION_PAD = 100;
const SECTION_BG = "#353535"; // canvas backdrop behind a generated run
const SECTION_RADIUS = 24;

const PREFS_KEY = "flows-builder-prefs";
const DEFAULT_PREFS: Prefs = {
  mode: "flows",
  theme: "system", lang: "en", os: "ios", previewTheme: "light", interactive: true, size: "md",
  showBusinessName: false, businessName: "Business name",
  sectionName: "", sectionColor: SECTION_BG, sectionRadius: SECTION_RADIUS,
};

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
      await generate(msg.flow, msg.options, msg.replaceSectionId);
    }
    if (msg.type === "generateChat") {
      await generateChat(msg.thread, msg.options);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    figma.notify(`Generation failed: ${message}`, { error: true });
    figma.ui.postMessage({ type: "error", message });
  }
};

const DEFAULT_OPTIONS: GenOptions = {
  os: "ios", theme: "light", interactive: true, size: "md",
  showBusinessName: false, businessName: "Business name",
  sectionName: "", sectionColor: SECTION_BG, sectionRadius: SECTION_RADIUS,
};

// ---- Generated section + embedded Flow JSON ------------------------------
// Each Generate wraps its screens in a Section named with today's date, holding
// an invisible, locked TEXT node with the whole Flow JSON. Clicking that section
// later lets the plugin offer to load the flow back into the builder.

const JSON_MARKER = "flow.json";
const JSON_NODE_NAME = "flow.json - do not delete";

function todayLabel(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? "0" + n : String(n));
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// The date is always part of the name; an optional prefix goes in front of it.
function sectionLabel(prefix: string): string {
  const name = (prefix ?? "").trim();
  return name ? `${name} ${todayLabel()}` : todayLabel();
}

// These come from persisted prefs, so don't trust them blindly: a corrupted colour
// would make `fill()` produce NaN channels, and a bad radius would throw.
function safeColor(hex: unknown): string {
  return typeof hex === "string" && /^#[0-9a-f]{6}$/i.test(hex) ? hex : SECTION_BG;
}
function safeRadius(n: unknown): number {
  return typeof n === "number" && isFinite(n) && n >= 0 ? Math.min(n, 200) : SECTION_RADIUS;
}

// Where a replaced section sat, so its update takes the same spot.
interface Anchor { x: number; y: number }

/**
 * The section a generate run should replace, or null to append a new one.
 *
 * The id comes from the UI, which got it with the import offer — so it is only
 * ever a section this plugin generated and the user then imported. It can have
 * been deleted, or stop being a section, in between: treat anything unexpected
 * as "no link" and fall back to appending, rather than failing the run.
 *
 * `getNodeByIdAsync` (not `getNodeById`) because the manifest declares
 * `documentAccess: "dynamic-page"`, where the sync getter throws.
 */
async function sectionToReplace(id: string | undefined): Promise<SectionNode | null> {
  if (!id) return null;
  const node = await figma.getNodeByIdAsync(id);
  if (!node || node.type !== "SECTION" || node.removed) return null;
  // Only replace something on the page we are generating into.
  return node.parent === figma.currentPage ? node : null;
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
  embedPayload(section, flow);
}

// The hidden, locked TEXT node carrying whatever produced this section. Flow mode
// writes the Flow JSON unchanged (so sections generated before chat mode existed
// still re-import); chat mode writes a `mode`-tagged object.
function embedPayload(section: SectionNode, payload: unknown): void {
  const t = figma.createText();
  t.name = JSON_NODE_NAME;
  t.fontSize = 8;
  t.characters = JSON.stringify(payload);
  section.appendChild(t);
  t.x = SECTION_PAD;
  t.y = SECTION_PAD;
  t.visible = false; // never renders, never exports, ignored by layout
  t.locked = true;   // and can't be grabbed by accident on the canvas
}

// Read the flow embedded in a section, or null when there's none. Only warns
// when a marker node exists but its contents really are broken — a payload from
// another generator is declined in silence.
function readEmbeddedFlow(section: SectionNode): FlowJSON | null {
  const node = section.findChild(
    (n) => n.type === "TEXT" && n.name.indexOf(JSON_MARKER) >= 0,
  ) as TextNode | null;
  if (!node) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(node.characters);
  } catch {
    figma.notify("This section's embedded Flow JSON is invalid.", { error: true });
    return null; // hand-edited into invalid JSON
  }
  if (parsed && typeof parsed === "object") {
    const payload = parsed as { mode?: unknown; screens?: unknown };
    if (Array.isArray(payload.screens) && payload.screens.length) return parsed as FlowJSON;
    // Chat mode writes `{ mode: "chat", thread }` under the same marker name.
    // It parses fine and has no screens[], which used to land on the "invalid"
    // toast — selecting a generated conversation shouted an error at the user.
    // It's another mode's payload, not a corrupted flow: decline it quietly.
    if (typeof payload.mode === "string") return null;
  }
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
  figma.ui.postMessage({ type: "importOffer", name: section.name, flow, sectionId: section.id });
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

// Wrap a run of frames in the dated section: laid out in a row, "fill container"
// sizing resolved, given the standard phone height, then sized around the result.
// Shared by both modes so the section looks identical whichever one produced it.
function placeInSection(frames: FrameNode[], options: GenOptions, at?: Anchor): SectionNode {
  // Reuse the replaced section's spot when there is one, so an update lands
  // where the user left it instead of jumping to the bottom of the page.
  const sectionY = at ? at.y : nextSectionY(); // measure the page before adding the section
  const section = figma.createSection();
  section.name = sectionLabel(options.sectionName);
  section.fills = [fill(safeColor(options.sectionColor))];
  section.strokes = [];        // no border around the generated group
  section.cornerRadius = safeRadius(options.sectionRadius);
  figma.currentPage.appendChild(section);

  const minH = SCREEN_HEIGHTS[options.size] ?? SCREEN_HEIGHTS.md;
  let cursorX = SECTION_PAD;
  for (const frame of frames) {
    section.appendChild(frame);
    frame.x = cursorX;
    frame.y = SECTION_PAD;
    // Resolve "fill container" sizing now the frame is in the document tree.
    applyFills(frame);
    enforceMinHeight(frame, minH);
    cursorX += frame.width + GAP;
  }

  const contentW = cursorX - GAP;
  const contentH = frames.reduce((h, f) => Math.max(h, f.height), 0);
  section.resizeWithoutConstraints(contentW + SECTION_PAD, contentH + SECTION_PAD * 2);
  section.x = at ? at.x : 0;
  section.y = sectionY;
  return section;
}

async function generate(flow: FlowJSON, options: GenOptions = DEFAULT_OPTIONS, replaceSectionId?: string): Promise<void> {
  if (!flow || !Array.isArray(flow.screens) || flow.screens.length === 0) {
    throw new Error("Flow has no screens.");
  }

  await loadFonts();
  await figma.loadAllPagesAsync();

  setPalette(options.theme); // switch the active palette before building any node
  setBusiness(options.showBusinessName, options.businessName);

  const built: BuiltScreen[] = flow.screens.map((s, i) => buildScreen(s, i, flow.screens.length));

  // Updating a section the user imported from: build the replacement at the old
  // one's spot, then remove it. Built first so a failure mid-build leaves the
  // original standing rather than deleting it and producing nothing.
  const old = await sectionToReplace(replaceSectionId);
  const section = placeInSection(
    built.map((b) => b.frame),
    options,
    old ? { x: old.x, y: old.y } : undefined,
  );
  if (old) old.remove();

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
  const n = built.length;
  const screens = `${n} screen${n > 1 ? "s" : ""}`;
  // Say which it was: the user asked for an update, and silently appending a
  // second copy because the section had been deleted would be a surprise.
  figma.notify(old
    ? `Updated "${section.name}" with ${screens}.`
    : replaceSectionId
      ? `The linked section is gone — generated ${screens} in "${section.name}".`
      : `Generated ${screens} in "${section.name}".`);
  // The replacement is a new node with a new id: hand it back so the UI stays
  // linked and the next Generate updates this section too.
  figma.ui.postMessage({ type: "generated", screenCount: n, sectionId: section.id, replaced: !!old });
}

// Chat mode (knowledge/CHAT_UI.md): one frame per thread, in the same dated
// section. No prototype wiring — a conversation has nothing to navigate — and no
// re-import offer yet, so the embedded payload is tagged with its mode for a
// future importer to recognise. The flow reader recognises that `mode` tag and
// declines a chat section quietly, instead of mis-importing it or warning.
async function generateChat(thread: Thread, options: GenOptions = DEFAULT_OPTIONS): Promise<void> {
  if (!thread || !Array.isArray(thread.messages) || thread.messages.length === 0) {
    throw new Error("Conversation has no messages.");
  }

  await loadFonts();
  await figma.loadAllPagesAsync();
  setPalette(options.theme); // switch the active palette before building any node

  const frame = buildThread(thread);
  const section = placeInSection([frame], options);
  embedPayload(section, { mode: "chat", thread });

  figma.currentPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView([section]);
  const n = thread.messages.length;
  figma.notify(`Generated a conversation with ${n} message${n > 1 ? "s" : ""} in "${section.name}".`);
  figma.ui.postMessage({ type: "generated", screenCount: 1 });
}

// Entry = a screen that is never a navigation target; fall back to the first.
function entryScreen(flow: FlowJSON): string {
  const targets = new Set<string>();
  const model = flow.routing_model ?? {};
  for (const key of Object.keys(model)) for (const t of model[key]) targets.add(t);
  const entry = flow.screens.find((s) => !targets.has(s.id));
  return (entry ?? flow.screens[0]).id;
}
