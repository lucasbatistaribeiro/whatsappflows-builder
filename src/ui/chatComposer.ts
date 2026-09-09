// Chat mode's authoring UI: contact, thread options, and the message list.
// Reuses the Flows card machinery (grip + accordion + drag) and its CSS classes
// rather than inventing a second interaction — see knowledge/CHAT_UI.md.
//
// The official limits from CHAT_PATTERNS.md are enforced *here*, in the inputs:
// `maxlength` on every capped field and a disabled "add" once a count is reached,
// so an over-long label can't be typed rather than being flagged after the fact.
import type {
  Interactive, ListRow, Message, MessageType, TemplateButton, TemplateButtonType, Thread,
} from "../model/chatTypes";
import { LIMITS } from "../model/chatTypes";
import { CHAT_PALETTE, CHAT_PALETTE_GROUPS } from "../model/chatPalette";
import { createDropdown } from "./dropdown";
import { startDrag } from "./drag";
import { iconEl } from "./icons";
import { t } from "./i18n";

type Rerender = () => void;

/**
 * The thread being composed. Set at the top of every render — the list editor
 * needs it to clear `sheetOpen` on sibling messages, and threading it through
 * four editor signatures for that one case is worse.
 */
let currentThread: Thread;

const el = (tag: string, cls?: string, text?: string): HTMLElement => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

function label(text: string): HTMLElement {
  const l = el("label", "f");
  l.textContent = text;
  return l;
}

/** A capped text input. `max` comes from LIMITS, never a literal. */
function field(value: string, max: number, onInput: (v: string) => void, placeholder = ""): HTMLInputElement {
  const inp = document.createElement("input");
  inp.type = "text";
  inp.value = value;
  inp.maxLength = max;
  inp.placeholder = placeholder;
  inp.oninput = () => onInput(inp.value);
  return inp;
}

function area(value: string, max: number, onInput: (v: string) => void): HTMLTextAreaElement {
  const ta = document.createElement("textarea");
  ta.className = "chat-area";
  ta.value = value;
  ta.maxLength = max;
  ta.rows = 2;
  ta.oninput = () => onInput(ta.value);
  return ta;
}

function iconBtn(name: string, onClick: () => void, title = ""): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = "icon-btn";
  b.title = title;
  b.onclick = onClick;
  b.appendChild(iconEl(name, 16));
  return b;
}

function dropdown(value: string, options: { value: string; label: string }[], onChange: (v: string) => void): HTMLElement {
  const host = el("span");
  host.appendChild(createDropdown({ value, options, size: "sm", onChange }));
  return host;
}

function toggle(text: string, on: boolean, onChange: (v: boolean) => void): HTMLElement {
  const wrap = el("label", "menu-toggle");
  wrap.appendChild(el("span", undefined, text));
  const box = document.createElement("input");
  box.type = "checkbox";
  box.className = "menu-switch";
  box.checked = on;
  box.onchange = () => onChange(box.checked);
  wrap.appendChild(box);
  return wrap;
}

/**
 * An "add" button that disables itself at the official cap, so the limit is felt
 * in the UI instead of being a comment in a doc.
 */
function addBtn(text: string, count: number, max: number, onClick: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = "btn ghost add-row";
  b.appendChild(iconEl("plus", 16));
  b.appendChild(document.createTextNode(`${text} (${count}/${max})`));
  b.disabled = count >= max;
  if (b.disabled) b.title = t("chatAtLimit");
  else b.onclick = onClick;
  return b;
}

// ---- interactive editors --------------------------------------------------

function buttonsEditor(inter: Extract<Interactive, { kind: "buttons" }>, redraw: Rerender): HTMLElement {
  const box = el("div", "chat-sub");
  inter.buttons.forEach((b, i) => {
    const row = el("div", "chat-row");
    row.appendChild(field(b.title, LIMITS.replyButtonTitle, (v) => { b.title = v; redraw(); }, t("chatButtonLabel")));
    row.appendChild(iconBtn("trash-2", () => { inter.buttons.splice(i, 1); redraw(); }, t("remove")));
    box.appendChild(row);
  });
  box.appendChild(addBtn(t("chatAddButton"), inter.buttons.length, LIMITS.replyButtons,
    () => { inter.buttons.push({ title: "" }); redraw(); }));
  return box;
}

