// Plugin UI: a WhatsApp Flows "playground" — compose screens, edit the Flow
// JSON live (two-way), preview a phone mockup and generate in Figma. The chrome
// is the rail + panel structure of knowledge/NEW_UI.md: a navigation rail
// (Flows · Chat · Settings) beside one panel that shows a single screen at a
// time, built from the components in components.ts.
import type { FlowJSON, Screen, Component } from "../model/flowTypes";
import { screenChildren } from "../model/flowTypes";
import { PALETTE, type PaletteEntry } from "../model/palette";
import { SAMPLE_FLOW, sampleFlow } from "../model/sample";
import { templates } from "../model/templates";
import { postToMain } from "./bridge";
import { renderPreview, applyThemeVars, setPreviewInteractive, setPreviewSize, setPreviewTheme, setPreviewBusiness, setPreviewChat } from "./preview";
import { renderChat } from "./chat";
import { renderComposer, addMessage } from "./chatComposer";
import { sampleThread, type Thread } from "../model/chatTypes";
import { CHAT_PALETTE, CHAT_PALETTE_GROUPS } from "../model/chatPalette";
import { validateFlow, type Issue } from "../model/validate";
import { buildPropEditor } from "./propEditor";
import { applyIcons } from "./icons";
import { createDropdown } from "./dropdown";
import { startDrag } from "./drag";
import { t, setLang, applyI18n, type Lang } from "./i18n";
import * as C from "./components";
import type { Prefs, ThemePref, GenOptions, ScreenSize, PreviewTheme, Mode } from "../shared/messages";

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

let flow: FlowJSON = clone(SAMPLE_FLOW);
let flowName = ""; // the template or file the flow came from; empty = the sample
let current = 0; // selected screen index

function screen(): Screen {
  return flow.screens[current];
}

// ---- Routing ------------------------------------------------------------
// One screen at a time in the panel. Each rail destination has a root screen;
// the others drill in from it and come back with the toolbar's Back.

type Route = "home" | "screen" | "library" | "preview" | "json" | "chat" | "chatAdd" | "chatPreview" | "settings" | "pick";
type PickerId = "template" | "headerStyle" | "size" | "waTheme" | "appTheme" | "lang";

const PARENT: Record<Route, Route> = {
  home: "home", screen: "home", library: "screen", preview: "home", json: "home",
  chat: "chat", chatAdd: "chat", chatPreview: "chat",
  settings: "settings", pick: "settings",
};
const railOf = (r: Route): C.RailKey => (r.startsWith("chat") ? "chat" : r === "settings" || r === "pick" ? "settings" : "flows");

let route: Route = "home";
let picker: PickerId = "template";
let pickedFrom: Route = "settings"; // a picker returns to the screen that opened it

function go(r: Route, p?: PickerId): void {
  if (r === "pick" && route !== "pick") pickedFrom = route;
  route = r;
  if (p) picker = p;
  render();
  $("#body").scrollTop = 0;
}
const back = (): void => go(route === "pick" ? pickedFrom : PARENT[route]);

interface ScreenView { toolbar: HTMLElement; body: HTMLElement[]; foot?: HTMLElement }

function render(): void {
  const view = SCREENS[route]();
  $("#toolbar-host").replaceChildren(view.toolbar);
  $("#body").replaceChildren(...view.body);
  $("#foot-host").replaceChildren(...(view.foot ? [view.foot] : []));
  C.setRailActive($("#rail-host"), railOf(route));
  document.body.dataset.route = route;
  repaintGenerate();
}

// ---- Icons and summaries for the lists ------------------------------------

const TYPE_ICON: Record<string, string> = {
  TextHeading: "type", TextSubheading: "type", TextBody: "type", TextCaption: "type", RichText: "type",
  TextInput: "text-cursor-input", TextArea: "text-cursor-input", DatePicker: "calendar", CalendarPicker: "calendar",
  PhotoPicker: "image", DocumentPicker: "file-text", OptIn: "square-check",
  RadioButtonsGroup: "circle-dot", CheckboxGroup: "square-check", Dropdown: "chevrons-up-down", ChipsSelector: "tag",
  Image: "image", ImageCarousel: "image", NavigationList: "list", EmbeddedLink: "link",
  Footer: "mouse-pointer-click", Form: "frame",
};
const GROUP_ICON: Record<PaletteEntry["group"], string> = {
  Text: "type", Input: "text-cursor-input", Selection: "list-checks", Media: "image", Action: "corner-down-right",
};
const typeIcon = (type: string): string => TYPE_ICON[type] ?? "box";

// One line under a component's type: the text people would recognise it by.
function componentSummary(c: Component): string {
  const r = c as Record<string, unknown>;
  const ds = r["data-source"];
  const opts = Array.isArray(ds) ? ` · ${t("nOptions", [ds.length])}` : "";
  if (c.type === "Footer") {
    const action = r["on-click-action"] as { name?: string; next?: { name?: string } } | undefined;
    const target = action?.next?.name;
    return `${String(r.label ?? "")}${target ? ` → ${target}` : action?.name ? ` · ${action.name}` : ""}`;
  }
  if (c.type === "NavigationList") return t("nItems", [(r["list-items"] as unknown[] | undefined)?.length ?? 0]);
  if (c.type === "ImageCarousel") return t("nItems", [(r.images as unknown[] | undefined)?.length ?? 0]);
  if (c.type === "Image") return "base64";
  if (typeof r.text === "string") return r.text;
  return `${String(r.label ?? "")}${opts}`;
}

function screenSummary(s: Screen): string {
  const n = screenChildren(s).length;
  return `${s.title ?? ""} · ${t("nComponents", [n])}${s.terminal ? ` · ${t("terminal").toLowerCase()}` : ""}`;
}

// ---- Validation -----------------------------------------------------------

// Screen ids that carry at least one error-level validation issue.
function errorScreenIds(): Set<string> {
  const set = new Set<string>();
  for (const issue of validateFlow(flow)) if (issue.level === "error" && issue.screen) set.add(issue.screen);
  return set;
}
const errorCount = (): number => validateFlow(flow).filter((i) => i.level === "error").length;

