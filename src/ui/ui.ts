// Plugin UI: a lightweight WhatsApp Flows "playground" — compose screens with a
// palette, edit the Flow JSON live (two-way), export it, and generate in Figma.
import type { FlowJSON, Screen } from "../model/flowTypes";
import { PALETTE } from "../model/palette";
import { SAMPLE_FLOW } from "../model/sample";
import { TEMPLATES } from "../model/templates";
import { postToMain } from "../shared/messages";
import { renderPreview, applyThemeVars } from "./preview";
import { validateFlow, type Issue } from "../model/validate";
import { buildPropEditor } from "./propEditor";
import { iconEl, applyIcons } from "./icons";
import { createDropdown } from "./dropdown";
import { t, setLang, applyI18n, type Lang } from "./i18n";
import type { Prefs, ThemePref } from "../shared/messages";

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
      x.appendChild(iconEl("x", 13));
      x.onclick = (e) => { e.stopPropagation(); flow.screens.splice(i, 1); current = Math.max(0, current - (i <= current ? 1 : 0)); syncAndRender(); };
      chip.appendChild(x);
    }
    host.appendChild(chip);
  });
  const add = document.createElement("button");
  add.className = "chip add"; add.title = "Add screen";
  add.appendChild(iconEl("plus", 13));
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
  cb.onchange = () => { s.terminal = cb.checked || undefined; renderScreens(); syncJson(); };
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
    resetAfterSelect: true,
    onChange: (type) => {
      const entry = PALETTE.find((e) => e.type === type);
      if (entry) { screen().layout.children.push(entry.make()); syncAndRender(); }
    },
  }));
}

function renderComponentList(): void {
  const host = $("#comp-list");
  const kids = screen().layout.children;
  host.innerHTML = "";
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

    // Clickable header: collapse chevron + type name + (collapsed) value summary.
    const head = document.createElement("div");
    head.className = "comp-head";
    const chev = document.createElement("span");
    chev.className = "comp-chev";
    chev.appendChild(iconEl(isCollapsed ? "chevron-right" : "chevron-down", 15));
    const type = document.createElement("span");
    type.className = "type"; type.textContent = c.type;
    const sum = document.createElement("span");
    sum.className = "comp-sum"; sum.textContent = summaryOf(c);
    head.append(chev, type, sum);
    head.onclick = () => {
      const collapse = !card.classList.contains("collapsed");
      card.classList.toggle("collapsed", collapse);
      if (collapse) { COLLAPSED.add(c); sum.textContent = summaryOf(c); }
      else COLLAPSED.delete(c);
      chev.replaceChildren(iconEl(collapse ? "chevron-right" : "chevron-down", 15));
    };
    row.appendChild(head);

    row.appendChild(iconBtn("chevron-up", () => move(i, -1), "Move up"));
    row.appendChild(iconBtn("chevron-down", () => move(i, +1), "Move down"));
    row.appendChild(iconBtn("trash-2", () => { kids.splice(i, 1); syncAndRender(); }, "Remove"));
    card.appendChild(row);

    const ids = flow.screens.map((s) => s.id);
    const editor = buildPropEditor(c, ids, { soft: softSync, structural: structuralSync });
    editor.classList.add("comp-body");
    card.appendChild(editor);
    host.appendChild(card);
  });
}

// Tracks which components are collapsed, keyed by the component object so the
// state survives reorders and re-renders (reset only when the flow is replaced).
const COLLAPSED = new WeakSet<object>();

// Short preview of a component's value, shown in the header when collapsed.
function summaryOf(c: { text?: unknown; label?: unknown; name?: unknown }): string {
  const v = c.text ?? c.label ?? c.name ?? "";
  return typeof v === "string" ? v : "";
}

function move(i: number, dir: number): void {
  const kids = screen().layout.children;
  const j = i + dir;
  if (j < 0 || j >= kids.length) return;
  [kids[i], kids[j]] = [kids[j], kids[i]];
  syncAndRender();
}

// ---- JSON two-way sync --------------------------------------------------

function syncJson(): void {
  ($("#json") as HTMLTextAreaElement).value = JSON.stringify(flow, null, 2);
  setJsonStatus(true, t("valid"));
}

