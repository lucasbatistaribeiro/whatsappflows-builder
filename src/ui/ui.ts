// Plugin UI: a lightweight WhatsApp Flows "playground" — compose screens with a
// palette, edit the Flow JSON live (two-way), export it, and generate in Figma.
import type { FlowJSON, Screen, Component } from "../model/flowTypes";
import { screenChildren } from "../model/flowTypes";
import { PALETTE } from "../model/palette";
import { SAMPLE_FLOW } from "../model/sample";
import { TEMPLATES } from "../model/templates";
import { postToMain } from "../shared/messages";
import { renderPreview, applyThemeVars, setPreviewInteractive, setPreviewSize, setPreviewTheme, setPreviewBusiness } from "./preview";
import { validateFlow, type Issue } from "../model/validate";
import { buildPropEditor } from "./propEditor";
import { iconEl, applyIcons } from "./icons";
import { createDropdown } from "./dropdown";
import { t, setLang, applyI18n, type Lang } from "./i18n";
import type { Prefs, ThemePref, GenOptions, ScreenSize, PreviewTheme } from "../shared/messages";

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

let flow: FlowJSON = clone(SAMPLE_FLOW);
let current = 0; // selected screen index

function screen(): Screen {
  return flow.screens[current];
}

// ---- Rendering ----------------------------------------------------------

// Screen ids that carry at least one error-level validation issue.
function errorScreenIds(): Set<string> {
  const set = new Set<string>();
  for (const issue of validateFlow(flow)) if (issue.level === "error" && issue.screen) set.add(issue.screen);
  return set;
}

function renderScreens(): void {
  const host = $("#screens");
  host.innerHTML = "";
  const errs = errorScreenIds();
  flow.screens.forEach((s, i) => {
    const chip = document.createElement("div");
    chip.className = "chip" + (i === current ? " active" : "") + (errs.has(s.id) ? " has-error" : "");
    const label = document.createElement("span");
    label.textContent = s.id + (s.terminal ? " ●" : "");
    label.onclick = () => { current = i; renderAll(); };
    chip.appendChild(label);
    if (flow.screens.length > 1) {
      const x = document.createElement("span");
      x.className = "x"; x.title = "Delete screen";
      x.appendChild(iconEl("x", 16));
      x.onclick = (e) => { e.stopPropagation(); flow.screens.splice(i, 1); current = Math.max(0, current - (i <= current ? 1 : 0)); syncAndRender(); };
      chip.appendChild(x);
    }
    host.appendChild(chip);
  });
  const add = document.createElement("button");
  add.className = "chip add"; add.title = "Add screen";
  add.appendChild(iconEl("plus", 16));
  add.appendChild(document.createTextNode(t("addScreen")));
  add.onclick = () => {
    const id = uniqueId("SCREEN");
    flow.screens.push({ id, title: "New screen", layout: { type: "SingleColumnLayout", children: [] } });
    current = flow.screens.length - 1;
    syncAndRender();
  };
  host.appendChild(add);
}

function renderScreenMeta(): void {
  const host = $("#screen-meta");
  const s = screen();
  host.innerHTML = "";

  host.appendChild(fieldLabel(t("screenId")));
  host.appendChild(textField(s.id, (v) => { s.id = v.trim() || s.id; syncJson(); }));

  host.appendChild(fieldLabel(t("title")));
  host.appendChild(textField(s.title ?? "", (v) => { s.title = v; syncJson(); }));

  host.appendChild(fieldLabel(t("terminal")));
  const cb = document.createElement("input");
  cb.type = "checkbox"; cb.checked = !!s.terminal;
  // Keep `success` in lockstep with `terminal` — it's a terminal-only property,
  // so a stale `success` on a non-terminal screen would be rejected on import.
  cb.onchange = () => {
    s.terminal = cb.checked || undefined;
    s.success = cb.checked ? true : undefined;
    renderScreens(); syncJson();
  };
  host.appendChild(cb);
}

const PALETTE_GROUPS = ["Text", "Input", "Selection", "Media", "Action"] as const;

function renderPalette(): void {
  const host = $("#palette");
  host.innerHTML = "";
  const groups = PALETTE_GROUPS
    .map((g) => ({ label: g, options: PALETTE.filter((e) => e.group === g).map((e) => ({ value: e.type, label: e.label })) }))
    .filter((g) => g.options.length > 0);

  host.appendChild(createDropdown({
    value: "",
    placeholder: t("palettePlaceholder"),
    groups,
    searchable: true,
    searchPlaceholder: t("searchComponent"),
    resetAfterSelect: true,
    onChange: (type) => {
      const entry = PALETTE.find((e) => e.type === type);
      if (entry) { screenChildren(screen()).push(entry.make()); syncAndRender(); }
    },
  }));
}