// The banner on Flow home: one line for the state, then the issues under it.
function validationBlock(): HTMLElement {
  const issues = validateFlow(flow);
  const errors = issues.filter((i) => i.level === "error").length;
  const warnings = issues.length - errors;
  const host = C.el("div", "ui-list");
  host.id = "validation";
  if (errors > 0) host.append(C.banner("err", errors === 1 ? t("errorFound") : t("errorsFound", [errors])));
  else if (warnings > 0) host.append(C.banner("warn", warnings === 1 ? t("warningFound") : t("warningsFound", [warnings])));
  else host.append(C.banner("ok", t("validOk")));
  for (const issue of issues) host.append(issueRow(issue));
  return host;
}

function issueRow(issue: Issue): HTMLElement {
  const row = C.el(issue.screen ? "button" : "div", `ui-issue ${issue.level}`);
  if (issue.screen) (row as HTMLButtonElement).type = "button";
  row.append(C.ic(issue.level === "error" ? "circle-alert" : "triangle-alert", "sm"));
  if (issue.screen) row.append(C.el("b", "", issue.screen));
  row.append(C.el("span", "", t(issue.key, issue.params)));
  if (issue.screen) {
    row.addEventListener("click", () => {
      const idx = flow.screens.findIndex((s) => s.id === issue.screen);
      if (idx >= 0) { current = idx; go("screen"); }
    });
  }
  return row;
}

// ---- Screen 01 · Flow home ------------------------------------------------

function flowTitle(): string { return flowName || t("flowUntitled"); }
function flowMeta(): string {
  if (isLinked()) return t("linkedMeta", [linkedName]);
  const n = flow.screens.length;
  return n === 1 ? t("flowMetaOne", [flow.version]) : t("flowMeta", [n, flow.version]);
}

function homeScreen(): ScreenView {
  const actions: HTMLElement[] = [];
  if (isLinked()) actions.push(C.button({ icon: "link", title: t("unlink"), onClick: () => { setLinkedSection(undefined, ""); render(); } }));
  actions.push(generateButton());
  const toolbar = C.toolbar({ title: flowTitle(), meta: flowMeta(), actions });

  const list = C.el("div", "ui-list");
  const errs = errorScreenIds();
  flow.screens.forEach((s, i) => {
    const card = C.card({
      icon: "phone", title: s.id, subtitle: screenSummary(s), selected: i === current,
      gripTitle: t("dragToReorder"), onClick: () => { current = i; go("screen"); },
    });
    if (errs.has(s.id)) card.classList.add("err");
    card.querySelector(".ui-grip")?.addEventListener("pointerdown", (e) => {
      const sel = flow.screens[current];
      startDrag(e as PointerEvent, card, list, flow.screens, () => { current = Math.max(0, flow.screens.indexOf(sel)); syncAndRender(); });
    });
    list.append(card);
  });
  const screens = C.section({ heading: t("screens"), hint: flow.screens.length > 1 ? t("dragToReorder") : undefined },
    validationBlock(), list,
    C.row({ icon: "plus", label: t("newScreen"), trailing: "none", action: true, onClick: () => {
      const id = uniqueId("SCREEN");
      flow.screens.push({ id, title: "New screen", layout: { type: "SingleColumnLayout", children: [] } });
      current = flow.screens.length - 1;
      syncJson();
      go("screen");
    } }),
  );

  const view = C.section({ heading: t("view") },
    C.row({ icon: "eye", label: t("livePreview"), onClick: () => go("preview") }),
    C.row({ icon: "code-xml", label: t("flowJson"), onClick: () => go("json") }),
  );
  const flowSec = C.section({ heading: t("groupFlow") },
    C.row({ icon: "layout-template", label: t("template"), trailing: "value", value: flowName || t("templateNone"), onClick: () => go("pick", "template") }),
    C.row({ icon: "import", label: t("import"), trailing: "none", action: true, onClick: () => ($("#file") as HTMLInputElement).click() }),
    C.row({ icon: "copy", label: t("copy"), trailing: "none", action: true, onClick: copyJson }),
  );
  return { toolbar, body: [screens, C.divider(), view, C.divider(), flowSec] };
}

// ---- Screen 02 · Screen editor -------------------------------------------

