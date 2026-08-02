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
  chev.appendChild(iconEl("chevron-down", 14));
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

    const addOption = (o: DDOption) => {
      const el = document.createElement("div");
      el.className = "dd-option" + (o.value === currentValue ? " selected" : "");
      el.setAttribute("role", "option");
      el.textContent = o.label;
      el.onmousedown = (e) => { e.preventDefault(); select(o.value); };
      list.appendChild(el);
    };
    if (cfg.groups) {
      for (const g of cfg.groups) {
        if (!g.options.length) continue;
        const gh = document.createElement("div");
        gh.className = "dd-group"; gh.textContent = g.label;
        list.appendChild(gh);
        g.options.forEach(addOption);
      }
    } else {
      (cfg.options ?? []).forEach(addOption);
    }

    document.body.appendChild(list);
    position(list, dd);
    dd.classList.add("open");

    const onDocDown = (e: MouseEvent) => {
      if (!list.contains(e.target as Node) && !dd.contains(e.target as Node)) close();
    };
    const onScroll = () => close();
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
  const gap = 4;
  const cap = 260;
  list.style.position = "fixed";
  list.style.left = r.left + "px";
  list.style.minWidth = r.width + "px";
  const below = window.innerHeight - r.bottom;
  if (below < 180 && r.top > below) {
    list.style.bottom = window.innerHeight - r.top + gap + "px";
    list.style.maxHeight = Math.min(cap, r.top - gap - 8) + "px";
  } else {
    list.style.top = r.bottom + gap + "px";
    list.style.maxHeight = Math.min(cap, below - gap - 8) + "px";
  }
}