function listEditor(inter: Extract<Interactive, { kind: "list" }>, redraw: Rerender): HTMLElement {
  const box = el("div", "chat-sub");
  box.appendChild(label(t("chatListCta")));
  box.appendChild(field(inter.cta, LIMITS.listCta, (v) => { inter.cta = v; redraw(); }));

  // The model supports up to 10 sections; the editor exposes the first one only.
  // Multi-section authoring is a deliberate gap, not an oversight — see CHAT_UI.md.
  const section = inter.sections[0] ?? { rows: [] as ListRow[] };
  if (!inter.sections.length) inter.sections.push(section);

  box.appendChild(label(t("chatSectionTitle")));
  box.appendChild(field(section.title ?? "", LIMITS.listSectionTitle, (v) => { section.title = v || undefined; redraw(); }));

  section.rows.forEach((r, i) => {
    const row = el("div", "chat-row");
    const stack = el("div", "chat-stack");
    stack.appendChild(field(r.title, LIMITS.listRowTitle, (v) => { r.title = v; redraw(); }, t("chatRowTitle")));
    stack.appendChild(field(r.description ?? "", LIMITS.listRowDescription,
      (v) => { r.description = v || undefined; redraw(); }, t("chatRowDesc")));
    row.appendChild(stack);
    row.appendChild(iconBtn("trash-2", () => { section.rows.splice(i, 1); redraw(); }, t("remove")));
    box.appendChild(row);
  });
  box.appendChild(addBtn(t("chatAddRow"), section.rows.length, LIMITS.listRows,
    () => { section.rows.push({ title: "" }); redraw(); }));

  // Which of the list's two states to mock. Only one sheet can be open at a time,
  // so turning this on clears it on every other list message.
  box.appendChild(toggle(t("chatSheetOpen"), !!inter.sheetOpen, (on) => {
    if (on) for (const m of currentThread.messages) {
      if (m.interactive && m.interactive.kind === "list") m.interactive.sheetOpen = undefined;
    }
    inter.sheetOpen = on || undefined;
    redraw();
  }));
  return box;
}

const TEMPLATE_BUTTON_TYPES: TemplateButtonType[] =
  ["QUICK_REPLY", "URL", "PHONE_NUMBER", "COPY_CODE", "FLOW", "MPM", "CATALOG", "OTP"];

function templateEditor(inter: Extract<Interactive, { kind: "template" }>, redraw: Rerender): HTMLElement {
  const box = el("div", "chat-sub");
  box.appendChild(label(t("chatTplHeader")));
  box.appendChild(field(inter.header ?? "", LIMITS.headerText, (v) => { inter.header = v || undefined; redraw(); }));
  box.appendChild(label(t("chatTplFooter")));
  box.appendChild(field(inter.footer ?? "", LIMITS.footerText, (v) => { inter.footer = v || undefined; redraw(); }));

  inter.buttons.forEach((b: TemplateButton, i) => {
    const row = el("div", "chat-row");
    // Types stay in English: they mirror the spec, like Flows component names.
    row.appendChild(dropdown(b.type, TEMPLATE_BUTTON_TYPES.map((v) => ({ value: v, label: v })),
      (v) => { b.type = v as TemplateButtonType; redraw(); }));
    row.appendChild(field(b.text, LIMITS.templateButtonText, (v) => { b.text = v; redraw(); }, t("chatButtonLabel")));
    row.appendChild(iconBtn("trash-2", () => { inter.buttons.splice(i, 1); redraw(); }, t("remove")));
    box.appendChild(row);
  });
  box.appendChild(addBtn(t("chatAddButton"), inter.buttons.length, LIMITS.templateButtons,
    () => { inter.buttons.push({ type: "QUICK_REPLY", text: "" }); redraw(); }));
  return box;
}

function flowEditor(inter: Extract<Interactive, { kind: "flow" }>, redraw: Rerender): HTMLElement {
  const box = el("div", "chat-sub");
  box.appendChild(label(t("chatFlowCta")));
  box.appendChild(field(inter.cta, LIMITS.flowCta, (v) => { inter.cta = v; redraw(); }));
  return box;
}

const MESSAGE_TYPES: MessageType[] = ["text", "image", "video", "document", "audio"];