function screenEditor(): ScreenView {
  const s = screen();
  const actions = [C.button({ icon: "eye", title: t("livePreview"), onClick: () => go("preview") })];
  if (flow.screens.length > 1) {
    actions.push(C.button({ icon: "trash-2", title: t("deleteScreen"), onClick: () => {
      flow.screens.splice(current, 1);
      current = Math.max(0, current - 1);
      syncJson();
      go("home");
    } }));
  }
  const toolbar = C.toolbar({ title: s.id, meta: t("screenMeta", [current + 1, flow.screens.length]), back: { title: t("back"), onClick: back }, actions });

  const idField = C.field({ label: t("screenId"), value: s.id, required: true, mono: true, onInput: (v) => {
    s.id = v.trim() || s.id;
    C.setToolbarText(toolbar, s.id);
    softSync();
  } });
  const titleField = C.field({ label: t("title"), value: s.title ?? "", required: true, onInput: (v) => { s.title = v; softSync(); } });
  // Keep `success` in lockstep with `terminal` — it's a terminal-only property,
  // so a stale `success` on a non-terminal screen would be rejected on import.
  const terminal = C.row({ icon: "flag", label: t("terminalScreen"), trailing: "toggle", toggle: { on: !!s.terminal, onChange: (on) => {
    s.terminal = on || undefined;
    s.success = on ? true : undefined;
    softSync();
  } } });
  const meta = C.section({ heading: t("screenSection") }, idField, titleField, terminal);

  const kids = screenChildren(s);
  const list = C.el("div", "ui-list");
  list.id = "comp-list";
  kids.forEach((c, i) => list.append(componentCard(c, i, kids, list)));
  if (kids.length === 0) list.append(C.hint("box", t("noComponents")));
  const comps = C.section({
    heading: t("components"),
    action: kids.length ? { label: t(anyExpanded() ? "collapseAll" : "expandAll"), onClick: () => {
      const collapse = anyExpanded();
      for (const c of kids) { if (collapse) COLLAPSED.add(c); else COLLAPSED.delete(c); }
      structuralSync();
    } } : undefined,
  }, list);

  const foot = C.el("div", "ui-foot", C.button({ icon: "plus", label: t("addComponent"), style: "soft", onClick: () => go("library") }));
  return { toolbar, body: [meta, comps], foot };
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
const anyExpanded = (): boolean => screenChildren(screen()).some((c) => !COLLAPSED.has(c));

// A duplicate can't reuse the source's `name`: names must be unique per screen
// (validate.ts vDupName), so a verbatim copy would always land as an error.
function uniqueComponentName(base: string, kids: Component[]): string {
  const taken = new Set(kids.map((k) => k.name).filter((n): n is string => !!n));
  const stem = base.replace(/_\d+$/, "");
  let n = 2;
  while (taken.has(`${stem}_${n}`)) n++;
  return `${stem}_${n}`;
}

function componentCard(c: Component, i: number, kids: Component[], list: HTMLElement): HTMLElement {
  const drag = (card: HTMLElement) => (e: Event) => startDrag(e as PointerEvent, card, list, kids, syncAndRender);
  if (COLLAPSED.has(c)) {
    const card = C.card({ icon: typeIcon(c.type), title: c.type, subtitle: componentSummary(c), gripTitle: t("dragToReorder"),
      onClick: () => { COLLAPSED.delete(c); structuralSync(); } });
    card.querySelector(".ui-grip")?.addEventListener("pointerdown", drag(card));
    return card;
  }
  const ids = flow.screens.map((s) => s.id);
  let card: HTMLElement;
  const editor = buildPropEditor(c, ids, {
    soft: () => { C.setCardText(card, c.type, componentSummary(c)); softSync(); },
    structural: structuralSync,
  });
  card = C.cardExpanded({
    icon: typeIcon(c.type), title: c.type, subtitle: componentSummary(c), body: editor, gripTitle: t("dragToReorder"),
    onCollapse: () => { COLLAPSED.add(c); structuralSync(); },
    actions: [
      C.button({ icon: "copy", label: t("duplicate"), sm: true, onClick: () => {
        const copy = clone(c); // deep copy: the duplicate keeps every filled value
        if (copy.name) copy.name = uniqueComponentName(copy.name, kids);
        kids.splice(i + 1, 0, copy); // right below the original
        syncAndRender();
      } }),
      C.button({ icon: "trash-2", label: t("remove"), sm: true, onClick: () => { kids.splice(i, 1); syncAndRender(); } }),
    ],
  });
  card.querySelector(".ui-grip")?.addEventListener("pointerdown", drag(card));
  return card;
}

// ---- Screen 03 · Component library ---------------------------------------

const PALETTE_GROUPS = ["Text", "Input", "Selection", "Media", "Action"] as const;
const openGroups = new Set<string>(["Text"]);

function libraryScreen(): ScreenView {
  const toolbar = C.toolbar({ title: t("addComponent"), meta: t("addComponentTo", [screen().id]), back: { title: t("back"), onClick: back } });
  const list = C.el("div", "ui-list");
  list.id = "library";
  let q = ""; // per visit: the field opens empty, so the list must too
  const paint = (): void => {
    list.replaceChildren();
    for (const g of PALETTE_GROUPS) {
      const entries = PALETTE.filter((e) => e.group === g && (!q || e.label.toLowerCase().includes(q) || e.type.toLowerCase().includes(q)));
      if (!entries.length) continue;
      const open = q ? true : openGroups.has(g);
      list.append(C.row({ icon: GROUP_ICON[g], label: g, trailing: "count", count: entries.length, on: open, onClick: () => {
        if (openGroups.has(g)) openGroups.delete(g); else openGroups.add(g);
        paint();
      } }));
      if (!open) continue;
      for (const e of entries) {
        list.append(C.card({ icon: typeIcon(e.type), title: e.label, subtitle: e.type, plain: true, trailing: "none", onClick: () => {
          const made = e.make();
          screenChildren(screen()).push(made);
          COLLAPSED.delete(made); // a freshly added component opens ready to edit
          syncJson();
          go("screen");
        } }));
      }
    }
    if (!list.children.length) list.append(C.hint("search", t("noMatches")));
  };
  paint();
  const search = C.section({ heading: t("search") }, C.searchField({ placeholder: t("searchComponent"), onInput: (v) => { q = v.trim().toLowerCase(); paint(); } }));
  const comps = C.section({ heading: t("components") }, list, C.hint("mouse-pointer-click", t("componentHint")));
  return { toolbar, body: [search, comps] };
}

// ---- Screen 04 · Live preview ---------------------------------------------

function previewScreen(): ScreenView {
  const toolbar = C.toolbar({
    title: t("livePreview"), meta: prefs.interactive ? t("previewMeta") : "", back: { title: t("back"), onClick: back },
    actions: [C.button({ icon: prefs.previewTheme === "dark" ? "sun" : "moon", title: t("waTheme"), onClick: () => {
      setWaTheme(prefs.previewTheme === "dark" ? "light" : "dark");
      render();
    } })],
  });
  const host = C.el("div", "");
  host.id = "preview";
  const sec = C.section({ tight: true }, host);
  // Lay out after the host is in the document: the phone scales to its width.
  queueMicrotask(() => renderPreview(flow, host, screen().id, errorScreenIds()));
  return { toolbar, body: [sec] };
}

// ---- Screen 05 · Flow JSON ------------------------------------------------

function jsonScreen(): ScreenView {
  const toolbar = C.toolbar({ title: t("flowJson"), meta: t("jsonMeta"), back: { title: t("back"), onClick: back },
    actions: [C.button({ icon: "copy", label: t("copyShort"), onClick: copyJson })] });
  const scope = C.el("div", "ui-field", C.el("label", "ui-field-label", C.el("span", "", t("jsonScope"))));
  const scopeHost = C.el("div", "ui-dd-host");
  scopeHost.id = "json-scope";
  scope.append(scopeHost);
  const ta = C.el("textarea", "ui-code");
  ta.id = "json"; ta.spellcheck = false;
  ta.addEventListener("input", onJsonInput);
  const status = C.el("div", "ui-status");
  status.id = "json-status";
  const sec = C.section({ tight: true }, scope, ta, status, C.hint("code-xml", t("jsonHint")));
  jsonScopeSig = ""; // the dropdown host is new
  queueMicrotask(syncJson);
  return { toolbar, body: [sec] };
}

// ---- Screens 06–08 · Chat --------------------------------------------------

// Chat mode: a sample thread stands in until something is composed
// (knowledge/CHAT_UI.md); the composer mutates it in place.
const thread: Thread = sampleThread();

function chatScreen(): ScreenView {
  const toolbar = C.toolbar({ title: t("chatTitle"), meta: t("chatMeta", [thread.messages.length]),
    actions: [C.button({ icon: "eye", title: t("chatPreviewTitle"), onClick: () => go("chatPreview") }), generateButton()] });
  const host = C.el("div", "");
  host.id = "chat-composer";
  renderComposer(thread, host, () => C.setToolbarText(toolbar, t("chatTitle"), t("chatMeta", [thread.messages.length])));
  const foot = C.el("div", "ui-foot", C.button({ icon: "plus", label: t("chatAddTitle"), style: "soft", onClick: () => go("chatAdd") }));
  return { toolbar, body: [host], foot };
}

const CHAT_ICON: Record<string, string> = {
  "text-in": "message-square-text", "text-out": "message-square-text", image: "image", video: "video",
  document: "file-text", audio: "mic", buttons: "reply", list: "list", flow: "workflow", template: "layout-template",
};
const CHAT_GROUP_ICON: Record<string, string> = { Text: "message-square-text", Media: "image", Interactive: "mouse-pointer-click" };
const openChatGroups = new Set<string>(["Text", "Media", "Interactive"]);

function chatAddScreen(): ScreenView {
  const toolbar = C.toolbar({ title: t("chatAddTitle"), meta: t("chatAddMeta"), back: { title: t("back"), onClick: back } });
  const list = C.el("div", "ui-list");
  let q = "";
  const paint = (): void => {
    list.replaceChildren();
    for (const g of CHAT_PALETTE_GROUPS) {
      const entries = CHAT_PALETTE.filter((e) => e.group === g && (!q || e.label.toLowerCase().includes(q)));
      if (!entries.length) continue;
      const open = q ? true : openChatGroups.has(g);
      list.append(C.row({ icon: CHAT_GROUP_ICON[g], label: g, trailing: "count", count: entries.length, on: open, onClick: () => {
        if (openChatGroups.has(g)) openChatGroups.delete(g); else openChatGroups.add(g);
        paint();
      } }));
      if (!open) continue;
      for (const e of entries) {
        list.append(C.card({ icon: CHAT_ICON[e.key] ?? "message-square-text", title: e.label, plain: true, trailing: "none",
          onClick: () => { addMessage(thread, e.key); go("chat"); } }));
      }
    }
    if (!list.children.length) list.append(C.hint("search", t("noMatches")));
  };
  paint();
  const search = C.section({ heading: t("search") }, C.searchField({ placeholder: t("chatSearchMessage"), onInput: (v) => { q = v.trim().toLowerCase(); paint(); } }));
  const types = C.section({ heading: t("chatType") }, list, C.hint("mouse-pointer-click", t("chatMessageHint")));
  return { toolbar, body: [search, types] };
}

function chatPreviewScreen(): ScreenView {
  const toolbar = C.toolbar({ title: t("chatPreviewTitle"), meta: thread.contact.name, back: { title: t("back"), onClick: back },
    actions: [C.button({ icon: prefs.previewTheme === "dark" ? "sun" : "moon", title: t("waTheme"), onClick: () => {
      setWaTheme(prefs.previewTheme === "dark" ? "light" : "dark");
      render();
    } })] });
  const host = C.el("div", "");
  host.id = "chat-preview";
  renderChat(thread, host);
  return { toolbar, body: [C.section({ tight: true }, host)] };
}

// ---- Screen 09 · Settings (+ pickers) -------------------------------------

function settingsScreen(): ScreenView {
  const toolbar = C.toolbar({ title: t("settings"), meta: t("settingsMeta") });
  const p = prefs;
  const save = (patch: Partial<Prefs>, rerender = false): void => {
    prefs = { ...prefs, ...patch };
    applyPreviewPrefs();
    savePrefs();
    if (rerender) render();
  };
  const contact = (patch: Partial<Prefs["contact"]>, rerender = false): void => save({ contact: { ...prefs.contact, ...patch } }, rerender);

  const flowRows: HTMLElement[] = [
    C.row({ icon: "mouse-pointer-click", label: t("interactive"), trailing: "toggle", toggle: { on: p.interactive, onChange: (on) => save({ interactive: on }) } }),
    C.row({ icon: "user", label: t("businessName"), trailing: "toggle", toggle: { on: p.showBusinessName, onChange: (on) => save({ showBusinessName: on }, true) } }),
  ];
  if (p.showBusinessName) {
    flowRows.push(C.field({ label: t("businessName"), value: p.businessName, maxLength: 40, placeholder: t("businessNamePh"),
      onInput: (v) => { prefs = { ...prefs, businessName: v }; applyPreviewPrefs(); }, onCommit: savePrefs }));
  }
  flowRows.push(C.row({ icon: "message-square-text", label: t("showChat"), trailing: "toggle", toggle: { on: p.showChat, onChange: (on) => save({ showChat: on }, true) } }));
  if (p.showChat) {
    flowRows.push(
      C.row({ icon: "layout-template", label: t("headerStyle"), trailing: "value", value: p.headerStyle === "classic" ? t("headerClassic") : t("headerCurrent"), onClick: () => go("pick", "headerStyle") }),
      C.field({ label: t("contactName"), value: p.contact.name, maxLength: 40, placeholder: t("contactNamePh"),
        onInput: (v) => { prefs = { ...prefs, contact: { ...prefs.contact, name: v } }; applyPreviewPrefs(); }, onCommit: savePrefs }),
      photoRow(contact),
      C.row({ icon: "badge-check", label: t("contactVerified"), trailing: "toggle", toggle: { on: !!p.contact.verified, onChange: (on) => contact({ verified: on || undefined }) } }),
    );
  }
  const flowSec = C.section({ heading: t("groupFlow") }, ...flowRows);

  const sizeLabel = { sm: t("sizeSm"), md: t("sizeMd"), lg: t("sizeLg") }[p.size];
  const figma = C.section({ heading: t("groupFigma") },
    C.row({ icon: "phone", label: t("screenSize"), trailing: "value", value: sizeLabel, onClick: () => go("pick", "size") }),
    C.row({ icon: p.previewTheme === "dark" ? "moon" : "sun", label: t("waTheme"), trailing: "value", value: p.previewTheme === "dark" ? t("themeDark") : t("themeLight"), onClick: () => go("pick", "waTheme") }),
    C.field({ label: t("sectionName"), value: p.sectionName, maxLength: 40, placeholder: t("sectionNamePh"),
      onInput: (v) => { prefs = { ...prefs, sectionName: v }; }, onCommit: savePrefs }),
    colorRow(),
    C.field({ label: t("sectionRadius"), value: String(p.sectionRadius), mono: true, onInput: (raw) => {
      // Empty or out-of-range input falls back to the default rather than reaching
      // the generator. `Number("") === 0`, so the emptiness check comes first.
      const n = Number(raw.trim());
      const ok = raw.trim() !== "" && isFinite(n) && n >= 0;
      prefs = { ...prefs, sectionRadius: ok ? Math.min(n, 200) : SECTION_RADIUS_DEFAULT };
    }, onCommit: () => { savePrefs(); render(); } }),
  );

  const themeLabel = { system: t("themeSystem"), light: t("themeLight"), dark: t("themeDark") }[p.theme];
  const system = C.section({ heading: t("groupSystem") },
    C.row({ icon: "palette", label: t("appTheme"), trailing: "value", value: themeLabel, onClick: () => go("pick", "appTheme") }),
    C.row({ icon: "languages", label: t("language"), trailing: "value", value: p.lang === "pt" ? t("langPt") : t("langEn"), onClick: () => go("pick", "lang") }),
  );
  return { toolbar, body: [flowSec, C.divider(), figma, C.divider(), system] };
}

// The contact photo: a row that opens the file picker, with a thumbnail and a
// remove button once one is set. Read as a data URI so it round-trips through
// clientStorage as a string and can be handed to both <img> and figma.createImage.
function photoRow(contact: (patch: Partial<Prefs["contact"]>, rerender?: boolean) => void): HTMLElement {
  const av = (prefs.contact.avatar ?? "").trim();
  const row = C.row({ icon: "image", label: t("contactPhoto"), trailing: "value", value: av ? t("photoSet") : t("choosePhoto"),
    onClick: () => ($("#avatar-file") as HTMLInputElement).click() });
  if (av) {
    const img = C.el("img", "ui-avatar");
    img.src = av.startsWith("data:") ? av : `data:image/png;base64,${av}`;
    img.alt = "";
    row.querySelector(".ui-row-value")?.prepend(img);
    const clear = C.button({ icon: "x", sm: true, title: t("removePhoto"), onClick: (ev) => { ev.stopPropagation(); contact({ avatar: undefined }, true); } });
    row.append(clear);
  }
  return row;
}
$("#avatar-file").addEventListener("change", (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    prefs = { ...prefs, contact: { ...prefs.contact, avatar: String(reader.result) } };
    applyPreviewPrefs();
    savePrefs();
    input.value = ""; // so picking the same file again still fires
    render();
  };
  reader.onerror = () => postToMain({ type: "notify", message: "Could not read that image." });
  reader.readAsDataURL(file);
});

