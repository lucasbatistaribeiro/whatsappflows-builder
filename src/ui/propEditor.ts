// Per-component property editor shown inside each Build-tab card. Returns a
// form whose controls mutate the component in place, then call back to sync.
import type { Component, DataSourceItem, ActionName } from "../model/flowTypes";

export interface EditorCallbacks {
  // Value changed but the set of fields did not — cheap sync (keeps focus).
  soft: () => void;
  // Fields added/removed (data-source item, action shape) — rebuild the card.
  structural: () => void;
}

const INPUT_TYPES = ["text", "number", "email", "password", "passcode", "phone"];
const ACTION_NAMES: ActionName[] = ["navigate", "complete", "data_exchange"];

export function buildPropEditor(c: Component, screenIds: string[], cb: EditorCallbacks): HTMLElement {
  const form = div("pe-form");
  const set = (k: string, v: unknown) => { (c as Record<string, unknown>)[k] = v; };

  switch (c.type) {
    case "TextHeading":
    case "TextSubheading":
    case "TextBody":
    case "TextCaption":
    case "RichText":
      form.appendChild(textArea("Text", str(c.text), (v) => { set("text", v); cb.soft(); }));
      break;

    case "TextInput":
      form.appendChild(text("Label", str(c.label), (v) => { set("label", v); cb.soft(); }));
      form.appendChild(text("Name", str(c.name), (v) => { set("name", v); cb.soft(); }));
      form.appendChild(select("Input type", str(c["input-type"]) || "text", INPUT_TYPES, (v) => { set("input-type", v); cb.soft(); }));
      form.appendChild(text("Helper text", str(c["helper-text"]), (v) => { set("helper-text", v || undefined); cb.soft(); }));
      form.appendChild(check("Required", !!c.required, (v) => { set("required", v || undefined); cb.soft(); }));
      break;

    case "TextArea":
      form.appendChild(text("Label", str(c.label), (v) => { set("label", v); cb.soft(); }));
      form.appendChild(text("Name", str(c.name), (v) => { set("name", v); cb.soft(); }));
      form.appendChild(text("Helper text", str(c["helper-text"]), (v) => { set("helper-text", v || undefined); cb.soft(); }));
      break;

    case "DatePicker":
      form.appendChild(text("Label", str(c.label), (v) => { set("label", v); cb.soft(); }));
      form.appendChild(text("Name", str(c.name), (v) => { set("name", v); cb.soft(); }));
      break;

    case "RadioButtonsGroup":
    case "CheckboxGroup":
    case "Dropdown":
    case "ChipsSelector":
      form.appendChild(text("Label", str(c.label), (v) => { set("label", v); cb.soft(); }));
      form.appendChild(text("Name", str(c.name), (v) => { set("name", v); cb.soft(); }));
      form.appendChild(dataSourceEditor(c, cb));
      break;

    case "OptIn":
      form.appendChild(text("Label", str(c.label), (v) => { set("label", v); cb.soft(); }));
      form.appendChild(text("Name", str(c.name), (v) => { set("name", v); cb.soft(); }));
      break;

    case "EmbeddedLink":
      form.appendChild(text("Text", str(c.text), (v) => { set("text", v); cb.soft(); }));
      form.appendChild(actionEditor(c, screenIds, cb));
      break;

    case "Image":
      form.appendChild(textArea("Base64 src", str(c.src), (v) => { set("src", v); cb.soft(); }, "data URI content (no prefix)…"));
      break;

    case "Footer":
      form.appendChild(text("Label", str(c.label), (v) => { set("label", v); cb.soft(); }));
      form.appendChild(actionEditor(c, screenIds, cb));
      form.appendChild(text("Left caption", str(c["left-caption"]), (v) => { set("left-caption", v || undefined); cb.soft(); }));
      form.appendChild(text("Right caption", str(c["right-caption"]), (v) => { set("right-caption", v || undefined); cb.soft(); }));
      break;
  }
  return form;
}

// ---- Action sub-editor --------------------------------------------------

