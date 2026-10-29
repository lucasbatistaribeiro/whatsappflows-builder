// The new chrome's components as DOM builders — one function per Figma
// component on the "Components" page (knowledge/NEW_UI.md), styled by the
// .ui-* rules in chrome.css. Pure DOM: no i18n (callers pass translated
// strings), no model, no bridge. Screens (ui.ts) compose these.
//
// Icons are wrapped in <span class="ui-ic"> and sized by CSS, so the pixel
// size iconEl() takes is irrelevant here; the `size` argument picks the token.
import { iconEl } from "./icons";

type Child = Node | string | null | undefined | false;

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  for (const k of kids) if (k) n.append(k);
  return n;
}

export type IconSize = "sm" | "md" | "lg";
export function ic(name: string, size: IconSize = "md", cls = ""): HTMLElement {
  const s = el("span", `ui-ic${size === "md" ? "" : " " + size}${cls ? " " + cls : ""}`);
  s.append(iconEl(name, 24));
  return s;
}

// ---- Layout ---------------------------------------------------------------

export const divider = (): HTMLElement => el("div", "ui-divider");

/** A titled block of the panel: heading row (optional hint or action) + children. */
export function section(o: { heading?: string; hint?: string; action?: { label: string; onClick: () => void }; tight?: boolean }, ...kids: Child[]): HTMLElement {
  const s = el("div", `ui-section${o.tight ? " tight" : ""}`);
  if (o.heading) {
    const head = el("div", "ui-section-head", el("span", "", o.heading));
    if (o.action) {
      const b = el("button", "ui-section-hint action", o.action.label);
      b.type = "button";
      b.addEventListener("click", o.action.onClick);
      head.append(b);
    } else if (o.hint) head.append(el("span", "ui-section-hint", o.hint));
    s.append(head);
  }
  for (const k of kids) if (k) s.append(k);
  return s;
}

// ---- Navigation rail ------------------------------------------------------

export type RailKey = "flows" | "chat" | "settings";
const RAIL_ICONS: Record<RailKey, string> = { flows: "box", chat: "message-square-text", settings: "sliders-vertical" };

// The logo: the Figma component "logo-flowbuilder", exported as SVG (48², r12,
// a radial gradient from the accent to the tile mint, a white four-point
// sparkle). Inlined because the plugin can't fetch assets (networkAccess: none).
// Its colours are the brand's, fixed in both themes. The gradient id is
// namespaced; when several rails share a page (the gallery), they all resolve
// it to the same, identical gradient, which is harmless.
const LOGO =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" aria-hidden="true">' +
  '<rect width="48" height="48" rx="12" fill="url(#ui-logo-grad)"/>' +
  '<path d="M24 10C24.6667 17.4667 30.5333 23.3333 38 24C30.5333 24.6667 24.6667 30.5333 24 38C23.3333 30.5333 17.4667 24.6667 10 24C17.4667 23.3333 23.3333 17.4667 24 10Z" fill="#fff"/>' +
  '<defs><radialGradient id="ui-logo-grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(24 12.8889) rotate(71.8619) scale(54.2514)">' +
  '<stop stop-color="#008069"/><stop offset="1" stop-color="#86DEC4"/></radialGradient></defs></svg>';

export interface RailOptions {
  active: RailKey;
  labels: Record<RailKey, string>; // tooltips
  onSelect: (key: RailKey) => void;
  theme?: { icon: "sun" | "moon"; title: string; onClick: () => void };
  help?: { title: string; onClick: () => void };
}