// The section background: the row shows the swatch and opens the native colour
// picker; a hex field under it takes a typed value. Both write the same pref.
function colorRow(): HTMLElement {
  const native = C.el("input");
  native.type = "color"; native.value = prefs.sectionColor; native.className = "ui-color-native";
  const row = C.row({ icon: "palette", label: t("sectionColor"), trailing: "value", value: prefs.sectionColor, swatch: prefs.sectionColor,
    onClick: () => native.click() });
  const hex = C.field({ label: t("sectionColor"), value: prefs.sectionColor, mono: true, maxLength: 7, onInput: (raw) => {
    const v = normalizeHex(raw);
    hex.querySelector(".ui-input")?.classList.toggle("invalid", v === null && raw.trim() !== "");
    if (!v) return; // keep the last good colour while it's still half-typed
    prefs = { ...prefs, sectionColor: v };
    native.value = v;
    C.setRowValue(row, v, v);
  }, onCommit: () => { savePrefs(); render(); } });
  native.addEventListener("input", () => {
    prefs = { ...prefs, sectionColor: native.value };
    C.setRowValue(row, native.value, native.value);
    const input = hex.querySelector("input"); if (input) input.value = native.value;
  });
  native.addEventListener("change", savePrefs);
  row.append(native);
  return C.el("div", "ui-list", row, hex);
}