function renderComponentList(): void {
  const host = $("#comp-list");
  const kids = screenChildren(screen()); // descends into a Form container if present
  host.innerHTML = "";
  cardToggles.length = 0; // rebuilt below, one per card
  updateCollapseAll();
  if (kids.length === 0) {
    const e = document.createElement("div");
    e.className = "empty"; e.textContent = t("noComponents");
    host.appendChild(e);
    return;
  }
  kids.forEach((c, i) => {
    const isCollapsed = COLLAPSED.has(c);
    const card = document.createElement("div");
    card.className = "comp" + (isCollapsed ? " collapsed" : "");

    const row = document.createElement("div");
    row.className = "row";

    // Header: drag grip · component name · accordion chevron.
    const grip = document.createElement("span");
    grip.className = "comp-grip"; grip.title = t("dragToReorder");
    grip.appendChild(iconEl("grip-vertical", 16));
    grip.addEventListener("pointerdown", (e) => startDrag(e, card));

    const head = document.createElement("div");
    head.className = "comp-head";
    const type = document.createElement("span");
    type.className = "type"; type.textContent = c.type;
    head.appendChild(type);

    const chev = document.createElement("span");
    chev.className = "comp-chev";
    chev.appendChild(iconEl(isCollapsed ? "chevron-down" : "chevron-up", 16));

    // Toggle in place (class only) so the body animates instead of re-rendering.
    const setCollapsed = (collapse: boolean): void => {
      card.classList.toggle("collapsed", collapse);
      if (collapse) COLLAPSED.add(c);
      else COLLAPSED.delete(c);
      chev.replaceChildren(iconEl(collapse ? "chevron-down" : "chevron-up", 16));
    };
    cardToggles.push(setCollapsed); // reused by the collapse/expand-all button
    const toggle = (): void => setCollapsed(!card.classList.contains("collapsed"));
    head.onclick = toggle;
    chev.onclick = toggle;
    row.append(grip, head, chev);
    card.appendChild(row);

    const ids = flow.screens.map((s) => s.id);
    const editor = buildPropEditor(c, ids, { soft: softSync, structural: structuralSync });
    editor.classList.add("comp-body");
    // Duplicate + delete live at the end of the card's own content, so they
    // collapse with it.
    const actions = document.createElement("div");
    actions.className = "comp-actions";
    actions.appendChild(iconBtn("copy", () => {
      const copy = clone(c); // deep copy: the duplicate keeps every filled value
      if (copy.name) copy.name = uniqueComponentName(copy.name, kids);
      if (COLLAPSED.has(c)) COLLAPSED.add(copy); // open/closed like the card it came from
      kids.splice(i + 1, 0, copy); // right below the original
      syncAndRender();
    }, t("duplicate")));
    actions.appendChild(iconBtn("trash-2", () => { kids.splice(i, 1); syncAndRender(); }, t("remove")));
    editor.appendChild(actions);
    // Grid wrapper so the collapse can animate to the body's natural height.
    const bodyWrap = document.createElement("div");
    bodyWrap.className = "comp-body-wrap";
    bodyWrap.appendChild(editor);
    card.appendChild(bodyWrap);
    host.appendChild(card);
  });
}

// Tracks which components are collapsed, keyed by the component object so the
// state survives reorders and re-renders (reset only when the flow is replaced).
const COLLAPSED = new WeakSet<object>();

// Cards start closed — on first load and on every import — so a flow with many
// components doesn't open as a wall of expanded editors. Covers every screen,
// not just the current one, so switching screens stays collapsed too.
function collapseAllCards(f: FlowJSON): void {
  for (const s of f.screens) for (const c of screenChildren(s)) COLLAPSED.add(c);
}

// A duplicate can't reuse the source's `name`: names must be unique per screen
// (validate.ts vDupName), so a verbatim copy would always land as an error.
function uniqueComponentName(base: string, kids: Component[]): string {
  const taken = new Set(kids.map((k) => k.name).filter((n): n is string => !!n));
  const stem = base.replace(/_\d+$/, "");
  let n = 2;
  while (taken.has(`${stem}_${n}`)) n++;
  return `${stem}_${n}`;
}

// One in-place collapse setter per rendered card, so "collapse all" can animate
// the existing cards instead of re-rendering them.
const cardToggles: ((collapse: boolean) => void)[] = [];

