// Live WhatsApp phone-mockup preview inside the plugin UI. Mirrors the Figma
// generator's component visuals, driven by the same theme tokens (theme.ts),
// so the preview and the generated frames stay in sync.
import type { FlowJSON, Screen, Component } from "../model/flowTypes";
import { screenChildren, dataSourceOf, isBinding } from "../model/flowTypes";
import { COLOR, SCREEN_HEIGHTS, setPalette } from "../main/theme";
import { t } from "./i18n";

// Push theme tokens into CSS custom properties once, so the stylesheet in
// ui.html can reference the same values the Figma renderer uses.
export function applyThemeVars(): void {
  const root = document.documentElement.style;
  const map: Record<string, string> = {
    "--wa-bg": COLOR.bg,
    "--wa-surface": COLOR.surface,
    "--wa-text": COLOR.textPrimary,
    "--wa-text2": COLOR.textSecondary,
    "--wa-divider": COLOR.divider,
    "--wa-primary": COLOR.primary,
    "--wa-on-primary": COLOR.onPrimary,
    "--wa-link": COLOR.link,
    "--wa-input-border": COLOR.inputBorder,
    "--wa-chip": COLOR.chipBg,
    "--wa-chip-sel": COLOR.chipSelectedBg,
    "--wa-chip-sel-border": COLOR.chipSelectedBorder,
    "--wa-status": COLOR.statusBar,
    "--wa-placeholder": COLOR.placeholder,
    // chat mode
    "--wa-bubble-in": COLOR.bubbleIn,
    "--wa-bubble-out": COLOR.bubbleOut,
    "--wa-wallpaper": COLOR.wallpaper,
    "--wa-tick": COLOR.tick,
    "--wa-chat-header": COLOR.chatHeader,
    "--wa-system-pill": COLOR.systemPill,
  };
  for (const k in map) root.setProperty(k, map[k]);
}

// Switch the WhatsApp mockup between light/dark: pick the palette, then push its
// tokens into the --wa-* CSS vars the preview stylesheet reads.
let previewTheme: "light" | "dark" = "light";
export function setPreviewTheme(theme: "light" | "dark"): void {
  previewTheme = theme;
  setPalette(theme);
  applyThemeVars();
}

// Preview keeps its own selected tab, independent of the Build tab.
let selected: string | null = null; // screen id, or "__summary__"
const SUMMARY = "__summary__";
let errScreens: Set<string> = new Set(); // screen ids with validation errors

// Interactive mode: when off, the in-phone CTA doesn't navigate (static preview),
// mirroring the Playground toggle. The screen tabs above the phone are a plugin
// authoring aid and stay active regardless.
let interactive = true;
export function setPreviewInteractive(on: boolean): void { interactive = on; }

// Preview phone height mirrors the chosen generated-frame size (sm/md/lg).
let previewSize: "sm" | "md" | "lg" = "md";
export function setPreviewSize(size: "sm" | "md" | "lg"): void { previewSize = size; }

// Business name under the flow title, mirroring the generator (chrome.ts).
let business = { show: false, name: "Business name" };
export function setPreviewBusiness(show: boolean, name: string): void {
  business = { show, name };
}