// Typed hex -> "#rrggbb", or null when it isn't a colour. Accepts a missing "#" and
// the 3-digit shorthand, since both are what people actually type.
function normalizeHex(raw: string): string | null {
  const v = raw.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{6}$/.test(v)) return "#" + v;
  if (/^[0-9a-f]{3}$/.test(v)) return "#" + v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
  return null;
}

interface Picker { title: string; options: { value: string; label: string; icon?: string }[]; value: string; pick: (v: string) => void }

function pickers(): Record<PickerId, Picker> {
  const set = (patch: Partial<Prefs>): void => { prefs = { ...prefs, ...patch }; applyPreviewPrefs(); savePrefs(); back(); };
  const list = templates(prefs.lang); // authored content: comes in the plugin's language
  return {
    template: { title: t("template"), value: "",
      options: list.map((tpl, i) => ({ value: String(i), label: tpl.name, icon: "layout-template" })),
      pick: (v) => { const tpl = list[Number(v)]; if (tpl) { loadFlow(clone(tpl.flow), tpl.name); go("home"); } } },
    headerStyle: { title: t("headerStyle"), value: prefs.headerStyle,
      options: [{ value: "current", label: t("headerCurrent") }, { value: "classic", label: t("headerClassic") }],
      pick: (v) => set({ headerStyle: v as Prefs["headerStyle"] }) },
    size: { title: t("screenSize"), value: prefs.size,
      options: [{ value: "sm", label: t("sizeSm") }, { value: "md", label: t("sizeMd") }, { value: "lg", label: t("sizeLg") }],
      pick: (v) => set({ size: v as ScreenSize }) },
    waTheme: { title: t("waTheme"), value: prefs.previewTheme,
      options: [{ value: "light", label: t("themeLight"), icon: "sun" }, { value: "dark", label: t("themeDark"), icon: "moon" }],
      pick: (v) => set({ previewTheme: v as PreviewTheme }) },
    appTheme: { title: t("appTheme"), value: prefs.theme,
      options: [{ value: "system", label: t("themeSystem") }, { value: "light", label: t("themeLight"), icon: "sun" }, { value: "dark", label: t("themeDark"), icon: "moon" }],
      pick: (v) => { prefs = { ...prefs, theme: v as ThemePref }; applyTheme(prefs.theme); savePrefs(); back(); } },
    lang: { title: t("language"), value: prefs.lang,
      options: [{ value: "en", label: t("langEn") }, { value: "pt", label: t("langPt") }],
      pick: (v) => { if (v !== prefs.lang) { prefs = { ...prefs, lang: v as Lang }; applyLang(prefs.lang); savePrefs(); } back(); } },
  };
}