// Coerce a parsed value into a renderable flow, or return null if it can't be.
// Guards the render pipeline against structurally-valid-but-broken input
// (empty screens, a screen with no layout/children, null entries in children).
function normalizeFlow(parsed: unknown): FlowJSON | null {
  if (!parsed || typeof parsed !== "object") return null;
  const f = parsed as FlowJSON;
  if (!Array.isArray(f.screens) || f.screens.length === 0) return null;
  for (const s of f.screens) {
    if (!s || typeof s !== "object") return null;
    if (!s.layout || typeof s.layout !== "object") s.layout = { type: "SingleColumnLayout", children: [] };
    if (!Array.isArray(s.layout.children)) s.layout.children = [];
    s.layout.children = s.layout.children.filter(
      (c) => !!c && typeof c === "object" && typeof (c as { type?: unknown }).type === "string",
    );
  }
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

  const badge = $("#val-badge");
  if (issues.length === 0) { badge.className = "badge ok"; badge.textContent = "✓ " + t("valid"); }
  else if (errors > 0) { badge.className = "badge err"; badge.textContent = `${errors} ${t(errors > 1 ? "errors" : "error")}${warnings ? ` · ${warnings}⚠` : ""}`; }
  else { badge.className = "badge warn"; badge.textContent = `${warnings} ${t(warnings > 1 ? "warnings" : "warning")}`; }

  const host = $("#validation");
  host.innerHTML = "";
  for (const issue of issues) host.appendChild(issueRow(issue));

  // Block generation while errors exist (warnings still allowed).
  const gen = $("#generate") as HTMLButtonElement;
  gen.disabled = errors > 0;
  gen.title = errors > 0 ? `Fix ${errors} error${errors > 1 ? "s" : ""} before generating` : "";
}

function issueRow(issue: Issue): HTMLElement {
  const row = document.createElement("div");
  row.className = "val-item " + issue.level;
  const ico = document.createElement("span");
  ico.className = "val-ico";
  ico.appendChild(iconEl(issue.level === "error" ? "circle-alert" : "triangle-alert", 13));
  row.appendChild(ico);
  if (issue.screen) {
    const scr = document.createElement("span");
    scr.className = "val-scr"; scr.textContent = issue.screen;
    row.appendChild(scr);
  }
  const msg = document.createElement("span");
  msg.textContent = issue.message;
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
  b.appendChild(iconEl(name, 15));
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

function openMenu(): void {
  $("#menu").classList.add("open");
  $("#menu-backdrop").classList.add("open");
}
function closeMenu(): void {
  $("#menu").classList.remove("open");
  $("#menu-backdrop").classList.remove("open");
}
$("#menu-btn").addEventListener("click", openMenu);
$("#menu-close").addEventListener("click", closeMenu);
$("#menu-backdrop").addEventListener("click", closeMenu);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

// ---- Preferences: theme & language --------------------------------------

let prefs: Prefs = { theme: "system", lang: "en" };

// System = follow the OS/Figma theme (no data-theme); light/dark force it.
function applyTheme(theme: ThemePref): void {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  document.querySelectorAll<HTMLElement>("#theme-seg .seg-item").forEach((b) =>
    b.classList.toggle("active", b.dataset.themeOpt === theme));
}

function applyLang(lang: Lang): void {
  setLang(lang);
  applyI18n(document);
  document.querySelectorAll<HTMLElement>("#lang-seg .seg-item").forEach((b) =>
    b.classList.toggle("active", b.dataset.langOpt === lang));
  buildTemplateDropdown();
  renderAll();
}

function applyPrefs(p: Prefs): void {
  prefs = p;
  applyTheme(p.theme);
  applyLang(p.lang);
}

const savePrefs = (): void => postToMain({ type: "savePrefs", prefs });

document.querySelectorAll<HTMLElement>("#theme-seg .seg-item").forEach((b) =>
  b.addEventListener("click", () => {
    prefs = { ...prefs, theme: b.dataset.themeOpt as ThemePref };
    applyTheme(prefs.theme);
    savePrefs();
  }));
document.querySelectorAll<HTMLElement>("#lang-seg .seg-item").forEach((b) =>
  b.addEventListener("click", () => {
    prefs = { ...prefs, lang: b.dataset.langOpt as Lang };
    applyLang(prefs.lang);
    savePrefs();
  }));

// Saved prefs pushed from the main thread on startup.
window.addEventListener("message", (e: MessageEvent) => {
  const msg = (e.data && (e.data as { pluginMessage?: unknown }).pluginMessage) as { type?: string; prefs?: Prefs } | undefined;
  if (msg && msg.type === "prefs" && msg.prefs) applyPrefs(msg.prefs);
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
    document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    const name = (t as HTMLElement).dataset.tab;
    $("#panel-build").classList.toggle("active", name === "build");
    $("#panel-preview").classList.toggle("active", name === "preview");
    $("#panel-json").classList.toggle("active", name === "json");
    if (name === "preview") renderPreview(flow, $("#preview"), screen().id, errorScreenIds());
  });
});

$("#json").addEventListener("input", onJsonInput);

$("#generate").addEventListener("click", () => postToMain({ type: "generate", flow }));

$("#copy").addEventListener("click", () => {
  closeMenu();
  const text = JSON.stringify(flow, null, 2);
  navigator.clipboard?.writeText(text).then(
    () => postToMain({ type: "notify", message: "Flow JSON copied to clipboard." }),
    () => postToMain({ type: "notify", message: "Copy failed — use the Flow JSON tab." }),
  );
});

applyThemeVars();
applyIcons(document);
applyPrefs(prefs); // default en / system; overwritten when the main thread sends saved prefs
syncJson();