/** The 70px rail: the logo, the three destinations, theme + help at the foot. */
export function rail(o: RailOptions): HTMLElement {
  const r = el("nav", "ui-rail");
  const brand = el("div", "ui-rail-brand");
  brand.innerHTML = LOGO;
  const top = el("div", "ui-rail-top", brand);
  for (const key of ["flows", "chat", "settings"] as RailKey[]) {
    const b = el("button", "ui-rail-item", ic(RAIL_ICONS[key]));
    b.type = "button";
    b.dataset.rail = key;
    b.title = o.labels[key];
    b.setAttribute("aria-label", o.labels[key]);
    if (key === o.active) b.setAttribute("aria-current", "page");
    b.addEventListener("click", () => o.onSelect(key));
    top.append(b);
  }
  r.append(top);
  const foot = el("div", "ui-rail-foot");
  if (o.theme) {
    const b = el("button", "ui-rail-item boxed", ic(o.theme.icon));
    b.type = "button"; b.title = o.theme.title; b.setAttribute("aria-label", o.theme.title);
    b.dataset.rail = "theme";
    b.addEventListener("click", o.theme.onClick);
    foot.append(b);
  }
  if (o.help) {
    const b = el("button", "ui-rail-item plain", ic("circle-help"));
    b.type = "button"; b.title = o.help.title; b.setAttribute("aria-label", o.help.title);
    b.addEventListener("click", o.help.onClick);
    foot.append(b);
  }
  r.append(foot);
  return r;
}