function pickScreen(): ScreenView {
  const pk = pickers()[picker];
  const toolbar = C.toolbar({ title: pk.title, meta: pickedFrom === "home" ? flowTitle() : t("settings"), back: { title: t("back"), onClick: back } });
  const rows = pk.options.map((o) => {
    const on = o.value === pk.value;
    return C.row({ icon: on ? "check" : (o.icon ?? "circle"), label: o.label, trailing: "none", on, onClick: () => pk.pick(o.value) });
  });
  return { toolbar, body: [C.section({ heading: pk.title }, ...rows)] };
}

const SCREENS: Record<Route, () => ScreenView> = {
  home: homeScreen, screen: screenEditor, library: libraryScreen, preview: previewScreen, json: jsonScreen,
  chat: chatScreen, chatAdd: chatAddScreen, chatPreview: chatPreviewScreen,
  settings: settingsScreen, pick: pickScreen,
};

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

// Rewrites the editor when it is on screen; the flow itself is the source, so
// nothing is lost while it isn't.
function syncJson(): void {
  const ta = document.querySelector<HTMLTextAreaElement>("#json");
  if (!ta) return;
  buildJsonScopeDropdown();
  const shown: unknown = scopedScreen() ?? flow;
  ta.value = JSON.stringify(shown, null, 2);
  setJsonStatus(true, jsonStatusText());
}