// "Collapse all" toggle in the component-list header: collapse every card while
// any is open, otherwise expand them all.
function anyExpanded(): boolean {
  return screenChildren(screen()).some((c) => !COLLAPSED.has(c));
}
function updateCollapseAll(): void {
  const btn = document.querySelector<HTMLElement>("#collapse-all");
  if (!btn) return;
  const kids = screenChildren(screen());
  btn.style.display = kids.length ? "" : "none";
  btn.textContent = t(anyExpanded() ? "collapseAll" : "expandAll");
}
$("#collapse-all").addEventListener("click", () => {
  const collapse = anyExpanded();
  // Drive the existing cards (each setter also updates COLLAPSED) so they animate.
  for (const toggle of cardToggles) toggle(collapse);
  updateCollapseAll();
});


// Drag-to-reorder from the grip. The dragged card follows the pointer and stays
// fully opaque (the others fade via .comp-list.dragging), while an accent line
// marks the slot it will drop into. The list itself isn't reordered until release,
// so the indicator is the single source of truth for "where will this land".
function startDrag(e: PointerEvent, card: HTMLElement): void {
  e.preventDefault();
  const host = $("#comp-list");
  const cards = Array.from(host.children) as HTMLElement[];
  const from = cards.indexOf(card);
  if (from < 0) return;

  // Snapshot the geometry up front: the dragged card gets a transform, so live
  // rects would follow the pointer and poison the midpoint test. Nothing else
  // reflows during the drag, so these stay accurate.
  const rects = cards.map((el) => el.getBoundingClientRect());
  const startY = e.clientY;
  let insertAt = from; // index in the current list to insert *before*

  host.classList.add("dragging");
  card.classList.add("dragging");
  const line = document.createElement("div");
  line.className = "drop-line";
  host.appendChild(line);

  // Vertical center of the gap that precedes card `idx` (or follows the last one).
  const hostTop = host.getBoundingClientRect().top;
  const slotY = (idx: number): number => {
    if (idx <= 0) return rects[0].top - hostTop - 4;
    if (idx >= rects.length) return rects[rects.length - 1].bottom - hostTop + 3;
    return (rects[idx - 1].bottom + rects[idx].top) / 2 - hostTop - 1;
  };
  const paint = (): void => { line.style.top = `${slotY(insertAt)}px`; };
  paint();

  const onMove = (ev: PointerEvent): void => {
    card.style.transform = `translateY(${ev.clientY - startY}px)`;
    let idx = rects.length;
    for (let k = 0; k < rects.length; k++) {
      if (ev.clientY < rects[k].top + rects[k].height / 2) { idx = k; break; }
    }
    if (idx !== insertAt) { insertAt = idx; paint(); }
  };
  const onUp = (): void => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    line.remove();
    host.classList.remove("dragging");
    card.classList.remove("dragging");
    card.style.transform = "";
    // Inserting after its own slot shifts the target left by one once removed.
    const to = insertAt > from ? insertAt - 1 : insertAt;
    if (to === from) return; // dropped back where it started
    const kids = screenChildren(screen());
    kids.splice(to, 0, ...kids.splice(from, 1));
    syncAndRender();
  };
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
}

// ---- JSON two-way sync --------------------------------------------------

// The editor shows either the whole flow or a single screen, so a big flow can be
// edited one screen at a time. Both directions stay in sync either way.
const FLOW_SCOPE = "__flow__";
let jsonScope = FLOW_SCOPE; // FLOW_SCOPE or a screen id

// The scope's screen, or null when showing the whole flow / the id went away.
function scopedScreen(): Screen | null {
  if (jsonScope === FLOW_SCOPE) return null;
  return flow.screens.find((s) => s.id === jsonScope) ?? null;
}

function syncJson(): void {
  buildJsonScopeDropdown();
  const shown: unknown = scopedScreen() ?? flow;
  ($("#json") as HTMLTextAreaElement).value = JSON.stringify(shown, null, 2);
  setJsonStatus(true, t("valid"));
}

// Rebuilt only when the option set actually changes: this runs on every keystroke
// of a prop edit, and swapping the node each time would be churn. Called from both
// syncJson and renderAll, so the options can't go stale after the screens change
// (editing the whole flow in this tab re-renders without rewriting the textarea).
let jsonScopeSig = "";
function buildJsonScopeDropdown(): void {
  // The scoped screen can be renamed or deleted elsewhere — fall back instead of
  // pointing at an id that no longer exists.
  if (jsonScope !== FLOW_SCOPE && !scopedScreen()) jsonScope = FLOW_SCOPE;
  const ids = flow.screens.map((s) => s.id);
  const sig = [jsonScope, ...ids].join("|");
  if (sig === jsonScopeSig) return;
  jsonScopeSig = sig;
  const host = $("#json-scope");
  host.innerHTML = "";
  host.appendChild(createDropdown({
    value: jsonScope,
    size: "sm",
    options: [{ value: FLOW_SCOPE, label: t("jsonWholeFlow") }, ...ids.map((id) => ({ value: id, label: id }))],
    onChange: (v) => { jsonScope = v; syncJson(); },
  }));
}