/** Fields that only make sense for the chosen media type. */
function mediaEditor(msg: Message, redraw: Rerender): HTMLElement {
  const box = el("div", "chat-sub");
  const media = msg.media ?? (msg.media = {});
  if (msg.type === "image" || msg.type === "video") {
    box.appendChild(label(t("chatMediaSrc")));
    // Long base64 belongs in a textarea; the cap is generous, not spec-derived.
    box.appendChild(area(media.src ?? "", 2_000_000, (v) => { media.src = v.trim() || undefined; redraw(); }));
  }
  if (msg.type === "document") {
    box.appendChild(label(t("chatFileName")));
    box.appendChild(field(media.name ?? "", 80, (v) => { media.name = v || undefined; redraw(); }, "invoice.pdf"));
    box.appendChild(label(t("chatFileSize")));
    box.appendChild(field(media.size ?? "", 20, (v) => { media.size = v || undefined; redraw(); }, "1.2 MB"));
  }
  if (msg.type === "audio" || msg.type === "video") {
    box.appendChild(label(t("chatDuration")));
    box.appendChild(field(media.duration ?? "", 10, (v) => { media.duration = v || undefined; redraw(); }, "0:35"));
  }
  return box;
}

/** The quoted-reply block: author plus one line of quoted text. */
function replyEditor(msg: Message, redraw: Rerender): HTMLElement {
  const box = el("div", "chat-sub");
  const reply = msg.replyTo!;
  box.appendChild(label(t("chatReplyAuthor")));
  box.appendChild(field(reply.author, 40, (v) => { reply.author = v; redraw(); }));
  box.appendChild(label(t("chatReplyText")));
  box.appendChild(field(reply.text, 120, (v) => { reply.text = v; redraw(); }));
  return box;
}

const KINDS = ["none", "buttons", "list", "flow", "template"] as const;

function freshInteractive(kind: string): Interactive | undefined {
  if (kind === "buttons") return { kind: "buttons", buttons: [{ title: "" }] };
  if (kind === "list") return { kind: "list", cta: "", sections: [{ rows: [{ title: "" }] }] };
  if (kind === "flow") return { kind: "flow", cta: "" };
  if (kind === "template") return { kind: "template", buttons: [] };
  return undefined;
}

// ---- message card ---------------------------------------------------------

/** One-line summary for a collapsed card. */
function summary(msg: Message): string {
  const kind = (msg.type !== "text" ? ` · ${msg.type}` : "") + (msg.interactive ? ` · ${msg.interactive.kind}` : "");
  const text = (msg.text ?? "").trim();
  const head = text.length > 34 ? text.slice(0, 34) + "…" : text || t("chatEmptyMessage");
  return head + kind;
}

// Cards start collapsed, matching the Flows component list — a long thread is
// unreadable with every editor open. `seen` is what makes "first render" mean
// something; a message added from the toolbar is marked seen *without* being
// collapsed, so it opens ready to type in.
const collapsed = new WeakSet<Message>();
const seen = new WeakSet<Message>();

function openOnFirstRender(msg: Message): void { seen.add(msg); }

/**
 * One setter per rendered card, rebuilt on every composer render. The collapse-all
 * button drives these rather than re-rendering, so the cards animate — the same
 * reason the Flows list keeps its own `cardToggles`.
 */
const cardToggles: ((collapse: boolean) => void)[] = [];

const anyExpanded = (thread: Thread): boolean => thread.messages.some((m) => !collapsed.has(m));

/** Set by the header on each render; cards call it after an individual toggle. */
let repaintCollapseAll: () => void = () => { /* no header yet */ };

function collapseIfNew(msg: Message): void {
  if (seen.has(msg)) return;
  seen.add(msg);
  collapsed.add(msg);
}