// Rebuilt only when the option set actually changes: this runs on every keystroke
// of a prop edit, and swapping the node each time would be churn.
let jsonScopeSig = "";
function buildJsonScopeDropdown(): void {
  const host = document.querySelector<HTMLElement>("#json-scope");
  if (!host) return;
  // The scoped screen can be renamed or deleted elsewhere — fall back instead of
  // pointing at an id that no longer exists.
  if (jsonScope !== FLOW_SCOPE && !scopedScreen()) jsonScope = FLOW_SCOPE;
  const ids = flow.screens.map((s) => s.id);
  const sig = [jsonScope, ...ids].join("|");
  if (sig === jsonScopeSig) return;
  jsonScopeSig = sig;
  host.replaceChildren(createDropdown({
    value: jsonScope,
    size: "md",
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
    const scr = normalizeScreen(parsed);
    if (!scr) { setJsonStatus(false, t("jsonNeedsScreen")); return; }
    flow.screens[idx] = scr;
    if (typeof scr.id === "string" && scr.id) jsonScope = scr.id; // follow a rename
    setJsonStatus(true, jsonStatusText());
    buildJsonScopeDropdown();
    return;
  }

  const normalized = normalizeFlow(parsed);
  if (!normalized) {
    setJsonStatus(false, "A flow needs a non-empty screens[] array of screen objects.");
    return;
  }
  flow = normalized;
  if (current >= flow.screens.length) current = 0;
  setJsonStatus(true, jsonStatusText());
  buildJsonScopeDropdown(); // screens may have changed (does not rewrite the textarea)
}

const jsonStatusText = (): string => flow.screens.length === 1 ? t("jsonStatusOkOne") : t("jsonStatusOk", [flow.screens.length]);

function setJsonStatus(ok: boolean, msg: string): void {
  const host = document.querySelector<HTMLElement>("#json-status");
  if (!host) return;
  host.replaceChildren(C.pill(ok ? "ok" : "err", ok ? t("valid") : t("invalid")), C.el("span", "", msg));
}

// ---- Re-rendering --------------------------------------------------------

// Sync everything and rebuild the current screen.
function syncAndRender(): void { syncJson(); render(); }

// Prop edits: sync the JSON and the preview without rebuilding the screen
// (keeps input focus while typing). Only what is on screen gets repainted.
function softSync(): void {
  syncJson();
  const preview = document.querySelector<HTMLElement>("#preview");
  if (preview) renderPreview(flow, preview, screen().id, errorScreenIds());
  const validation = document.querySelector<HTMLElement>("#validation");
  if (validation) validation.replaceWith(validationBlock());
  repaintGenerate(); // the gate follows the error count
}
// Structural edits (add/remove option, expand a card): rebuild the screen,
// keeping the scroll position so the list doesn't jump.
function structuralSync(): void {
  const top = $("#body").scrollTop;
  render();
  $("#body").scrollTop = top;
}

function uniqueId(base: string): string {
  let n = flow.screens.length + 1;
  let id = `${base}_${n}`;
  const has = (x: string) => flow.screens.some((s) => s.id === x);
  while (has(id)) id = `${base}_${++n}`;
  return id;
}

// ---- Generate button ------------------------------------------------------
// The main thread answers a generate with `generated` (or `error`), so the
// button can show progress and then confirm the screens landed on the canvas.
// It lives in the toolbar of the two root screens and is rebuilt with them,
// so every repaint looks it up afresh.

function generateButton(): HTMLButtonElement {
  const b = C.button({ icon: "sparkles", label: t("generate"), style: "primary", onClick: () => {
    setGenState("busy");
    if (railOf(route) === "chat") postToMain({ type: "generateChat", thread, options: genOptions() });
    else postToMain({ type: "generate", flow, options: genOptions(), replaceSectionId: linkedSectionId ?? undefined });
  } });
  b.id = "generate";
  return b;
}

// Generating often finishes in well under a second, which made the bar/skeleton
// flash. Hold the busy state for at least this long so it reads as progress.
const MIN_BUSY_MS = 3000;

let genState: "idle" | "busy" | "done" = "idle";
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
  genState = state;
  // Drives the loading bar under the toolbar and the skeletoned body.
  document.body.classList.toggle("generating", state === "busy");
  paintGenerate();
  if (state === "done") genResetTimer = window.setTimeout(() => setGenState("idle"), 2200);
}

function paintGenerate(): void {
  const btn = document.querySelector<HTMLButtonElement>("#generate");
  if (!btn) return;
  const state = genState;
  btn.classList.toggle("busy", state === "busy");
  btn.classList.toggle("done", state === "done");
  // Chat mode generates a conversation, which the Flow JSON validator says
  // nothing about — so flow errors only gate the Flows generator.
  const errors = railOf(route) === "chat" ? 0 : errorCount();
  btn.disabled = state === "busy" || errors > 0;
  btn.title = errors > 0 ? `Fix ${errors} error${errors > 1 ? "s" : ""} before generating` : "";
  const linked = isLinked();
  C.setButton(btn, {
    icon: state === "busy" ? "loader-circle" : state === "done" ? "check" : linked ? "refresh-cw" : "sparkles",
    label: t(state === "busy" ? "generating" : state === "done" ? "genDone" : linked ? "update" : "generate"),
  });
}

// Repaint the button's face without disturbing a run in progress.
const repaintGenerate = paintGenerate;

// Flows mode with a section to update. Chat mode generates its own sections and
// has no re-import yet, so the link never applies there.
function isLinked(): boolean { return railOf(route) !== "chat" && !!linkedSectionId; }

// ---- Import, templates, copy -----------------------------------------------

// Validate structure and load a flow from a template or file. `linkTo` is the
// id of the generated section the flow came from, when it came from one — see
// the linked-section block below. Everything else (template, file, new flow)
// leaves it out, which unlinks: generating those must not overwrite a section
// that has nothing to do with them.
function loadFlow(parsed: unknown, sourceName: string, linkTo?: string): void {
  const normalized = normalizeFlow(parsed);
  if (!normalized) {
    postToMain({ type: "notify", message: `${sourceName}: not a valid Flow (needs a non-empty screens[] array).` });
    return;
  }
  flow = normalized;
  flowName = sourceName;
  current = 0;
  jsonScope = FLOW_SCOPE; // a new flow has different screens — don't keep a stale scope
  setLinkedSection(linkTo, linkTo ? sourceName : "");
  collapseAllCards(flow);
  syncAndRender();
  const errors = errorCount();
  postToMain({ type: "notify", message: errors ? `Loaded ${sourceName} — ${errors} validation error(s).` : `Loaded ${sourceName}.` });
}

$("#file").addEventListener("change", (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try { loadFlow(JSON.parse(String(reader.result)), file.name); go("home"); }
    catch (err) { postToMain({ type: "notify", message: `Import failed: ${err instanceof Error ? err.message : String(err)}` }); }
    input.value = "";
  };
  reader.readAsText(file);
});

function copyJson(): void {
  // Don't hand out JSON that won't import — the copied flow is always meant to be
  // pasted into the Playground. Warnings are advisory and still allowed.
  const errors = errorCount();
  if (errors > 0) {
    postToMain({ type: "notify", message: `Fix ${errors} error${errors > 1 ? "s" : ""} before copying — the JSON won't import.` });
    return;
  }
  const text = JSON.stringify(flow, null, 2);
  navigator.clipboard?.writeText(text).then(
    () => postToMain({ type: "notify", message: "Flow JSON copied to clipboard." }),
    () => postToMain({ type: "notify", message: "Copy failed — select the Flow JSON and copy it." }),
  );
}

// ---- Preferences ----------------------------------------------------------

// Section defaults mirror the generator's (src/main/index.ts) — keep them in step.
const SECTION_BG_DEFAULT = "#353535";
const SECTION_RADIUS_DEFAULT = 24;

let prefs: Prefs = {
  mode: "flows",
  theme: "system", lang: "en", os: "ios", previewTheme: "light", interactive: true, size: "md",
  showBusinessName: false, businessName: "Business name",
  sectionName: "", sectionColor: SECTION_BG_DEFAULT, sectionRadius: SECTION_RADIUS_DEFAULT,
  showChat: true, headerStyle: "current", contact: { name: "Business name" },
};