const cleanKids = (arr: unknown): Component[] =>
  (Array.isArray(arr) ? arr : []).filter(
    (c) => !!c && typeof c === "object" && typeof (c as { type?: unknown }).type === "string",
  ) as Component[];

// Guard one screen against structurally-valid-but-broken input (no layout/children,
// null entries). Deliberately lenient about everything else — reporting problems is
// the validator's job, not this function's.
function normalizeScreen(parsed: unknown): Screen | null {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const s = parsed as Screen;
  if (!s.layout || typeof s.layout !== "object") s.layout = { type: "SingleColumnLayout", children: [] };
  s.layout.children = cleanKids(s.layout.children);
  // A Form container holds the real components — sanitise its children too so a
  // null/invalid entry inside a Form can't crash the render pipeline.
  for (const c of s.layout.children) {
    if (c.type === "Form" && "children" in c) c.children = cleanKids(c.children);
  }
  return s;
}

// Coerce a parsed value into a renderable flow, or return null if it can't be.
function normalizeFlow(parsed: unknown): FlowJSON | null {
  if (!parsed || typeof parsed !== "object") return null;
  const f = parsed as FlowJSON;
  if (!Array.isArray(f.screens) || f.screens.length === 0) return null;
  for (const s of f.screens) if (!normalizeScreen(s)) return null;
  return f;
}

function onJsonInput(): void {
  const raw = ($("#json") as HTMLTextAreaElement).value;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    setJsonStatus(false, "Invalid JSON: " + (err instanceof Error ? err.message : String(err)));
    return;
  }

  if (jsonScope !== FLOW_SCOPE) {
    const idx = flow.screens.findIndex((s) => s.id === jsonScope);
    if (idx < 0) { jsonScope = FLOW_SCOPE; syncJson(); return; } // scope vanished
    const screen = normalizeScreen(parsed);
    if (!screen) { setJsonStatus(false, t("jsonNeedsScreen")); return; }
    flow.screens[idx] = screen;
    if (typeof screen.id === "string" && screen.id) jsonScope = screen.id; // follow a rename
    setJsonStatus(true, t("valid"));
    buildJsonScopeDropdown();
    renderAll();
    return;
  }

  const normalized = normalizeFlow(parsed);
  if (!normalized) {
    setJsonStatus(false, "A flow needs a non-empty screens[] array of screen objects.");
    return;
  }
  flow = normalized;
  if (current >= flow.screens.length) current = 0;
  setJsonStatus(true, t("valid"));
  renderAll(); // refresh Build + Preview + Validation (does not rewrite the textarea)
}

function setJsonStatus(ok: boolean, msg: string): void {
  const el = $("#json-status");
  el.className = "json-status " + (ok ? "ok" : "err");
  el.textContent = msg;
}

// ---- Orchestration ------------------------------------------------------

function renderValidation(): void {
  const issues = validateFlow(flow);
  const errors = issues.filter((i) => i.level === "error").length;
  const warnings = issues.length - errors;

  // Nothing to report = no badge at all; it only speaks up when something's off.
  const badge = $("#val-badge");
  badge.style.display = issues.length === 0 ? "none" : "";
  if (errors > 0) { badge.className = "badge err"; badge.textContent = `${errors} ${t(errors > 1 ? "errors" : "error")}${warnings ? ` · ${warnings}⚠` : ""}`; }
  else if (warnings > 0) { badge.className = "badge warn"; badge.textContent = `${warnings} ${t(warnings > 1 ? "warnings" : "warning")}`; }
  else badge.textContent = "";

  const host = $("#validation");
  host.innerHTML = "";
  for (const issue of issues) host.appendChild(issueRow(issue));

  // Block generation while errors exist (warnings still allowed).
  const gen = $("#generate") as HTMLButtonElement;
  gen.disabled = errors > 0 || gen.classList.contains("busy");
  gen.title = errors > 0 ? `Fix ${errors} error${errors > 1 ? "s" : ""} before generating` : "";
}

// ---- Generate button feedback -------------------------------------------
// The main thread answers a generate with `generated` (or `error`), so the button
// can show progress and then confirm the screens landed on the canvas.

// Generating often finishes in well under a second, which made the bar/skeleton
// flash. Hold the busy state for at least this long so it reads as progress.
const MIN_BUSY_MS = 3000;

let genResetTimer = 0;
let genFinishTimer = 0;
let busyStartedAt = 0;

// Success arrived: switch to "done" once the minimum busy time has elapsed.
function finishGenerate(): void {
  clearTimeout(genFinishTimer);
  const remaining = Math.max(0, MIN_BUSY_MS - (performance.now() - busyStartedAt));
  genFinishTimer = window.setTimeout(() => setGenState("done"), remaining);
}

