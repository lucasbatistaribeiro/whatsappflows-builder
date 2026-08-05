// Custom dropdown replacing the native <select>, so the whole control — the
// open list, its scrollbar, borders and hover states — follows the project
// theme (the native <select> popup is drawn by the OS and can't be styled).
// The plugin UI is a Chromium iframe, so this is fully supported in Figma.
import { iconEl } from "./icons";

export interface DDOption { value: string; label: string; }
export interface DDGroup { label: string; options: DDOption[]; }

export interface DDConfig {
  value: string;
  placeholder?: string;
  options?: DDOption[];
  groups?: DDGroup[];
  onChange: (value: string) => void;
  size?: "mini" | "md" | "sm";
  resetAfterSelect?: boolean; // action-style triggers (palette/template) keep the placeholder
  searchable?: boolean; // show a filter input at the top of the open list
  searchPlaceholder?: string;
}

let closeCurrent: (() => void) | null = null;

function allOptions(cfg: DDConfig): DDOption[] {
  return cfg.groups ? cfg.groups.flatMap((g) => g.options) : (cfg.options ?? []);
}
function labelFor(cfg: DDConfig, value: string): string {
  const found = allOptions(cfg).find((o) => o.value === value);
  return found ? found.label : (cfg.placeholder ?? "");
}
function isPlaceholder(cfg: DDConfig, value: string): boolean {
  return !allOptions(cfg).some((o) => o.value === value);
}

export function createDropdown(cfg: DDConfig): HTMLElement {
  const size = cfg.size ?? "md";
  const dd = document.createElement("div");
  dd.className = "dd dd-" + size;
  dd.tabIndex = 0;
  dd.setAttribute("role", "combobox");

  const valueEl = document.createElement("span");
  valueEl.className = "dd-value";
  const chev = document.createElement("span");
  chev.className = "dd-chev";
  chev.appendChild(iconEl("chevron-down", 16));
  dd.append(valueEl, chev);

  let currentValue = cfg.value;
  const paint = () => {
    valueEl.textContent = labelFor(cfg, currentValue) || (cfg.placeholder ?? "");
    valueEl.classList.toggle("dd-placeholder", isPlaceholder(cfg, currentValue));
  };
  paint();

  function open(): void {
    if (closeCurrent) closeCurrent();

    const list = document.createElement("div");
    list.className = "dd-list dd-" + size;
    list.setAttribute("role", "listbox");

    const optionsWrap = document.createElement("div");
    optionsWrap.className = "dd-options";

    const entries: { el: HTMLElement; label: string; value: string }[] = [];
    const groupEls: { el: HTMLElement; opts: HTMLElement[] }[] = [];

    const addOption = (o: DDOption, groupOpts?: HTMLElement[]) => {
      const el = document.createElement("div");
      el.className = "dd-option" + (o.value === currentValue ? " selected" : "");
      el.setAttribute("role", "option");
      el.textContent = o.label;
      el.onmousedown = (e) => { e.preventDefault(); select(o.value); };
      optionsWrap.appendChild(el);
      entries.push({ el, label: o.label.toLowerCase(), value: o.value });
      if (groupOpts) groupOpts.push(el);
    };
    if (cfg.groups) {
      for (const g of cfg.groups) {
        if (!g.options.length) continue;
        const gh = document.createElement("div");
        gh.className = "dd-group"; gh.textContent = g.label;
        optionsWrap.appendChild(gh);
        const opts: HTMLElement[] = [];
        g.options.forEach((o) => addOption(o, opts));
        groupEls.push({ el: gh, opts });
      }
    } else {
      (cfg.options ?? []).forEach((o) => addOption(o));
    }

    let search: HTMLInputElement | null = null;
    if (cfg.searchable) {
      search = document.createElement("input");
      search.type = "text";
      search.className = "dd-search";
      search.placeholder = cfg.searchPlaceholder ?? "";
      const applyFilter = (): void => {
        const q = search!.value.trim().toLowerCase();
        for (const e of entries) e.el.style.display = !q || e.label.includes(q) ? "" : "none";
        for (const g of groupEls) g.el.style.display = g.opts.some((o) => o.style.display !== "none") ? "" : "none";
      };
      search.addEventListener("input", applyFilter);
      search.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const first = entries.find((x) => x.el.style.display !== "none");
          if (first) { e.preventDefault(); select(first.value); }
        } else if (e.key === "Escape") { e.preventDefault(); close(); }
      });
      list.appendChild(search);
    }
    list.appendChild(optionsWrap);

    document.body.appendChild(list);
    position(list, dd);
    dd.classList.add("open");
    if (search) setTimeout(() => search!.focus(), 0);

    const onDocDown = (e: MouseEvent) => {
      if (!list.contains(e.target as Node) && !dd.contains(e.target as Node)) close();
    };
    // Close when the page/container scrolls (the fixed popup would detach),
    // but not when the user scrolls inside the list itself.
    const onScroll = (e: Event) => { if (!list.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
    setTimeout(() => {
      document.addEventListener("mousedown", onDocDown);
      window.addEventListener("scroll", onScroll, true);
      window.addEventListener("resize", onScroll);
      document.addEventListener("keydown", onKey);
    }, 0);

    closeCurrent = () => {
      document.removeEventListener("mousedown", onDocDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("keydown", onKey);
      list.remove();
      dd.classList.remove("open");
      closeCurrent = null;
    };
  }

  function close(): void { if (closeCurrent) closeCurrent(); }

  function select(value: string): void {
    currentValue = value;
    close();
    if (!cfg.resetAfterSelect) paint();
    cfg.onChange(value);
  }

  dd.addEventListener("click", () => (dd.classList.contains("open") ? close() : open()));
  dd.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      if (!dd.classList.contains("open")) open();
    } else if (e.key === "Escape") close();
  });

  return dd;
}

// Fixed-position the list at the trigger, flipping up when there's no room below.
function position(list: HTMLElement, trigger: HTMLElement): void {
  const r = trigger.getBoundingClientRect();
  const gap = 4, margin = 8, cap = 260;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  list.style.position = "fixed";

  // Width: exactly match the trigger, but never wider than the viewport.
  const w = Math.min(r.width, vw - margin * 2);
  list.style.width = w + "px";
  list.style.minWidth = "0";
  list.style.maxWidth = "none";

  // Horizontal: align to the trigger, then clamp inside the viewport.
  let left = r.left;
  if (left + w > vw - margin) left = vw - margin - w;
  if (left < margin) left = margin;
  list.style.left = left + "px";

  // Vertical: flip up when there's no room below. Reset the edge we're NOT using
  // (the stylesheet pins `top: 0`, so leaving it set while anchoring `bottom`
  // would stretch the list from the top of the viewport).
  const below = vh - r.bottom;
  if (below < 180 && r.top > below) {
    list.style.top = "auto";
    list.style.bottom = vh - r.top + gap + "px";
    list.style.maxHeight = Math.min(cap, r.top - gap - margin) + "px";
  } else {
    list.style.bottom = "auto";
    list.style.top = r.bottom + gap + "px";
    list.style.maxHeight = Math.min(cap, below - gap - margin) + "px";
  }
}