function actionEditor(c: Component, screenIds: string[], cb: EditorCallbacks): HTMLElement {
  const wrap = div("pe-sub");
  let action = c["on-click-action"];
  if (!action) { action = { name: "navigate", next: { type: "screen", name: "" }, payload: {} }; c["on-click-action"] = action; }
  const a = action;

  wrap.appendChild(select("Action", a.name, ACTION_NAMES, (v) => {
    a.name = v as ActionName;
    if (a.name === "navigate") { if (!a.next) a.next = { type: "screen", name: "" }; }
    else delete a.next; // keep JSON clean: only navigate carries a target
    cb.structural(); // navigate target field appears/disappears
  }));

  if (a.name === "navigate") {
    const options = ["", ...screenIds];
    const current = a.next?.name ?? "";
    wrap.appendChild(select("Target", current, options, (v) => {
      a.next = { type: "screen", name: v };
      cb.soft();
    }, "(choose screen)"));
  }
  return wrap;
}

// ---- data-source sub-editor ---------------------------------------------

function dataSourceEditor(c: Component, cb: EditorCallbacks): HTMLElement {
  const wrap = div("pe-sub");
  const head = div("pe-sub-head");
  head.appendChild(spanText("Options"));
  const add = button("+ add", () => {
    const items = ((c["data-source"] as DataSourceItem[]) ??= []);
    items.push({ id: String(items.length), title: `Option ${items.length + 1}` });
    cb.structural();
  });
  head.appendChild(add);
  wrap.appendChild(head);

  const items = (c["data-source"] as DataSourceItem[]) ?? [];
  items.forEach((it, i) => {
    const row = div("pe-ds-row");
    const title = document.createElement("input");
    title.type = "text"; title.value = it.title; title.placeholder = "title";
    title.oninput = () => { it.title = title.value; cb.soft(); };
    row.appendChild(title);
    row.appendChild(button("✕", () => { items.splice(i, 1); cb.structural(); }, "pe-x"));
    wrap.appendChild(row);
  });
  return wrap;
}

// ---- primitives ---------------------------------------------------------

function div(cls: string): HTMLElement { const d = document.createElement("div"); d.className = cls; return d; }
function str(v: unknown): string { return v === undefined || v === null ? "" : String(v); }
function spanText(t: string): HTMLElement { const s = document.createElement("span"); s.className = "pe-label"; s.textContent = t; return s; }

function labeled(labelText: string, control: HTMLElement): HTMLElement {
  const row = div("pe-row");
  row.appendChild(spanText(labelText));
  row.appendChild(control);
  return row;
}

function text(labelText: string, value: string, onInput: (v: string) => void, placeholder = ""): HTMLElement {
  const inp = document.createElement("input");
  inp.type = "text"; inp.value = value; inp.placeholder = placeholder;
  inp.oninput = () => onInput(inp.value);
  return labeled(labelText, inp);
}

function textArea(labelText: string, value: string, onInput: (v: string) => void, placeholder = ""): HTMLElement {
  const ta = document.createElement("textarea");
  ta.className = "pe-ta"; ta.value = value; ta.placeholder = placeholder; ta.rows = 2;
  ta.oninput = () => onInput(ta.value);
  return labeled(labelText, ta);
}

function select(labelText: string, value: string, options: string[], onChange: (v: string) => void, emptyLabel?: string): HTMLElement {
  const sel = document.createElement("select");
  sel.className = "pe-select";
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt; o.textContent = opt === "" ? (emptyLabel ?? "—") : opt;
    if (opt === value) o.selected = true;
    sel.appendChild(o);
  }
  sel.onchange = () => onChange(sel.value);
  return labeled(labelText, sel);
}

function check(labelText: string, checked: boolean, onChange: (v: boolean) => void): HTMLElement {
  const cbx = document.createElement("input");
  cbx.type = "checkbox"; cbx.checked = checked;
  cbx.onchange = () => onChange(cbx.checked);
  const row = div("pe-row");
  row.appendChild(spanText(labelText));
  row.appendChild(cbx);
  return row;
}

function button(label: string, onClick: () => void, cls = "pe-btn"): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = cls; b.textContent = label; b.onclick = onClick;
  return b;
}