function setGenState(state: "idle" | "busy" | "done"): void {
  clearTimeout(genResetTimer);
  if (state !== "done") clearTimeout(genFinishTimer); // drop a pending finish
  if (state === "busy") busyStartedAt = performance.now();
  const btn = $("#generate") as HTMLButtonElement;
  const icon = btn.querySelector<HTMLElement>(".ic");
  const label = btn.querySelector<HTMLElement>("[data-i18n='generate']");
  btn.classList.toggle("busy", state === "busy");
  btn.classList.toggle("done", state === "done");
  // Drives the loading bar under the top bar and the skeletoned workspace.
  document.body.classList.toggle("generating", state === "busy");
  // Don't clobber the validation gate when returning to idle.
  const errors = validateFlow(flow).filter((i) => i.level === "error").length;
  btn.disabled = state === "busy" || errors > 0;
  if (icon) icon.replaceChildren(iconEl(state === "busy" ? "loader-circle" : state === "done" ? "check" : "sparkles", 16));
  if (label) label.textContent = t(state === "busy" ? "generating" : state === "done" ? "genDone" : "generate");
  if (state === "done") genResetTimer = window.setTimeout(() => setGenState("idle"), 2200);
}

function issueRow(issue: Issue): HTMLElement {
  const row = document.createElement("div");
  row.className = "val-item " + issue.level;
  const ico = document.createElement("span");
  ico.className = "val-ico";
  ico.appendChild(iconEl(issue.level === "error" ? "circle-alert" : "triangle-alert", 16));
  row.appendChild(ico);
  if (issue.screen) {
    const scr = document.createElement("span");
    scr.className = "val-scr"; scr.textContent = issue.screen;
    row.appendChild(scr);
  }
  const msg = document.createElement("span");
  msg.textContent = t(issue.key, issue.params);
  row.appendChild(msg);
  if (issue.screen) {
    row.onclick = () => {
      const idx = flow.screens.findIndex((s) => s.id === issue.screen);
      if (idx >= 0) { current = idx; renderAll(); }
    };
  }
  return row;
}

function renderAll(): void {
  renderScreens(); renderScreenMeta(); renderPalette(); renderComponentList();
  renderPreview(flow, $("#preview"), screen().id, errorScreenIds());
  renderValidation();
  buildJsonScopeDropdown(); // screens may have changed; keep the scope options fresh
}
function syncAndRender(): void { syncJson(); renderAll(); }

// Prop edits: sync the JSON, preview and validation without rebuilding the
// component cards (keeps input focus while typing).
function softSync(): void {
  syncJson();
  renderPreview(flow, $("#preview"), screen().id);
  renderValidation();
}
// Structural edits (add/remove option, change action shape): rebuild the cards.
function structuralSync(): void {
  renderComponentList();
  softSync();
}

// ---- Small DOM helpers --------------------------------------------------

function fieldLabel(t: string): HTMLElement {
  const l = document.createElement("label");
  l.className = "f"; l.textContent = t;
  return l;
}
function textField(value: string, onChange: (v: string) => void, placeholder = ""): HTMLInputElement {
  const inp = document.createElement("input");
  inp.type = "text"; inp.value = value; inp.placeholder = placeholder;
  inp.oninput = () => onChange(inp.value);
  return inp;
}
function iconBtn(name: string, onClick: () => void, title = ""): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = "icon-btn"; b.title = title; b.onclick = onClick;
  b.appendChild(iconEl(name, 16));
  return b;
}
function uniqueId(base: string): string {
  let n = flow.screens.length + 1;
  let id = `${base}_${n}`;
  const has = (x: string) => flow.screens.some((s) => s.id === x);
  while (has(id)) id = `${base}_${++n}`;
  return id;
}

// ---- Import & templates -------------------------------------------------

// Validate structure and load a flow from a template or file.
function loadFlow(parsed: unknown, sourceName: string): void {
  const normalized = normalizeFlow(parsed);
  if (!normalized) {
    postToMain({ type: "notify", message: `${sourceName}: not a valid Flow (needs a non-empty screens[] array).` });
    return;
  }
  flow = normalized;
  current = 0;
  jsonScope = FLOW_SCOPE; // a new flow has different screens — don't keep a stale scope
  collapseAllCards(flow);
  syncAndRender();
  const errors = validateFlow(flow).filter((i) => i.level === "error").length;
  postToMain({ type: "notify", message: errors ? `Loaded ${sourceName} — ${errors} validation error(s).` : `Loaded ${sourceName}.` });
}