// The WhatsApp-mockup options sent with a generate + used by the live preview.
const genOptions = (): GenOptions => ({
  os: prefs.os, theme: prefs.previewTheme, interactive: prefs.interactive, size: prefs.size,
  showBusinessName: prefs.showBusinessName, businessName: prefs.businessName,
  sectionName: prefs.sectionName, sectionColor: prefs.sectionColor, sectionRadius: prefs.sectionRadius,
  showChat: prefs.showChat, headerStyle: prefs.headerStyle, contact: prefs.contact,
});

const savePrefs = (): void => postToMain({ type: "savePrefs", prefs });

// System = follow the OS/Figma theme (no data-theme); light/dark force it.
function applyTheme(theme: ThemePref): void {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}
const isDarkNow = (): boolean =>
  prefs.theme === "dark" || (prefs.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

// Everything the preview reads from prefs, pushed in one go.
function applyPreviewPrefs(): void {
  setPreviewInteractive(prefs.interactive);
  setPreviewBusiness(prefs.showBusinessName, prefs.businessName);
  setPreviewChat(prefs.showChat, prefs.headerStyle, prefs.contact);
  setPreviewSize(prefs.size);
  setPreviewTheme(prefs.previewTheme);
}

function setWaTheme(theme: PreviewTheme): void {
  prefs = { ...prefs, previewTheme: theme };
  applyPreviewPrefs();
  savePrefs();
}

function applyLang(lang: Lang): void {
  setLang(lang);
  applyI18n(document);
  buildRail(); // tooltips
  jsonScopeSig = ""; // the scope picker must rebuild with the new locale
  if (offered) $("#offer-title").textContent = t("offerTitle", [offeredName]); // JS-built text
  render();
}

// The editor boots on the English sample, before the saved language is known.
// Once it arrives, swap in the localized sample — but only while the flow is
// still byte-identical to what we loaded, so this can never discard an edit or
// a flow the user imported in the meantime.
function localizeInitialFlow(lang: Lang): void {
  if (JSON.stringify(flow) !== JSON.stringify(SAMPLE_FLOW)) return;
  flow = clone(sampleFlow(lang));
  current = 0;
  collapseAllCards(flow);
}

function applyPrefs(p: Prefs): void {
  prefs = { ...prefs, ...p };
  localizeInitialFlow(prefs.lang);
  applyTheme(prefs.theme);
  applyPreviewPrefs();
  setLang(prefs.lang);
  applyI18n(document);
  buildRail();
  go((prefs.mode ?? "flows") === "chat" ? "chat" : "home"); // reopen in the generator last used
}

// ---- The rail -------------------------------------------------------------

function buildRail(): void {
  const railEl = C.rail({
    active: railOf(route),
    labels: { flows: t("navFlows"), chat: t("navChat"), settings: t("navSettings") },
    onSelect: (key) => {
      const root: Route = key === "chat" ? "chat" : key === "settings" ? "settings" : "home";
      const mode: Mode = key === "chat" ? "chat" : "flows";
      if (key !== "settings" && mode !== prefs.mode) { prefs = { ...prefs, mode }; savePrefs(); }
      go(root);
    },
    theme: { icon: isDarkNow() ? "sun" : "moon", title: t("railTheme"), onClick: () => {
      prefs = { ...prefs, theme: isDarkNow() ? "light" : "dark" };
      applyTheme(prefs.theme);
      savePrefs();
      buildRail();
      if (route === "settings") render();
    } },
  });
  $("#rail-host").replaceChildren(railEl);
}

// ---- Linked section ------------------------------------------------------
// A flow imported from a generated section stays linked to it, so Generate
// updates that section instead of dropping a second copy on the canvas. The
// link is deliberately visible (the toolbar meta, "Update" on the button) and
// escapable (the unlink action): an update deletes frames the user may have
// annotated, so it should never be a silent side effect.

let linkedSectionId: string | null = null;
let linkedName = "";

function setLinkedSection(id: string | undefined, name: string): void {
  linkedSectionId = id ?? null;
  if (id) linkedName = name;
  repaintGenerate(); // the button reads "Update" while linked
}

// ---- Import offer (user clicked a generated section in Figma) -------------

let offered: FlowJSON | null = null;
let offeredName = "";
let offeredSectionId = "";

function showOffer(name: string, f: FlowJSON, sectionId: string): void {
  offered = f;
  offeredName = name;
  offeredSectionId = sectionId;
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
  const sectionId = offeredSectionId;
  hideOffer();
  // Replaces the current flow, same path as a file import — but linked, so
  // editing it updates the section it came from.
  if (f) { loadFlow(f, name, sectionId); go("home"); }
});

// Messages from the main thread: saved prefs on startup, import offers on click.
window.addEventListener("message", (e: MessageEvent) => {
  const msg = (e.data && (e.data as { pluginMessage?: unknown }).pluginMessage) as
    { type?: string; prefs?: Prefs; name?: string; flow?: FlowJSON; sectionId?: string } | undefined;
  if (!msg) return;
  if (msg.type === "prefs" && msg.prefs) applyPrefs(msg.prefs);
  else if (msg.type === "importOffer" && msg.flow) showOffer(msg.name ?? "Figma", msg.flow, msg.sectionId ?? "");
  else if (msg.type === "importOfferEnd") hideOffer(); // selection left the section
  else if (msg.type === "generated") {
    // A run replaces the section with a new node, so re-link to what it just
    // made — otherwise the second Generate would append instead of updating.
    if (railOf(route) !== "chat" && msg.sectionId) setLinkedSection(msg.sectionId, linkedName);
    finishGenerate(); // honours the minimum busy time
  }
  else if (msg.type === "error") setGenState("idle");  // failures surface right away
});

// ---- Boot -----------------------------------------------------------------

applyThemeVars();
applyIcons(document);
collapseAllCards(flow); // the sample flow opens collapsed, like an imported one
applyPreviewPrefs();
buildRail();
render(); // default en / system; overwritten when the main thread sends saved prefs