function messageCard(msg: Message, i: number, thread: Thread, host: HTMLElement, redraw: Rerender): HTMLElement {
  collapseIfNew(msg);
  const isCollapsed = collapsed.has(msg);
  const card = el("div", "comp" + (isCollapsed ? " collapsed" : ""));

  const row = el("div", "row");
  const grip = el("span", "comp-grip");
  grip.title = t("dragToReorder");
  grip.appendChild(iconEl("grip-vertical", 16));
  grip.addEventListener("pointerdown", (e) => startDrag(e as PointerEvent, card, host, thread.messages, redraw));

  const head = el("div", "comp-head");
  head.appendChild(el("span", "type", msg.direction === "out" ? t("chatOut") : t("chatIn")));
  head.appendChild(el("span", "chat-summary", summary(msg)));

  const chev = el("span", "comp-chev");
  chev.appendChild(iconEl(isCollapsed ? "chevron-down" : "chevron-up", 16));
  // Toggle in place (class only) so the body animates instead of re-rendering.
  const setCollapsed = (collapse: boolean): void => {
    card.classList.toggle("collapsed", collapse);
    if (collapse) collapsed.add(msg); else collapsed.delete(msg);
    chev.replaceChildren(iconEl(collapse ? "chevron-down" : "chevron-up", 16));
  };
  cardToggles.push(setCollapsed);
  const toggleCard = (): void => {
    setCollapsed(!card.classList.contains("collapsed"));
    repaintCollapseAll(); // otherwise the header still offers the stale action
  };
  head.onclick = toggleCard;
  chev.onclick = toggleCard;
  row.append(grip, head, chev);
  card.appendChild(row);

  const body = el("div", "comp-body");

  body.appendChild(label(t("chatDirection")));
  body.appendChild(dropdown(msg.direction,
    [{ value: "in", label: t("chatIn") }, { value: "out", label: t("chatOut") }],
    (v) => {
      msg.direction = v as Message["direction"];
      // Keep the model in step with what the Status dropdown *shows*. Incoming
      // messages carry no ticks, so the status is dropped; going back to outgoing
      // has to restore one, or the dropdown would display "Sent" over an
      // undefined status and the preview would render no tick at all.
      msg.status = v === "out" ? (msg.status ?? "sent") : undefined;
      redraw();
    }));

  body.appendChild(label(t("chatType")));
  body.appendChild(dropdown(msg.type, MESSAGE_TYPES.map((v) => ({ value: v, label: t("chatType_" + v) })),
    (v) => { msg.type = v as MessageType; redraw(); }));
  if (msg.type !== "text") body.appendChild(mediaEditor(msg, redraw));

  // For media the text is the caption, which the spec caps the same as a body.
  body.appendChild(label(msg.type === "text" ? t("chatText") : t("chatCaption")));
  body.appendChild(area(msg.text ?? "", LIMITS.bodyText, (v) => { msg.text = v; redraw(); }));

  body.appendChild(toggle(t("chatQuoted"), !!msg.replyTo, (on) => {
    msg.replyTo = on ? { author: thread.contact.name, text: "" } : undefined;
    redraw();
  }));
  if (msg.replyTo) body.appendChild(replyEditor(msg, redraw));

  const meta = el("div", "chat-row");
  const timeBox = el("div", "chat-stack");
  timeBox.appendChild(label(t("chatTime")));
  timeBox.appendChild(field(msg.time ?? "", 8, (v) => { msg.time = v || undefined; redraw(); }, "09:41"));
  meta.appendChild(timeBox);
  if (msg.direction === "out") {
    const statusBox = el("div", "chat-stack");
    statusBox.appendChild(label(t("chatStatus")));
    statusBox.appendChild(dropdown(msg.status ?? "sent",
      [{ value: "sent", label: t("chatSent") }, { value: "delivered", label: t("chatDelivered") },
       { value: "read", label: t("chatRead") }],
      (v) => { msg.status = v as Message["status"]; redraw(); }));
    meta.appendChild(statusBox);
  }
  body.appendChild(meta);

  body.appendChild(label(t("chatInteractive")));
  body.appendChild(dropdown(msg.interactive?.kind ?? "none",
    KINDS.map((k) => ({ value: k, label: k === "none" ? t("chatNone") : k })),
    (v) => { msg.interactive = freshInteractive(v); redraw(); }));

  const inter = msg.interactive;
  if (inter) {
    if (inter.kind === "buttons") body.appendChild(buttonsEditor(inter, redraw));
    else if (inter.kind === "list") body.appendChild(listEditor(inter, redraw));
    else if (inter.kind === "flow") body.appendChild(flowEditor(inter, redraw));
    else body.appendChild(templateEditor(inter, redraw));
  }

  const actions = el("div", "comp-actions");
  actions.appendChild(iconBtn("copy", () => {
    const copy: Message = JSON.parse(JSON.stringify(msg));
    copy.id = "m" + Date.now().toString(36);
    seen.add(copy); // open/closed like the card it came from
    if (collapsed.has(msg)) collapsed.add(copy);
    thread.messages.splice(i + 1, 0, copy);
    redraw();
  }, t("duplicate")));
  actions.appendChild(iconBtn("trash-2", () => { thread.messages.splice(i, 1); redraw(); }, t("remove")));
  body.appendChild(actions);

  // Grid wrapper so the collapse can animate to the body's natural height. Without
  // it `.comp.collapsed .comp-body-wrap` never matches and collapsing does nothing
  // visible — the class flips, the chevron flips, and the body stays 644px tall.
  const bodyWrap = el("div", "comp-body-wrap");
  bodyWrap.appendChild(body);
  card.appendChild(bodyWrap);
  return card;
}