function buildTemplateDropdown(): void {
  const host = $("#template");
  host.innerHTML = "";
  host.appendChild(createDropdown({
    value: "",
    placeholder: t("templatePlaceholder"),
    options: TEMPLATES.map((tpl, i) => ({ value: String(i), label: tpl.name })),
    resetAfterSelect: true,
    size: "mini",
    onChange: (v) => {
      const i = Number(v);
      if (TEMPLATES[i]) loadFlow(clone(TEMPLATES[i].flow), TEMPLATES[i].name);
      closeMenu();
    },
  }));
}

// ---- Actions drawer (right-side hamburger menu) -------------------------

// Mark everything but the drawer inert while it's open, so keyboard/AT focus
// stays trapped in the menu; move focus in on open and back to the trigger on close.
function setBackgroundInert(on: boolean): void {
  document.querySelectorAll<HTMLElement>(".topbar, .workspace").forEach((el) => {
    if (on) el.setAttribute("inert", "");
    else el.removeAttribute("inert");
  });
}
function openMenu(): void {
  $("#menu").classList.add("open");
  $("#menu-backdrop").classList.add("open");
  setBackgroundInert(true);
  $("#menu-close").focus();
}
function closeMenu(): void {
  if (!$("#menu").classList.contains("open")) return;
  $("#menu").classList.remove("open");
  $("#menu-backdrop").classList.remove("open");
  setBackgroundInert(false);
  $("#menu-btn").focus();
}
$("#menu-btn").addEventListener("click", openMenu);
$("#menu-close").addEventListener("click", closeMenu);
$("#menu-backdrop").addEventListener("click", closeMenu);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

// ---- Preferences: theme & language --------------------------------------

// Section defaults mirror the generator's (src/main/index.ts) — keep them in step.
const SECTION_BG_DEFAULT = "#353535";
const SECTION_RADIUS_DEFAULT = 24;

let prefs: Prefs = {
  theme: "system", lang: "en", os: "ios", previewTheme: "light", interactive: true, size: "md",
  showBusinessName: false, businessName: "Business name",
  sectionName: "", sectionColor: SECTION_BG_DEFAULT, sectionRadius: SECTION_RADIUS_DEFAULT,
};

// The WhatsApp-mockup options sent with a generate + used by the live preview.
const genOptions = (): GenOptions => ({
  os: prefs.os, theme: prefs.previewTheme, interactive: prefs.interactive, size: prefs.size,
  showBusinessName: prefs.showBusinessName, businessName: prefs.businessName,
  sectionName: prefs.sectionName, sectionColor: prefs.sectionColor, sectionRadius: prefs.sectionRadius,
});

// System = follow the OS/Figma theme (no data-theme); light/dark force it.
function applyTheme(theme: ThemePref): void {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

function applyLang(lang: Lang): void {
  setLang(lang);
  applyI18n(document);
  buildTemplateDropdown();
  buildMenuDropdowns(); // rebuild the combo boxes with translated labels + current values
  jsonScopeSig = ""; // force the JSON scope picker to rebuild with the new locale
  buildJsonScopeDropdown();
  if (offered) $("#offer-title").textContent = t("offerTitle", [offeredName]); // JS-built text
  renderAll();
}

function applyInteractive(on: boolean): void {
  setPreviewInteractive(on);
  const box = document.querySelector<HTMLInputElement>("#interactive-toggle");
  if (box) box.checked = on;
}

// Sync the switch + its name field with prefs, and hide the field when off.
// Never called while typing (it would rewrite the value under the caret).
function applyBusiness(show: boolean, name: string): void {
  setPreviewBusiness(show, name);
  const box = document.querySelector<HTMLInputElement>("#biz-toggle");
  if (box) box.checked = show;
  const input = document.querySelector<HTMLInputElement>("#biz-name");
  if (input) { input.value = name; input.hidden = !show; }
}

function applySize(size: ScreenSize): void { setPreviewSize(size); }
function applyWaTheme(theme: PreviewTheme): void { setPreviewTheme(theme); }

// Section fields only affect the generated Figma section, so there's nothing to
// re-render here — just reflect the saved values in the inputs. Like applyBusiness,
// never call this while typing: it would rewrite the value under the caret.
function applySection(p: Prefs): void {
  const name = document.querySelector<HTMLInputElement>("#section-name");
  if (name) name.value = p.sectionName;
  const color = document.querySelector<HTMLInputElement>("#section-color");
  if (color) color.value = p.sectionColor;
  const hex = document.querySelector<HTMLInputElement>("#section-hex");
  if (hex) { hex.value = p.sectionColor; hex.classList.remove("invalid"); }
  const radius = document.querySelector<HTMLInputElement>("#section-radius");
  if (radius) radius.value = String(p.sectionRadius);
}

// Typed hex -> "#rrggbb", or null when it isn't a colour. Accepts a missing "#" and
// the 3-digit shorthand, since both are what people actually type.
function normalizeHex(raw: string): string | null {
  const v = raw.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{6}$/.test(v)) return "#" + v;
  if (/^[0-9a-f]{3}$/.test(v)) return "#" + v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
  return null;
}

