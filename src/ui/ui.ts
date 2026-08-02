// Plugin UI: a lightweight WhatsApp Flows "playground" — compose screens with a
// palette, edit the Flow JSON live (two-way), export it, and generate in Figma.
import type { FlowJSON, Screen, Component } from "../model/flowTypes";
import { PALETTE } from "../model/palette";
import { SAMPLE_FLOW } from "../model/sample";
import { postToMain } from "../shared/messages";
import { renderPreview, applyThemeVars } from "./preview";

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

let flow: FlowJSON = clone(SAMPLE_FLOW);
let current = 0; // selected screen index

// The single editable prop shown inline per component in the Build tab.
function primaryProp(c: Component): "text" | "label" | null {
  if (["TextHeading", "TextSubheading", "TextBody", "TextCaption", "RichText", "EmbeddedLink"].includes(c.type)) return "text";
  if (["TextInput", "TextArea", "DatePicker", "Dropdown", "RadioButtonsGroup", "CheckboxGroup", "ChipsSelector", "OptIn", "Footer"].includes(c.type)) return "label";
  return null;
}

function screen(): Screen {
  return flow.screens[current];
}

// ---- Rendering ----------------------------------------------------------

function renderScreens(): void {
  const host = $("#screens");
  host.innerHTML = "";
  flow.screens.forEach((s, i) => {
    const chip = document.createElement("div");
    chip.className = "chip" + (i === current ? " active" : "");
    const label = document.createElement("span");
    label.textContent = s.id + (s.terminal ? " ●" : "");
    label.onclick = () => { current = i; renderAll(); };
    chip.appendChild(label);
    if (flow.screens.length > 1) {
      const x = document.createElement("span");
      x.className = "x"; x.textContent = "✕";
      x.onclick = (e) => { e.stopPropagation(); flow.screens.splice(i, 1); current = Math.max(0, current - (i <= current ? 1 : 0)); syncAndRender(); };
      chip.appendChild(x);
    }
    host.appendChild(chip);
  });
  const add = document.createElement("button");
  add.className = "sm"; add.textContent = "+ Screen";
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

  host.appendChild(fieldLabel("Screen id"));
  host.appendChild(textField(s.id, (v) => { s.id = v.trim() || s.id; syncJson(); }));

  host.appendChild(fieldLabel("Title"));
  host.appendChild(textField(s.title ?? "", (v) => { s.title = v; syncJson(); }));

  host.appendChild(fieldLabel("Terminal"));
  const cb = document.createElement("input");
  cb.type = "checkbox"; cb.checked = !!s.terminal;
  cb.onchange = () => { s.terminal = cb.checked || undefined; renderScreens(); syncJson(); };
  host.appendChild(cb);
}

function renderPalette(): void {
  const host = $("#palette");
  host.innerHTML = "";
  for (const entry of PALETTE) {
    const b = document.createElement("button");
    b.className = "sm";
    b.textContent = entry.label;
    b.title = entry.type;
    b.onclick = () => { screen().layout.children.push(entry.make()); syncAndRender(); };
    host.appendChild(b);
  }
}

function renderComponentList(): void {
  const host = $("#comp-list");
  const kids = screen().layout.children;
  host.innerHTML = "";
  if (kids.length === 0) {
    const e = document.createElement("div");
    e.className = "empty"; e.textContent = "No components yet. Add one above.";
    host.appendChild(e);
    return;
  }
  kids.forEach((c, i) => {
    const card = document.createElement("div");
    card.className = "comp";

    const row = document.createElement("div");
    row.className = "row";
    const type = document.createElement("span");
    type.className = "type"; type.textContent = c.type;
    row.appendChild(type);
    row.appendChild(iconBtn("↑", () => move(i, -1)));
    row.appendChild(iconBtn("↓", () => move(i, +1)));
    row.appendChild(iconBtn("✕", () => { kids.splice(i, 1); syncAndRender(); }));
    card.appendChild(row);

    const prop = primaryProp(c);
    if (prop) {
      card.appendChild(textField(String(c[prop] ?? ""), (v) => { (c as Record<string, unknown>)[prop] = v; syncJson(); }, prop));
    }
    host.appendChild(card);
  });
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
  setJsonStatus(true, "Valid");
}

function onJsonInput(): void {
  const raw = ($("#json") as HTMLTextAreaElement).value;
  try {
    const parsed = JSON.parse(raw) as FlowJSON;
    if (!parsed.screens || !Array.isArray(parsed.screens)) throw new Error("Missing screens[]");
    flow = parsed;
    if (current >= flow.screens.length) current = 0;
    setJsonStatus(true, "Valid");
    renderScreens(); renderScreenMeta(); renderComponentList();
  } catch (err) {
    setJsonStatus(false, "Invalid JSON: " + (err instanceof Error ? err.message : String(err)));
  }
}

function setJsonStatus(ok: boolean, msg: string): void {
  const el = $("#json-status");
  el.className = "json-status " + (ok ? "ok" : "err");
  el.textContent = msg;
}

// ---- Orchestration ------------------------------------------------------

function renderAll(): void {
  renderScreens(); renderScreenMeta(); renderPalette(); renderComponentList();
  renderPreview(flow, $("#preview"), screen().id);
}
function syncAndRender(): void { syncJson(); renderAll(); }

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
function iconBtn(glyph: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = "sm ghost"; b.textContent = glyph; b.onclick = onClick;
  return b;
}
function uniqueId(base: string): string {
  let n = flow.screens.length + 1;
  let id = `${base}_${n}`;
  const has = (x: string) => flow.screens.some((s) => s.id === x);
  while (has(id)) id = `${base}_${++n}`;
  return id;
}

// ---- Wiring -------------------------------------------------------------

document.querySelectorAll(".tab").forEach((t) => {
  t.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    const name = (t as HTMLElement).dataset.tab;
    $("#panel-build").classList.toggle("active", name === "build");
    $("#panel-preview").classList.toggle("active", name === "preview");
    $("#panel-json").classList.toggle("active", name === "json");
    if (name === "preview") renderPreview(flow, $("#preview"), screen().id);
  });
});

$("#json").addEventListener("input", onJsonInput);

$("#generate").addEventListener("click", () => postToMain({ type: "generate", flow }));

$("#copy").addEventListener("click", () => {
  const text = JSON.stringify(flow, null, 2);
  navigator.clipboard?.writeText(text).then(
    () => postToMain({ type: "notify", message: "Flow JSON copied to clipboard." }),
    () => postToMain({ type: "notify", message: "Copy failed — use the Flow JSON tab." }),
  );
});

applyThemeVars();
syncJson();
renderAll();
