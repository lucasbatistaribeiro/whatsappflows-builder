// Live WhatsApp phone-mockup preview inside the plugin UI. Mirrors the Figma
// generator's component visuals, driven by the same theme tokens (theme.ts),
// so the preview and the generated frames stay in sync.
import type { FlowJSON, Screen, Component, DataSourceItem } from "../model/flowTypes";
import { COLOR } from "../main/theme";

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
  };
  for (const k in map) root.setProperty(k, map[k]);
}

// Preview keeps its own selected tab, independent of the Build tab.
let selected: string | null = null; // screen id, or "__summary__"
const SUMMARY = "__summary__";
let errScreens: Set<string> = new Set(); // screen ids with validation errors

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
  phone.appendChild(statusBar());
  if (selected === SUMMARY) {
    phone.appendChild(header("Review and submit"));
    phone.appendChild(summaryBody(flow));
  } else {
    const screen = flow.screens.find((s) => s.id === selected);
    if (screen) {
      phone.appendChild(header(screen.title ?? screen.id));
      phone.appendChild(screenBody(flow, screen, host));
    }
  }
  host.appendChild(phone);
}

function previewTabs(flow: FlowJSON): HTMLElement {
  const wrap = el("div", "pv-tabs");
  flow.screens.forEach((s) => {
    const cls = "pv-tab" + (selected === s.id ? " active" : "") + (errScreens.has(s.id) ? " err" : "");
    const t = el("button", cls, s.id);
    t.onclick = () => { selected = s.id; rerender(flow); };
    wrap.appendChild(t);
  });
  const sum = el("button", "pv-tab" + (selected === SUMMARY ? " active" : ""), "Summary");
  sum.onclick = () => { selected = SUMMARY; rerender(flow); };
  wrap.appendChild(sum);
  return wrap;
}

// Re-render into the same host used last time.
let lastHost: HTMLElement | null = null;
function rerender(flow: FlowJSON): void { if (lastHost) renderPreview(flow, lastHost); }

function statusBar(): HTMLElement {
  const bar = el("div", "wa-status");
  bar.appendChild(el("span", undefined, "9:41"));
  bar.appendChild(el("span", undefined, "▂▄▆ Wi-Fi ▮"));
  return bar;
}

function header(title: string): HTMLElement {
  const h = el("div", "wa-header");
  h.appendChild(el("span", "wa-close", "✕"));
  const titles = el("div", "wa-titles");
  titles.appendChild(el("div", "wa-title", title));
  titles.appendChild(el("div", "wa-sub", "Business name"));
  h.appendChild(titles);
  return h;
}

function screenBody(flow: FlowJSON, screen: Screen, host: HTMLElement): HTMLElement {
  lastHost = host;
  const body = el("div", "wa-body");
  const kids = screen.layout.children ?? [];
  const footer = kids.find((c) => c.type === "Footer");
  for (const c of kids) {
    if (c.type === "Footer") continue;
    body.appendChild(renderComp(c, flow));
  }
  if (footer) body.appendChild(renderFooter(footer, flow));
  return body;
}

function summaryBody(flow: FlowJSON): HTMLElement {
  const body = el("div", "wa-body");
  body.appendChild(comp("wa-h1", "Review and submit"));
  const inputs = flow.screens.flatMap((s) => s.layout.children).filter((c) => !!c.name && c.type !== "Footer");
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

function field(labelText: string, control: HTMLElement, help?: string): HTMLElement {
  const wrap = el("div", "wa-field");
  if (labelText) wrap.appendChild(el("div", "wa-label", labelText));
  wrap.appendChild(control);
  if (help) wrap.appendChild(el("div", "wa-help", help));
  return wrap;
}

function optionRows(c: Component, kind: "radio" | "check"): HTMLElement {
  const wrap = el("div", "wa-field");
  if (c.label) wrap.appendChild(el("div", "wa-label", c.label));
  const items = (c["data-source"] as DataSourceItem[]) ?? [];
  items.forEach((it, i) => {
    const row = el("div", "wa-opt");
    row.appendChild(el("span", `wa-mark ${kind}${i === 0 ? " on" : ""}`));
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
  if (c.label) wrap.appendChild(el("div", "wa-label", c.label));
  const row = el("div", "wa-chips");
  const items = (c["data-source"] as DataSourceItem[]) ?? [];
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
  const items = c["data-source"] as DataSourceItem[] | undefined;
  return items && items.length ? items[0].title : "Choose";
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
    case "TextInput": return field(c.label ?? "", inputBox(placeholderFor(c)), c["helper-text"]);
    case "TextArea": return field(c.label ?? "", inputBox("Type here...", true), c["helper-text"]);
    case "DatePicker": return field(c.label ?? "", inputBox("Select date", false, "📅"));
    case "CalendarPicker": return field(labelStr(c.label), inputBox(c.mode === "range" ? "Select date range" : "Select date", false, "📅"));
    case "Dropdown": return field(c.label ?? "", inputBox(firstTitle(c), false, "▾"));
    case "RadioButtonsGroup": return optionRows(c, "radio");
    case "CheckboxGroup": return optionRows(c, "check");
    case "ChipsSelector": return chips(c);
    case "OptIn": {
      const row = el("div", "wa-opt");
      row.appendChild(el("span", "wa-mark check"));
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
  const btn = el("button", "wa-btn", c.label ?? "Continue");
  const action = c["on-click-action"];
  btn.onclick = () => {
    if (action?.name === "navigate" && action.next?.name) {
      selected = action.next.name;
      rerender(flow);
    } else if (action?.name === "complete") {
      selected = SUMMARY;
      rerender(flow);
    }
  };
  area.appendChild(btn);
  return area;
}