function refreshPreview(): void { renderPreview(flow, $("#preview"), screen().id, errorScreenIds()); }

// Build a menu combo box into its placeholder span. Rebuilt on language change
// so option labels retranslate and the shown value stays in sync with prefs.
function fillDropdown(sel: string, value: string, options: { value: string; label: string }[], onChange: (v: string) => void): void {
  const host = $(sel);
  host.innerHTML = "";
  host.appendChild(createDropdown({ value, options, size: "sm", onChange }));
}

function buildMenuDropdowns(): void {
  fillDropdown("#size-dd", prefs.size,
    [{ value: "sm", label: t("sizeSm") }, { value: "md", label: t("sizeMd") }, { value: "lg", label: t("sizeLg") }],
    (v) => { prefs = { ...prefs, size: v as ScreenSize }; applySize(prefs.size); refreshPreview(); savePrefs(); });

  fillDropdown("#wa-theme-dd", prefs.previewTheme,
    [{ value: "light", label: t("themeLight") }, { value: "dark", label: t("themeDark") }],
    (v) => { prefs = { ...prefs, previewTheme: v as PreviewTheme }; applyWaTheme(prefs.previewTheme); refreshPreview(); savePrefs(); });

  fillDropdown("#app-theme-dd", prefs.theme,
    [{ value: "system", label: t("themeSystem") }, { value: "light", label: t("themeLight") }, { value: "dark", label: t("themeDark") }],
    (v) => { prefs = { ...prefs, theme: v as ThemePref }; applyTheme(prefs.theme); savePrefs(); });

  fillDropdown("#lang-dd", prefs.lang,
    [{ value: "en", label: t("langEn") }, { value: "pt", label: t("langPt") }],
    (v) => { if (v !== prefs.lang) { prefs = { ...prefs, lang: v as Lang }; applyLang(prefs.lang); savePrefs(); } });
}

function applyPrefs(p: Prefs): void {
  prefs = { ...prefs, ...p };
  applyTheme(prefs.theme);
  applyLang(prefs.lang); // also (re)builds the menu combo boxes from prefs
  applyInteractive(prefs.interactive);
  applyBusiness(prefs.showBusinessName, prefs.businessName);
  applySection(prefs);
  applySize(prefs.size);
  applyWaTheme(prefs.previewTheme);
}

const savePrefs = (): void => postToMain({ type: "savePrefs", prefs });

$("#interactive-toggle").addEventListener("change", (e) => {
  prefs = { ...prefs, interactive: (e.target as HTMLInputElement).checked };
  applyInteractive(prefs.interactive);
  refreshPreview();
  savePrefs();
});

$("#biz-toggle").addEventListener("change", (e) => {
  prefs = { ...prefs, showBusinessName: (e.target as HTMLInputElement).checked };
  applyBusiness(prefs.showBusinessName, prefs.businessName);
  refreshPreview();
  savePrefs();
});

// Live-update the preview on every keystroke, but only persist on commit
// (blur/Enter) so typing a name isn't one clientStorage write per character.
$("#biz-name").addEventListener("input", (e) => {
  prefs = { ...prefs, businessName: (e.target as HTMLInputElement).value };
  setPreviewBusiness(prefs.showBusinessName, prefs.businessName);
  refreshPreview();
});
$("#biz-name").addEventListener("change", () => savePrefs());

// Section fields: nothing to re-render (they only shape the generated Figma
// section), so just track the value and persist on commit rather than per keystroke.
$("#section-name").addEventListener("input", (e) => {
  prefs = { ...prefs, sectionName: (e.target as HTMLInputElement).value };
});
$("#section-name").addEventListener("change", () => savePrefs());

// The swatch and the hex field are two views of one value: whichever you touch
// updates prefs and mirrors into the other.
$("#section-color").addEventListener("input", (e) => {
  prefs = { ...prefs, sectionColor: (e.target as HTMLInputElement).value };
  const hex = document.querySelector<HTMLInputElement>("#section-hex");
  if (hex) { hex.value = prefs.sectionColor; hex.classList.remove("invalid"); }
});
$("#section-color").addEventListener("change", () => savePrefs());

$("#section-hex").addEventListener("input", (e) => {
  const field = e.target as HTMLInputElement;
  const hex = normalizeHex(field.value);
  field.classList.toggle("invalid", hex === null && field.value.trim() !== "");
  if (!hex) return; // keep the last good colour while it's still half-typed
  prefs = { ...prefs, sectionColor: hex };
  const swatch = document.querySelector<HTMLInputElement>("#section-color");
  if (swatch) swatch.value = hex;
});
// On commit, snap the field back to the value in effect so junk can't linger.
$("#section-hex").addEventListener("change", () => { applySection(prefs); savePrefs(); });