/** Move the rail's current marker without rebuilding it. */
export function setRailActive(railEl: HTMLElement, key: RailKey): void {
  railEl.querySelectorAll<HTMLElement>(".ui-rail-item[data-rail]").forEach((b) => {
    if (b.dataset.rail === key) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
}

// ---- Toolbar --------------------------------------------------------------

export interface ToolbarOptions {
  title: string;
  meta?: string;
  caret?: boolean; // the title opens something (a flow picker)
  onTitle?: () => void;
  back?: { title: string; onClick: () => void };
  actions?: HTMLElement[]; // buttons, right-aligned
}

export function toolbar(o: ToolbarOptions): HTMLElement {
  const t = el("div", "ui-toolbar");
  if (o.back) t.append(button({ icon: "arrow-left", style: "secondary", title: o.back.title, onClick: o.back.onClick }));
  const title = el("div", `ui-toolbar-title${o.onTitle ? " clickable" : ""}`, el("span", "", o.title));
  if (o.caret) title.append(ic("chevron-down"));
  if (o.onTitle) title.addEventListener("click", o.onTitle);
  const text = el("div", "ui-toolbar-text", title);
  if (o.meta !== undefined) text.append(el("div", "ui-toolbar-meta", o.meta));
  t.append(text);
  for (const a of o.actions ?? []) t.append(a);
  return t;
}

export function setToolbarText(toolbarEl: HTMLElement, title: string, meta?: string): void {
  const t = toolbarEl.querySelector(".ui-toolbar-title > span");
  if (t) t.textContent = title;
  const m = toolbarEl.querySelector(".ui-toolbar-meta");
  if (m && meta !== undefined) m.textContent = meta;
}

// ---- Buttons --------------------------------------------------------------

export interface ButtonOptions {
  label?: string;
  icon?: string;
  style?: "primary" | "secondary" | "soft";
  sm?: boolean;
  title?: string;
  disabled?: boolean;
  onClick?: (ev: MouseEvent) => void;
}

export function button(o: ButtonOptions): HTMLButtonElement {
  const b = el("button", `ui-btn ${o.style ?? "secondary"}${o.sm ? " sm" : ""}${o.label ? "" : " icon"}`);
  b.type = "button";
  if (o.icon) b.append(ic(o.icon));
  if (o.label) b.append(el("span", "", o.label));
  if (o.title) { b.title = o.title; b.setAttribute("aria-label", o.title); }
  if (o.disabled) b.disabled = true;
  if (o.onClick) b.addEventListener("click", o.onClick);
  return b;
}

/** Swap a button's label/icon in place (Generate ↔ Update, spinner, check). */
export function setButton(b: HTMLButtonElement, o: { label?: string; icon?: string }): void {
  if (o.icon) { const s = b.querySelector(".ui-ic"); if (s) s.replaceChildren(iconEl(o.icon, 24)); }
  if (o.label !== undefined) { const s = b.querySelector("span:not(.ui-ic)"); if (s) s.textContent = o.label; }
}

// ---- Rows -----------------------------------------------------------------

export interface RowOptions {
  icon: string;
  label: string;
  /** What sits at the right edge. */
  trailing?: "none" | "chevron" | "caret" | "count" | "value" | "toggle";
  count?: number;
  value?: string;
  swatch?: string; // a colour next to the value
  toggle?: { on: boolean; onChange: (on: boolean) => void };
  on?: boolean;     // expanded category: strong label
  action?: boolean; // a command row ("Import JSON"): primary-coloured label
  onClick?: () => void;
}

/** Category / settings row: icon, label, and one of the six trailings. */
export function row(o: RowOptions): HTMLElement {
  const clickable = !!o.onClick && o.trailing !== "toggle";
  const r = el(clickable ? "button" : "div", `ui-row${o.on ? " on" : ""}${o.action ? " action" : ""}`);
  if (clickable) { (r as HTMLButtonElement).type = "button"; r.addEventListener("click", () => o.onClick!()); }
  r.append(ic(o.icon, "lg"), el("span", "ui-row-label", o.label));
  const trailing = o.trailing ?? (o.onClick ? "chevron" : "none");
  switch (trailing) {
    case "chevron": r.append(ic("chevron-right")); break;
    case "caret": r.append(ic("chevron-down")); break;
    case "count": r.append(el("span", "ui-row-count", String(o.count ?? 0)), ic(o.on ? "chevron-down" : "chevron-right")); break;
    case "value": {
      const v = el("div", "ui-row-value");
      if (o.swatch) { const s = el("span", "ui-row-swatch"); s.style.background = o.swatch; v.append(s); }
      v.append(el("span", "", o.value ?? ""), ic("chevron-right"));
      r.append(v);
      break;
    }
    case "toggle": {
      const t = toggle(o.toggle?.on ?? false, (on) => o.toggle?.onChange(on));
      t.setAttribute("aria-label", o.label);
      r.append(t);
      // The whole row flips the switch, like a settings list.
      r.addEventListener("click", (ev) => { if (ev.target !== t) { t.checked = !t.checked; t.dispatchEvent(new Event("change")); } });
      r.style.cursor = "pointer";
      break;
    }
  }
  return r;
}

export function setRowValue(rowEl: HTMLElement, value: string, swatch?: string): void {
  const v = rowEl.querySelector(".ui-row-value > span:not(.ui-row-swatch)");
  if (v) v.textContent = value;
  const s = rowEl.querySelector<HTMLElement>(".ui-row-swatch");
  if (s && swatch) s.style.background = swatch;
}

// ---- Cards ----------------------------------------------------------------

export const tile = (icon: string): HTMLElement => el("div", "ui-tile", ic(icon));

export function grip(title = ""): HTMLElement {
  const g = el("div", "ui-grip", ic("grip-vertical", "sm"));
  if (title) g.title = title;
  return g;
}

export interface CardOptions {
  icon: string;
  title: string;
  subtitle?: string;
  plain?: boolean;    // title in the secondary weight/colour
  selected?: boolean; // 2px accent border
  trailing?: "drag" | "chevron" | "badge" | "none";
  badge?: "in" | "out";
  gripTitle?: string;
  onClick?: () => void;
}

/**
 * The list card: tile, title + subtitle, and a trailing drag handle / chevron /
 * direction badge. Returns the card; `.ui-card-text` and `.ui-grip` are
 * queryable for the screens that need to update or drag them.
 */
export function card(o: CardOptions): HTMLElement {
  const trailing = o.trailing ?? "drag";
  // A card with a drag handle can't be a <button> (no interactive content inside
  // one), so it is a div that behaves like a button; the grip keeps its own events.
  const hasGrip = trailing === "drag" || (trailing === "badge" && !!o.badge);
  const c = el(o.onClick && !hasGrip ? "button" : "div", `ui-card${o.plain ? " plain" : ""}${o.selected ? " selected" : ""}`);
  if (o.onClick) {
    if (hasGrip) {
      c.classList.add("clickable"); c.setAttribute("role", "button"); c.tabIndex = 0;
      c.addEventListener("click", (ev) => { if (!(ev.target as HTMLElement).closest(".ui-grip")) o.onClick!(); });
      c.addEventListener("keydown", (ev: Event) => { const k = (ev as KeyboardEvent).key; if (k === "Enter" || k === " ") { ev.preventDefault(); o.onClick!(); } });
    } else {
      (c as HTMLButtonElement).type = "button";
      c.addEventListener("click", () => o.onClick!());
    }
  }
  const text = el("div", "ui-card-text", el("div", "ui-card-title", o.title));
  if (o.subtitle !== undefined) text.append(el("div", "ui-card-sub", o.subtitle));
  c.append(tile(o.icon), text);
  if (trailing === "badge" && o.badge) c.append(dirBadge(o.badge));
  if (hasGrip) c.append(grip(o.gripTitle));
  else if (trailing === "chevron") c.append(ic("chevron-right"));
  return c;
}

export function setCardText(cardEl: HTMLElement, title: string, subtitle?: string): void {
  const t = cardEl.querySelector(".ui-card-title"); if (t) t.textContent = title;
  const s = cardEl.querySelector(".ui-card-sub"); if (s && subtitle !== undefined) s.textContent = subtitle;
}

/**
 * The expanded card (screen 02): the same header as `card`, then an editor
 * block and an actions row inside the same border. The header toggles via
 * `onCollapse`; the caller fills `body`.
 */
export function cardExpanded(o: CardOptions & { body: HTMLElement; actions?: HTMLElement[]; onCollapse: () => void }): HTMLElement {
  const c = el("div", "ui-card open selected");
  const head = el("div", "ui-card-head");
  const text = el("div", "ui-card-text", el("div", "ui-card-title", o.title));
  if (o.subtitle !== undefined) text.append(el("div", "ui-card-sub", o.subtitle));
  const collapse = el("button", "ui-ic", iconEl("chevron-up", 24));
  (collapse as HTMLButtonElement).type = "button";
  collapse.style.cssText = "border:0;background:none;padding:0;cursor:pointer";
  collapse.addEventListener("click", o.onCollapse);
  head.append(tile(o.icon), text);
  if (o.trailing === "badge" && o.badge) head.append(dirBadge(o.badge));
  head.append(collapse, grip(o.gripTitle));
  c.append(head, o.body);
  if (o.actions?.length) c.append(el("div", "ui-card-actions", ...o.actions));
  return c;
}

export const dirBadge = (dir: "in" | "out"): HTMLElement => el("span", `ui-dir ${dir}`, dir);

// ---- Fields ---------------------------------------------------------------

export interface FieldOptions {
  label: string;
  value: string;
  required?: boolean;
  placeholder?: string;
  mono?: boolean;
  maxLength?: number;
  trailing?: HTMLElement;
  onInput: (v: string) => void;
  /** Fires on blur/Enter: for callers that persist on commit rather than per keystroke. */
  onCommit?: () => void;
}

/** Label (+ red asterisk) over a bordered input. Returns the wrapper; the input is `.ui-input input`. */
export function field(o: FieldOptions): HTMLElement {
  const label = el("label", "ui-field-label", el("span", "", o.label));
  if (o.required) label.append(el("span", "req", "*"));
  const input = el("input");
  input.type = "text"; input.value = o.value;
  if (o.placeholder) input.placeholder = o.placeholder;
  if (o.maxLength) input.maxLength = o.maxLength;
  input.addEventListener("input", () => o.onInput(input.value));
  if (o.onCommit) input.addEventListener("change", o.onCommit);
  const box = el("div", `ui-input${o.mono ? " mono" : ""}`, input, o.trailing);
  const id = `f${Math.random().toString(36).slice(2, 8)}`;
  input.id = id; label.htmlFor = id;
  return el("div", "ui-field", label, box);
}

export function textArea(o: { label: string; value: string; placeholder?: string; maxLength?: number; rows?: number; onInput: (v: string) => void }): HTMLElement {
  const label = el("label", "ui-field-label", el("span", "", o.label));
  const ta = el("textarea");
  if (o.rows) ta.rows = o.rows;
  ta.value = o.value;
  if (o.placeholder) ta.placeholder = o.placeholder;
  if (o.maxLength) ta.maxLength = o.maxLength;
  ta.addEventListener("input", () => o.onInput(ta.value));
  return el("div", "ui-field", label, ta);
}

export function searchField(o: { placeholder: string; kbd?: string; onInput: (v: string) => void }): HTMLElement {
  const input = el("input");
  input.type = "search"; input.placeholder = o.placeholder;
  input.addEventListener("input", () => o.onInput(input.value));
  const s = el("div", "ui-search", ic("search"), input);
  if (o.kbd) s.append(el("span", "ui-kbd", o.kbd));
  return s;
}

/** A label over any control (a dropdown, say) in the field layout. */
export function labeled(label: string, control: HTMLElement): HTMLElement {
  return el("div", "ui-field", el("label", "ui-field-label", el("span", "", label)), control);
}

/** Label + switch on one line, for inside a card (the settings list uses `row`). */
export function switchRow(label: string, on: boolean, onChange: (on: boolean) => void): HTMLElement {
  const t = toggle(on, onChange);
  const l = el("label", "ui-switch-row", el("span", "", label), t);
  return l;
}

export function toggle(on: boolean, onChange: (on: boolean) => void): HTMLInputElement {
  const t = el("input", "ui-switch");
  t.type = "checkbox"; t.checked = on;
  t.addEventListener("change", () => onChange(t.checked));
  return t;
}

/** One editable option in a data-source list: grip, text, remove. */
export function optionRow(o: { value: string; placeholder?: string; onInput: (v: string) => void; onRemove: () => void; removeTitle?: string }): HTMLElement {
  const input = el("input");
  input.type = "text"; input.value = o.value;
  if (o.placeholder) input.placeholder = o.placeholder;
  input.addEventListener("input", () => o.onInput(input.value));
  const x = el("button", "ui-option-x", ic("x", "sm"));
  x.type = "button";
  if (o.removeTitle) x.title = o.removeTitle;
  x.addEventListener("click", o.onRemove);
  return el("div", "ui-option", ic("grip-vertical", "sm", "grip"), input, x);
}

/** "+ Add option" — the accent text button under a list. */
export function addLink(label: string, onClick: () => void): HTMLButtonElement {
  const b = el("button", "ui-add", ic("plus", "sm"), el("span", "", label));
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}

// ---- Feedback -------------------------------------------------------------

export function banner(state: "ok" | "err" | "warn", message: string, onClick?: () => void): HTMLElement {
  const icon = state === "ok" ? "check" : state === "err" ? "circle-alert" : "triangle-alert";
  const b = el(onClick ? "button" : "div", `ui-banner ${state}`, ic(icon), el("span", "", message));
  if (onClick) { (b as HTMLButtonElement).type = "button"; b.addEventListener("click", onClick); }
  return b;
}

export const pill = (state: "ok" | "err", label: string): HTMLElement => el("span", `ui-pill ${state}`, label);

export function hint(icon: string, text: string): HTMLElement {
  return el("div", "ui-hint", ic(icon, "sm"), el("span", "", text));
}

export function chip(label: string, o: { active?: boolean; err?: boolean; onClick: () => void }): HTMLButtonElement {
  const c = el("button", `ui-chip${o.active ? " active" : ""}${o.err ? " err" : ""}`, label);
  c.type = "button";
  c.addEventListener("click", o.onClick);
  return c;
}