// ---- the composer ---------------------------------------------------------

/** Render the composer for `thread` into `host`. `onChange` refreshes the preview. */
export function renderComposer(thread: Thread, host: HTMLElement, onChange: Rerender): void {
  const redraw = (): void => { renderComposer(thread, host, onChange); onChange(); };
  currentThread = thread;
  host.innerHTML = "";

  host.appendChild(el("div", "section-label", t("chatContact")));
  host.appendChild(label(t("chatName")));
  host.appendChild(field(thread.contact.name, 40, (v) => { thread.contact.name = v; onChange(); }));
  host.appendChild(label(t("chatPresence")));
  host.appendChild(field(thread.contact.presence ?? "", 40,
    (v) => { thread.contact.presence = v || undefined; onChange(); }, "online"));
  host.appendChild(toggle(t("chatVerified"), !!thread.contact.verified,
    (v) => { thread.contact.verified = v || undefined; onChange(); }));

  host.appendChild(el("div", "section-label", t("chatThread")));
  host.appendChild(label(t("chatDateLabel")));
  host.appendChild(field(thread.dateLabel ?? "", 20,
    (v) => { thread.dateLabel = v || undefined; onChange(); }, "TODAY"));
  host.appendChild(toggle(t("chatEncryption"), !!thread.showEncryptionNotice,
    (v) => { thread.showEncryptionNotice = v || undefined; onChange(); }));

  const head = el("div", "section-label section-row");
  head.appendChild(el("span", undefined, t("chatMessages")));
  const collapseAll = document.createElement("button");
  collapseAll.className = "collapse-all";
  collapseAll.type = "button";
  const paintCollapseAll = (): void => {  // also installed as repaintCollapseAll below
    collapseAll.style.display = thread.messages.length ? "" : "none";
    collapseAll.textContent = t(anyExpanded(thread) ? "collapseAll" : "expandAll");
  };
  collapseAll.onclick = () => {
    const collapse = anyExpanded(thread);
    for (const toggle of cardToggles) toggle(collapse); // animates; also updates the set
    paintCollapseAll();
  };
  head.appendChild(collapseAll);
  host.appendChild(head);
  repaintCollapseAll = paintCollapseAll;

  cardToggles.length = 0; // rebuilt below, one per card
  const list = el("div", "chat-list");
  thread.messages.forEach((msg, i) => list.appendChild(messageCard(msg, i, thread, list, redraw)));
  paintCollapseAll();
  if (!thread.messages.length) list.appendChild(el("div", "empty", t("chatNoMessages")));
  host.appendChild(list);

  // The same grouped, searchable picker the Flows palette uses, so adding a list
  // menu is the same gesture as adding a component. Entries arrive fully formed.
  const groups = CHAT_PALETTE_GROUPS
    .map((g) => ({ label: g, options: CHAT_PALETTE.filter((e) => e.group === g).map((e) => ({ value: e.key, label: e.label })) }))
    .filter((g) => g.options.length > 0);
  const picker = el("div", "chat-add");
  picker.appendChild(createDropdown({
    value: "",
    placeholder: t("chatAddPlaceholder"),
    groups,
    searchable: true,
    searchPlaceholder: t("chatSearchMessage"),
    resetAfterSelect: true,
    onChange: (key) => {
      const entry = CHAT_PALETTE.find((e) => e.key === key);
      if (!entry) return;
      const msg = entry.make();
      openOnFirstRender(msg); // a freshly added message opens ready to edit
      thread.messages.push(msg);
      redraw();
    },
  }));
  host.appendChild(picker);
}