function el(tag: string, className?: string, text?: string): HTMLElement {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

export function renderPreview(flow: FlowJSON, host: HTMLElement, fallbackScreenId?: string, errorScreens?: Set<string>): void {
  if (errorScreens) errScreens = errorScreens;
  host.innerHTML = "";
  const ids = flow.screens.map((s) => s.id);
  if (selected !== SUMMARY && (selected === null || !ids.includes(selected))) {
    selected = fallbackScreenId && ids.includes(fallbackScreenId) ? fallbackScreenId : ids[0] ?? null;
  }

  host.appendChild(previewTabs(flow));

  const invalid = selected !== SUMMARY && selected !== null && errScreens.has(selected);
  const phone = el("div", "wa-phone" + (invalid ? " has-error" : ""));
  phone.style.aspectRatio = String(360 / SCREEN_HEIGHTS[previewSize]); // reflect the chosen size
  // Native controls (interactive radios/checkboxes) follow the mockup's theme,
  // not the plugin window's.
  phone.style.colorScheme = previewTheme;
  phone.appendChild(statusBar());
  if (selected === SUMMARY) {
    phone.appendChild(header("Review and submit"));
    appendProgress(phone, flow, flow.screens.length); // all steps done at the summary
    phone.appendChild(summaryBody(flow));
  } else {
    const screen = flow.screens.find((s) => s.id === selected);
    if (screen) {
      // First screen in authoring order = entry: close "✕" instead of back.
      phone.appendChild(header(screen.title ?? screen.id, flow.screens[0]?.id === screen.id));
      appendProgress(phone, flow, flow.screens.findIndex((s) => s.id === selected) + 1);
      phone.appendChild(screenBody(flow, screen, host));
      // Footer is a sibling of the body, as in the generator: measured from the
      // phone edge (not nested inside the body's padding) and pinned while the
      // body scrolls.
      const footer = screenChildren(screen).find((c) => c.type === "Footer");
      if (footer) phone.appendChild(renderFooter(footer, flow));
    }
  }
  host.appendChild(phone);
}

// WhatsApp shows a segmented step-progress bar in the flow header for multi-screen
// flows (one segment per screen, filled up to the current one). Position is the
// screen's index in authoring order — an approximation for branching flows.
function appendProgress(phone: HTMLElement, flow: FlowJSON, done: number): void {
  const total = flow.screens.length;
  if (total < 2) return;
  const bar = el("div", "wa-progress");
  for (let i = 0; i < total; i++) bar.appendChild(el("span", "wa-step" + (i < done ? " on" : "")));
  phone.appendChild(bar);
}

function previewTabs(flow: FlowJSON): HTMLElement {
  const wrap = el("div", "pv-tabs");
  flow.screens.forEach((s) => {
    const cls = "pv-tab" + (selected === s.id ? " active" : "") + (errScreens.has(s.id) ? " err" : "");
    const t = el("button", cls, s.id);
    t.onclick = () => { selected = s.id; rerender(flow); };
    wrap.appendChild(t);
  });
  const sum = el("button", "pv-tab" + (selected === SUMMARY ? " active" : ""), t("summary"));
  sum.onclick = () => { selected = SUMMARY; rerender(flow); };
  wrap.appendChild(sum);
  return wrap;
}

// Re-render into the same host used last time.
let lastHost: HTMLElement | null = null;
function rerender(flow: FlowJSON): void { if (lastHost) renderPreview(flow, lastHost); }

// iOS-style status bar: time on the left, signal / wifi / battery on the right.
const STATUS_ICONS =
  '<svg viewBox="0 0 18 12" width="17" height="11" fill="currentColor" aria-hidden="true">' +
  '<rect x="0" y="7.5" width="3" height="4.5" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/>' +
  '<rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>' +
  '<svg viewBox="0 0 16 12" width="16" height="11" fill="currentColor" aria-hidden="true">' +
  '<path d="M8 2.2c2.5 0 4.8 1 6.5 2.6l1.3-1.6A11 11 0 0 0 8 .3 11 11 0 0 0 .2 3.2l1.3 1.6A9.3 9.3 0 0 1 8 2.2z"/>' +
  '<path d="M8 6.1c1.5 0 2.9.6 4 1.6l1.3-1.6A8 8 0 0 0 8 4a8 8 0 0 0-5.3 2.1L4 7.7A6 6 0 0 1 8 6.1z"/>' +
  '<path d="M8 10.1 9.8 8a2.7 2.7 0 0 0-3.6 0L8 10.1z"/></svg>' +
  '<svg viewBox="0 0 27 12" width="25" height="11" fill="none" aria-hidden="true">' +
  '<rect x="1" y="1" width="22" height="10" rx="3" stroke="currentColor" stroke-opacity=".4"/>' +
  '<rect x="3" y="3" width="16" height="6" rx="1.5" fill="currentColor"/>' +
  '<path d="M25 4.2a2 2 0 0 1 0 3.6z" fill="currentColor" fill-opacity=".4"/></svg>';

// Exported so chat mode reuses the same status bar instead of duplicating it
// (single source, same rule as the theme tokens).
export function statusBar(): HTMLElement {
  const bar = el("div", "wa-status");
  bar.appendChild(el("span", "wa-status-time", "9:41"));
  const icons = el("div", "wa-status-icons");
  icons.innerHTML = STATUS_ICONS;
  bar.appendChild(icons);
  return bar;
}

// Flow-sheet header icons, matching the generator's (chrome.ts). The entry screen
// closes the sheet ("✕"); every screen after it goes back.
const strokeIcon = (paths: string): string =>
  '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
const BACK_ICON = strokeIcon('<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>');
const CLOSE_ICON = strokeIcon('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>');
const MORE_ICON =
  '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">' +
  '<circle cx="12" cy="5" r="1.75"/><circle cx="12" cy="12" r="1.75"/><circle cx="12" cy="19" r="1.75"/></svg>';

function hIcon(svg: string): HTMLElement {
  const s = el("span", "wa-hicon");
  s.innerHTML = svg;
  return s;
}

// Bottom-sheet chrome: drag handle, then close/back / centered title / overflow.
function header(title: string, first = false): HTMLElement {
  const h = el("div", "wa-header");
  h.appendChild(el("div", "wa-handle"));

  const row = el("div", "wa-hrow");
  row.appendChild(hIcon(first ? CLOSE_ICON : BACK_ICON));
  const titles = el("div", "wa-titles");
  titles.appendChild(el("div", "wa-title", title));
  const name = business.show ? business.name.trim() : "";
  if (name) titles.appendChild(el("div", "wa-sub", name));
  row.appendChild(titles);
  row.appendChild(hIcon(MORE_ICON));

  h.appendChild(row);
  return h;
}

function screenBody(flow: FlowJSON, screen: Screen, host: HTMLElement): HTMLElement {
  lastHost = host;
  const body = el("div", "wa-body");
  const kids = screenChildren(screen); // descends into a Form container if present
  for (const c of kids) {
    if (c.type === "Footer") continue; // rendered by the caller, outside the body
    body.appendChild(renderComp(c, flow));
  }
  return body;
}

function summaryBody(flow: FlowJSON): HTMLElement {
  const body = el("div", "wa-body");
  body.appendChild(comp("wa-h1", "Review and submit"));
  const inputs = flow.screens.flatMap(screenChildren).filter((c) => !!c.name && c.type !== "Footer");
  if (inputs.length === 0) body.appendChild(comp("wa-body-text", "No input fields in this flow."));
  inputs.forEach((c) => {
    const row = el("div", "wa-sum-row");
    row.appendChild(el("div", "wa-label", c.label ?? c.name ?? c.type));
    row.appendChild(el("div", "wa-sum-val", "—"));
    body.appendChild(row);
  });
  return body;
}

function comp(cls: string, text: string): HTMLElement {
  return el("div", cls, text);
}

function inputBox(placeholder: string, tall = false, trailing?: string): HTMLElement {
  const box = el("div", "wa-input" + (tall ? " tall" : ""));
  box.appendChild(el("span", "wa-ph", placeholder));
  if (trailing) box.appendChild(el("span", "wa-trail", trailing));
  return box;
}

// A field whose label carries an "(optional)" marker when the input isn't required.
function fieldC(c: Component, control: HTMLElement, help?: unknown): HTMLElement {
  const wrap = el("div", "wa-field");
  wrap.appendChild(labelWithOptional(c));
  wrap.appendChild(control);
  if (typeof help === "string" && help) wrap.appendChild(el("div", "wa-help", help));
  return wrap;
}

// WhatsApp marks optional inputs "(optional)". Only when `required` is explicitly
// falsy — a dynamic binding (unknown at author time) gets no marker.
function isOptional(c: Component): boolean {
  return !!c.name && (c.required === undefined || c.required === false);
}
function labelWithOptional(c: Component): HTMLElement {
  const div = el("div", "wa-label", labelStr(c.label));
  if (isOptional(c)) div.appendChild(el("span", "wa-optional", " " + t("optional")));
  return div;
}

function asNum(v: unknown, def: number | undefined): number | undefined {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return Number(v);
  return def;
}
function htmlInputType(c: Component): string {
  switch (c["input-type"]) {
    case "email": return "email";
    case "phone": return "tel";
    case "number": return "number";
    case "password":
    case "passcode": return "password";
    default: return "text";
  }
}

// TextInput / TextArea. Interactive mode renders a real, typeable field with a
// live "n / max" counter (TextArea defaults to 600, like WhatsApp); otherwise a
// static placeholder box — mirroring the Playground's interactive toggle.
function inputField(c: Component, tall: boolean): HTMLElement {
  const wrap = el("div", "wa-field");
  wrap.appendChild(labelWithOptional(c));
  const max = tall ? asNum(c["max-length"], 600) : asNum(c["max-chars"], undefined);
  if (interactive) {
    const inp = tall ? document.createElement("textarea") : document.createElement("input");
    inp.className = "wa-inp" + (tall ? " tall" : "");
    inp.placeholder = placeholderFor(c);
    if (!tall) (inp as HTMLInputElement).type = htmlInputType(c);
    if (max !== undefined) inp.maxLength = max;
    wrap.appendChild(inp);
    if (max !== undefined) {
      const cnt = el("div", "wa-count", `0 / ${max}`);
      inp.addEventListener("input", () => { cnt.textContent = `${inp.value.length} / ${max}`; });
      wrap.appendChild(cnt);
    }
  } else {
    wrap.appendChild(inputBox(placeholderFor(c), tall));
  }
  const help = c["helper-text"];
  if (typeof help === "string" && help) wrap.appendChild(el("div", "wa-help", help));
  return wrap;
}

function optionRows(c: Component, kind: "radio" | "check"): HTMLElement {
  const wrap = el("div", "wa-field");
  wrap.appendChild(labelWithOptional(c));
  const items = dataSourceOf(c);
  if (items.length === 0 && isBinding(c["data-source"])) wrap.appendChild(el("div", "wa-help", String(c["data-source"])));
  const group = c.name || "opt";
  items.forEach((it, i) => {
    // Interactive: a real radio/checkbox you can select; static: the WhatsApp mark.
    const row = el(interactive ? "label" : "div", "wa-opt");
    if (interactive) {
      const inp = document.createElement("input");
      inp.type = kind === "radio" ? "radio" : "checkbox";
      inp.name = group;
      inp.className = "wa-real-mark";
      row.appendChild(inp);
    } else {
      row.appendChild(el("span", `wa-mark ${kind}${i === 0 ? " on" : ""}`));
    }
    const texts = el("div");
    texts.appendChild(el("div", "wa-opt-title", it.title));
    if (it.description) texts.appendChild(el("div", "wa-opt-desc", it.description));
    row.appendChild(texts);
    wrap.appendChild(row);
  });
  return wrap;
}

function chips(c: Component): HTMLElement {
  const wrap = el("div", "wa-field");
  wrap.appendChild(labelWithOptional(c));
  const row = el("div", "wa-chips");
  const items = dataSourceOf(c);
  if (items.length === 0 && isBinding(c["data-source"])) wrap.appendChild(el("div", "wa-help", String(c["data-source"])));
  items.forEach((it, i) => row.appendChild(el("span", "wa-chip" + (i === 0 ? " on" : ""), it.title)));
  wrap.appendChild(row);
  return wrap;
}

function labelStr(label: unknown): string {
  if (typeof label === "string") return label;
  if (label && typeof label === "object") {
    const o = label as Record<string, unknown>;
    return String(o["start-date"] ?? o["end-date"] ?? "");
  }
  return "";
}

function strOr(v: unknown): string { return v === undefined || v === null ? "" : String(v); }

function uploaderHtml(labelText: string, description: string, icon: string): HTMLElement {
  const box = el("div", "wa-upload");
  box.appendChild(el("div", "wa-upload-ico", icon));
  box.appendChild(el("div", "wa-upload-label", labelText || "Upload"));
  if (description) box.appendChild(el("div", "wa-help", description));
  return box;
}

function navListHtml(c: Component): HTMLElement {
  const wrap = el("div", "wa-navlist");
  const items = (c["list-items"] as Array<Record<string, unknown>>) ?? [];
  items.forEach((it) => {
    const main = (it["main-content"] as Record<string, unknown>) ?? {};
    const row = el("div", "wa-nav-row");
    const texts = el("div");
    texts.appendChild(el("div", "wa-opt-title", String(main["title"] ?? "Item")));
    if (main["description"]) texts.appendChild(el("div", "wa-opt-desc", String(main["description"])));
    row.appendChild(texts);
    row.appendChild(el("span", "wa-nav-chevron", "›"));
    wrap.appendChild(row);
  });
  return wrap;
}

function firstTitle(c: Component): string {
  const items = dataSourceOf(c);
  return items.length ? items[0].title : "Choose";
}

function placeholderFor(c: Component): string {
  switch (c["input-type"]) {
    case "email": return "name@example.com";
    case "phone": return "+55 11 90000-0000";
    case "number": return "0";
    case "password":
    case "passcode": return "••••••";
    default: return "Type here...";
  }
}

function renderComp(c: Component, _flow: FlowJSON): HTMLElement {
  switch (c.type) {
    case "TextHeading": return comp("wa-h1", c.text ?? "");
    case "TextSubheading": return comp("wa-h2", c.text ?? "");
    case "TextBody": return comp("wa-body-text", c.text ?? "");
    case "RichText": return comp("wa-body-text", (c.text ?? "").replace(/\*\*/g, "").replace(/[*_~#]/g, ""));
    case "TextCaption": return comp("wa-caption", c.text ?? "");
    case "TextInput": return inputField(c, false);
    case "TextArea": return inputField(c, true);
    case "DatePicker": return fieldC(c, inputBox("Select date", false, "📅"));
    case "CalendarPicker": return fieldC(c, inputBox(c.mode === "range" ? "Select date range" : "Select date", false, "📅"));
    case "Dropdown": return fieldC(c, inputBox(firstTitle(c), false, "▾"));
    case "RadioButtonsGroup": return optionRows(c, "radio");
    case "CheckboxGroup": return optionRows(c, "check");
    case "ChipsSelector": return chips(c);
    case "OptIn": {
      const row = el("label", "wa-opt");
      if (interactive) {
        const box = document.createElement("input");
        box.type = "checkbox"; box.className = "wa-real-mark";
        row.appendChild(box);
      } else {
        row.appendChild(el("span", "wa-mark check"));
      }
      row.appendChild(el("div", "wa-opt-title", c.label ?? ""));
      return row;
    }
    case "EmbeddedLink": return comp("wa-link", c.text ?? "Link");
    case "Image": return el("div", "wa-img");
    case "ImageCarousel": {
      const n = ((c.images as unknown[]) ?? []).length;
      const box = el("div", "wa-img carousel");
      box.appendChild(el("span", "wa-carousel-badge", `1 / ${n || 1}`));
      return box;
    }
    case "PhotoPicker": return uploaderHtml(c.label ?? "Add photos", strOr(c.description), "📷");
    case "DocumentPicker": return uploaderHtml(c.label ?? "Add documents", strOr(c.description), "📎");
    case "NavigationList": return navListHtml(c);
    default: return comp("wa-caption", `[${c.type}]`);
  }
}

function renderFooter(c: Component, flow: FlowJSON): HTMLElement {
  const area = el("div", "wa-footer");
  const btn = el("button", "wa-btn" + (interactive ? "" : " static"), c.label ?? "Continue");
  const action = c["on-click-action"];
  if (interactive) {
    btn.onclick = () => {
      if (action?.name === "navigate" && action.next?.name) {
        selected = action.next.name;
        rerender(flow);
      } else if (action?.name === "complete") {
        selected = SUMMARY;
        rerender(flow);
      }
    };
  }
  area.appendChild(btn);
  area.appendChild(managedNote());
  return area;
}

// WhatsApp shows this disclaimer under the flow CTA on every screen.
function managedNote(): HTMLElement {
  const n = el("div", "wa-managed", t("managedByBusiness") + " ");
  n.appendChild(el("span", "wa-managed-link", t("learnMore")));
  return n;
}