// Empty or out-of-range input falls back to the default rather than reaching the
// generator. Note `Number("") === 0`, so the emptiness check has to come first —
// otherwise clearing the field would silently mean "radius 0".
$("#section-radius").addEventListener("input", (e) => {
  const raw = (e.target as HTMLInputElement).value.trim();
  const n = Number(raw);
  const ok = raw !== "" && isFinite(n) && n >= 0;
  prefs = { ...prefs, sectionRadius: ok ? Math.min(n, 200) : SECTION_RADIUS_DEFAULT };
});
$("#section-radius").addEventListener("change", () => { applySection(prefs); savePrefs(); });

// ---- Import offer (user clicked a generated section in Figma) -------------

let offered: FlowJSON | null = null;
let offeredName = "";

function showOffer(name: string, f: FlowJSON): void {
  offered = f;
  offeredName = name;
  $("#offer-title").textContent = t("offerTitle", [name]);
  $("#offer").classList.add("open");
}
function hideOffer(): void {
  offered = null;
  $("#offer").classList.remove("open");
}
$("#offer-cancel").addEventListener("click", hideOffer);
$("#offer-import").addEventListener("click", () => {
  const f = offered;
  const name = offeredName;
  hideOffer();
  if (f) loadFlow(f, name); // replaces the current flow, same path as file import
});

// Messages from the main thread: saved prefs on startup, import offers on click.
window.addEventListener("message", (e: MessageEvent) => {
  const msg = (e.data && (e.data as { pluginMessage?: unknown }).pluginMessage) as
    { type?: string; prefs?: Prefs; name?: string; flow?: FlowJSON } | undefined;
  if (!msg) return;
  if (msg.type === "prefs" && msg.prefs) applyPrefs(msg.prefs);
  else if (msg.type === "importOffer" && msg.flow) showOffer(msg.name ?? "Figma", msg.flow);
  else if (msg.type === "importOfferEnd") hideOffer(); // selection left the section
  else if (msg.type === "generated") finishGenerate(); // honours the minimum busy time
  else if (msg.type === "error") setGenState("idle");  // failures surface right away
});

$("#import").addEventListener("click", () => { closeMenu(); ($("#file") as HTMLInputElement).click(); });
$("#file").addEventListener("change", (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try { loadFlow(JSON.parse(String(reader.result)), file.name); }
    catch (err) { postToMain({ type: "notify", message: `Import failed: ${err instanceof Error ? err.message : String(err)}` }); }
    input.value = "";
  };
  reader.readAsText(file);
});

// ---- Wiring -------------------------------------------------------------

document.querySelectorAll(".tab").forEach((t) => {
  t.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((x) => { x.classList.remove("active"); x.setAttribute("aria-selected", "false"); });
    t.classList.add("active");
    t.setAttribute("aria-selected", "true");
    const name = (t as HTMLElement).dataset.tab;
    $("#panel-build").classList.toggle("active", name === "build");
    $("#panel-preview").classList.toggle("active", name === "preview");
    $("#panel-json").classList.toggle("active", name === "json");
    // The screen rail only belongs to Build: Preview has its own screen tabs and
    // Flow JSON just shows code.
    $("#screens").style.display = name === "build" ? "" : "none";
    if (name === "preview") renderPreview(flow, $("#preview"), screen().id, errorScreenIds());
  });
});

$("#json").addEventListener("input", onJsonInput);

$("#generate").addEventListener("click", () => {
  setGenState("busy");
  postToMain({ type: "generate", flow, options: genOptions() });
});

$("#copy").addEventListener("click", () => {
  closeMenu();
  // Don't hand out JSON that won't import — the copied flow is always meant to be
  // pasted into the Playground. Warnings are advisory and still allowed.
  const errors = validateFlow(flow).filter((i) => i.level === "error").length;
  if (errors > 0) {
    postToMain({ type: "notify", message: `Fix ${errors} error${errors > 1 ? "s" : ""} before copying — the JSON won't import.` });
    return;
  }
  const text = JSON.stringify(flow, null, 2);
  navigator.clipboard?.writeText(text).then(
    () => postToMain({ type: "notify", message: "Flow JSON copied to clipboard." }),
    () => postToMain({ type: "notify", message: "Copy failed — use the Flow JSON tab." }),
  );
});

applyThemeVars();
applyIcons(document);
collapseAllCards(flow); // the sample flow opens collapsed, like an imported one
applyPrefs(prefs); // default en / system; overwritten when the main thread sends saved prefs
syncJson();
