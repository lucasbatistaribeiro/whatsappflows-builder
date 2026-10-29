// Chat mode's authoring UI: contact, thread options, and the message list.
// Built from the same components the Flows side uses (card + expanded card +
// drag) rather than inventing a second interaction — see knowledge/CHAT_UI.md.
//
// The official limits from CHAT_PATTERNS.md are enforced *here*, in the inputs:
// `maxlength` on every capped field and a disabled "add" once a count is reached,
// so an over-long label can't be typed rather than being flagged after the fact.
import type {
  Interactive, ListRow, Message, MessageType, TemplateButton, TemplateButtonType, Thread,
} from "../model/chatTypes";
import { LIMITS } from "../model/chatTypes";
import { CHAT_PALETTE } from "../model/chatPalette";
import { createDropdown } from "./dropdown";
import { startDrag } from "./drag";
import { t } from "./i18n";
import * as C from "./components";

type Rerender = () => void;

/**
 * Two kinds of edit, same split the Flows side uses (`softSync` / `structuralSync`
 * in ui.ts). A value edit must NOT rebuild the cards: `renderComposer` empties the
 * host, so re-rendering on every keystroke removes the focused input from the DOM
 * and the caret lands on `<body>` — you could only type one character at a time.
 */
export interface ComposerSync {
  /** A value changed: refresh the preview (and the card's collapsed summary). */
  soft: () => void;
  /** Fields appeared/disappeared (add/remove/kind/type/direction): rebuild cards. */
  structural: Rerender;
}

/**
 * The thread being composed. Set at the top of every render — the list editor
 * needs it to clear `sheetOpen` on sibling messages, and threading it through
 * four editor signatures for that one case is worse.
 */
let currentThread: Thread;

const el = C.el;

/** A capped, labelled text input. `max` comes from LIMITS, never a literal. */
function field(label: string, value: string, max: number, onInput: (v: string) => void, placeholder = ""): HTMLElement {
  return C.field({ label, value, maxLength: max, placeholder, onInput });
}

function area(label: string, value: string, max: number, onInput: (v: string) => void): HTMLElement {
  return C.textArea({ label, value, maxLength: max, rows: 2, onInput });
}

function dropdown(label: string, value: string, options: { value: string; label: string }[], onChange: (v: string) => void): HTMLElement {
  return C.labeled(label, createDropdown({ value, options, size: "md", onChange }));
}

const toggle = C.switchRow;

const removeBtn = (onClick: () => void): HTMLButtonElement => C.button({ icon: "trash-2", sm: true, title: t("remove"), onClick });

/**
 * An "add" link that disables itself at the official cap, so the limit is felt
 * in the UI instead of being a comment in a doc.
 */
function addBtn(text: string, count: number, max: number, onClick: () => void): HTMLButtonElement {
  const b = C.addLink(`${text} (${count}/${max})`, onClick);
  b.disabled = count >= max;
  if (b.disabled) b.title = t("chatAtLimit");
  return b;
}

// ---- interactive editors --------------------------------------------------

function buttonsEditor(inter: Extract<Interactive, { kind: "buttons" }>, sync: ComposerSync): HTMLElement {
  const box = el("div", "chat-sub");
  inter.buttons.forEach((b, i) => {
    box.append(el("div", "chat-row",
      field(t("chatButtonLabel"), b.title, LIMITS.replyButtonTitle, (v) => { b.title = v; sync.soft(); }),
      removeBtn(() => { inter.buttons.splice(i, 1); sync.structural(); })));
  });
  box.append(addBtn(t("chatAddButton"), inter.buttons.length, LIMITS.replyButtons,
    () => { inter.buttons.push({ title: "" }); sync.structural(); }));
  return box;
}

function listEditor(inter: Extract<Interactive, { kind: "list" }>, sync: ComposerSync): HTMLElement {
  const box = el("div", "chat-sub");
  box.append(field(t("chatListCta"), inter.cta, LIMITS.listCta, (v) => { inter.cta = v; sync.soft(); }));

  // The model supports up to 10 sections; the editor exposes the first one only.
  // Multi-section authoring is a deliberate gap, not an oversight — see CHAT_UI.md.
  const section = inter.sections[0] ?? { rows: [] as ListRow[] };
  if (!inter.sections.length) inter.sections.push(section);

  box.append(field(t("chatSectionTitle"), section.title ?? "", LIMITS.listSectionTitle, (v) => { section.title = v || undefined; sync.soft(); }));

  section.rows.forEach((r, i) => {
    const stack = el("div", "chat-stack",
      field(t("chatRowTitle"), r.title, LIMITS.listRowTitle, (v) => { r.title = v; sync.soft(); }),
      field(t("chatRowDesc"), r.description ?? "", LIMITS.listRowDescription, (v) => { r.description = v || undefined; sync.soft(); }));
    box.append(el("div", "chat-row", stack, removeBtn(() => { section.rows.splice(i, 1); sync.structural(); })));
  });
  box.append(addBtn(t("chatAddRow"), section.rows.length, LIMITS.listRows,
    () => { section.rows.push({ title: "" }); sync.structural(); }));

  // Which of the list's two states to mock. Only one sheet can be open at a time,
  // so turning this on clears it on every other list message.
  box.append(toggle(t("chatSheetOpen"), !!inter.sheetOpen, (on) => {
    if (on) for (const m of currentThread.messages) {
      if (m.interactive && m.interactive.kind === "list") m.interactive.sheetOpen = undefined;
    }
    inter.sheetOpen = on || undefined;
    sync.structural(); // the sibling toggles just changed too
  }));
  return box;
}

const TEMPLATE_BUTTON_TYPES: TemplateButtonType[] =
  ["QUICK_REPLY", "URL", "PHONE_NUMBER", "COPY_CODE", "FLOW", "MPM", "CATALOG", "OTP"];

function templateEditor(inter: Extract<Interactive, { kind: "template" }>, sync: ComposerSync): HTMLElement {
  const box = el("div", "chat-sub");
  box.append(field(t("chatTplHeader"), inter.header ?? "", LIMITS.headerText, (v) => { inter.header = v || undefined; sync.soft(); }));
  box.append(field(t("chatTplFooter"), inter.footer ?? "", LIMITS.footerText, (v) => { inter.footer = v || undefined; sync.soft(); }));

  inter.buttons.forEach((b: TemplateButton, i) => {
    // Types stay in English: they mirror the spec, like Flows component names.
    // A type swap changes no fields, so it's a value edit like the text beside it.
    const stack = el("div", "chat-stack",
      dropdown(t("chatType"), b.type, TEMPLATE_BUTTON_TYPES.map((v) => ({ value: v, label: v })),
        (v) => { b.type = v as TemplateButtonType; sync.soft(); }),
      field(t("chatButtonLabel"), b.text, LIMITS.templateButtonText, (v) => { b.text = v; sync.soft(); }));
    box.append(el("div", "chat-row", stack, removeBtn(() => { inter.buttons.splice(i, 1); sync.structural(); })));
  });
  box.append(addBtn(t("chatAddButton"), inter.buttons.length, LIMITS.templateButtons,
    () => { inter.buttons.push({ type: "QUICK_REPLY", text: "" }); sync.structural(); }));
  return box;
}

function flowEditor(inter: Extract<Interactive, { kind: "flow" }>, sync: ComposerSync): HTMLElement {
  return el("div", "chat-sub", field(t("chatFlowCta"), inter.cta, LIMITS.flowCta, (v) => { inter.cta = v; sync.soft(); }));
}

const MESSAGE_TYPES: MessageType[] = ["text", "image", "video", "document", "audio"];

/** Fields that only make sense for the chosen media type. */
function mediaEditor(msg: Message, sync: ComposerSync): HTMLElement {
  const box = el("div", "chat-sub");
  const media = msg.media ?? (msg.media = {});
  if (msg.type === "image" || msg.type === "video") {
    // Long base64 belongs in a textarea; the cap is generous, not spec-derived.
    box.append(area(t("chatMediaSrc"), media.src ?? "", 2_000_000, (v) => { media.src = v.trim() || undefined; sync.soft(); }));
  }
  if (msg.type === "document") {
    box.append(field(t("chatFileName"), media.name ?? "", 80, (v) => { media.name = v || undefined; sync.soft(); }, "invoice.pdf"));
    box.append(field(t("chatFileSize"), media.size ?? "", 20, (v) => { media.size = v || undefined; sync.soft(); }, "1.2 MB"));
  }
  if (msg.type === "audio" || msg.type === "video") {
    box.append(field(t("chatDuration"), media.duration ?? "", 10, (v) => { media.duration = v || undefined; sync.soft(); }, "0:35"));
  }
  return box;
}

/** The quoted-reply block: author plus one line of quoted text. */
function replyEditor(msg: Message, sync: ComposerSync): HTMLElement {
  const reply = msg.replyTo!;
  return el("div", "chat-sub",
    field(t("chatReplyAuthor"), reply.author, 40, (v) => { reply.author = v; sync.soft(); }),
    field(t("chatReplyText"), reply.text, 120, (v) => { reply.text = v; sync.soft(); }));
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

const TYPE_ICON: Record<MessageType, string> = { text: "message-square-text", image: "image", video: "video", document: "file-text", audio: "mic" };
const KIND_ICON: Record<string, string> = { buttons: "reply", list: "list", flow: "workflow", template: "layout-template" };
const icon = (msg: Message): string => (msg.interactive && KIND_ICON[msg.interactive.kind]) || TYPE_ICON[msg.type];

/** The card's title: the text, or what stands for it. */
function title(msg: Message): string {
  return (msg.text ?? "").trim() || t("chatEmptyMessage"); // the card ellipsises
}

/** The card's subtitle: type, interactive kind, time, status. */
function summary(msg: Message): string {
  const parts = [msg.type === "text" ? t("chatText") : t("chatType_" + msg.type)];
  if (msg.interactive) parts.push(msg.interactive.kind);
  if (msg.time) parts.push(msg.time);
  if (msg.direction === "out" && msg.status) parts.push(t("chat" + msg.status[0].toUpperCase() + msg.status.slice(1)).toLowerCase());
  return parts.join(" · ");
}

// Cards start collapsed, matching the Flows component list — a long thread is
// unreadable with every editor open. `seen` is what makes "first render" mean
// something; a message added from the library is marked seen *without* being
// collapsed, so it opens ready to type in.
const collapsed = new WeakSet<Message>();
const seen = new WeakSet<Message>();

const anyExpanded = (thread: Thread): boolean => thread.messages.some((m) => !collapsed.has(m));

function collapseIfNew(msg: Message): void {
  if (seen.has(msg)) return;
  seen.add(msg);
  collapsed.add(msg);
}

/** Append a message of the palette entry `key` to `thread`, open for editing. */
export function addMessage(thread: Thread, key: string): void {
  const entry = CHAT_PALETTE.find((e) => e.key === key);
  if (!entry) return;
  const msg = entry.make();
  seen.add(msg); // opens ready to edit
  thread.messages.push(msg);
}

function messageCard(msg: Message, i: number, thread: Thread, host: HTMLElement, sync: ComposerSync): HTMLElement {
  const redraw = sync.structural;
  collapseIfNew(msg);
  const drag = (card: HTMLElement) => (e: Event) => startDrag(e as PointerEvent, card, host, thread.messages, redraw);

  if (collapsed.has(msg)) {
    const card = C.card({ icon: icon(msg), title: title(msg), subtitle: summary(msg), trailing: "badge", badge: msg.direction,
      gripTitle: t("dragToReorder"), onClick: () => { collapsed.delete(msg); redraw(); } });
    card.querySelector(".ui-grip")?.addEventListener("pointerdown", drag(card));
    return card;
  }

  let card: HTMLElement;
  // The collapsed summary used to refresh for free, because every keystroke
  // re-rendered the whole composer. Value edits no longer do, so patch it here.
  const cardSync: ComposerSync = {
    soft: () => { C.setCardText(card, title(msg), summary(msg)); sync.soft(); },
    structural: sync.structural,
  };

  const body = el("div", "pe-form");
  body.append(dropdown(t("chatDirection"), msg.direction,
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

  body.append(dropdown(t("chatType"), msg.type, MESSAGE_TYPES.map((v) => ({ value: v, label: t("chatType_" + v) })),
    (v) => { msg.type = v as MessageType; redraw(); })); // swaps the media fields
  if (msg.type !== "text") body.append(mediaEditor(msg, cardSync));

  // For media the text is the caption, which the spec caps the same as a body.
  body.append(area(msg.type === "text" ? t("chatText") : t("chatCaption"), msg.text ?? "", LIMITS.bodyText,
    (v) => { msg.text = v; cardSync.soft(); }));

  body.append(toggle(t("chatQuoted"), !!msg.replyTo, (on) => {
    msg.replyTo = on ? { author: thread.contact.name, text: "" } : undefined;
    redraw(); // the reply sub-editor appears/disappears
  }));
  if (msg.replyTo) body.append(replyEditor(msg, cardSync));

  const meta = el("div", "chat-row", field(t("chatTime"), msg.time ?? "", 8, (v) => { msg.time = v || undefined; cardSync.soft(); }, "09:41"));
  if (msg.direction === "out") {
    meta.append(dropdown(t("chatStatus"), msg.status ?? "sent",
      [{ value: "sent", label: t("chatSent") }, { value: "delivered", label: t("chatDelivered") }, { value: "read", label: t("chatRead") }],
      (v) => { msg.status = v as Message["status"]; cardSync.soft(); }));
  }
  body.append(meta);

  body.append(dropdown(t("chatInteractive"), msg.interactive?.kind ?? "none",
    KINDS.map((k) => ({ value: k, label: k === "none" ? t("chatNone") : k })),
    (v) => { msg.interactive = freshInteractive(v); redraw(); })); // swaps the sub-editor

  const inter = msg.interactive;
  if (inter) {
    if (inter.kind === "buttons") body.append(buttonsEditor(inter, cardSync));
    else if (inter.kind === "list") body.append(listEditor(inter, cardSync));
    else if (inter.kind === "flow") body.append(flowEditor(inter, cardSync));
    else body.append(templateEditor(inter, cardSync));
  }

  card = C.cardExpanded({
    icon: icon(msg), title: title(msg), subtitle: summary(msg), body, gripTitle: t("dragToReorder"),
    trailing: "badge", badge: msg.direction,
    onCollapse: () => { collapsed.add(msg); redraw(); },
    actions: [
      C.button({ icon: "copy", label: t("duplicate"), sm: true, onClick: () => {
        const copy: Message = JSON.parse(JSON.stringify(msg));
        copy.id = "m" + Date.now().toString(36);
        seen.add(copy); // open/closed like the card it came from
        if (collapsed.has(msg)) collapsed.add(copy);
        thread.messages.splice(i + 1, 0, copy);
        redraw();
      } }),
      C.button({ icon: "trash-2", label: t("remove"), sm: true, onClick: () => { thread.messages.splice(i, 1); redraw(); } }),
    ],
  });
  card.querySelector(".ui-card-head .ui-grip")?.addEventListener("pointerdown", drag(card));
  return card;
}

// ---- the composer ---------------------------------------------------------

/**
 * Render the composer for `thread` into `host`: the contact, the thread
 * options and the message cards. `onChange` runs after every edit (the screen
 * keeps its toolbar meta current with it). Adding a message is the library
 * screen's job — `addMessage` — so the composer has no picker of its own.
 */
export function renderComposer(thread: Thread, host: HTMLElement, onChange: Rerender): void {
  const redraw = (): void => { renderComposer(thread, host, onChange); onChange(); };
  // Value edits keep the DOM (and the caret); only structural ones rebuild it.
  const sync: ComposerSync = { soft: onChange, structural: redraw };
  currentThread = thread;
  host.replaceChildren();

  host.append(C.section({ heading: t("chatContact") },
    field(t("chatName"), thread.contact.name, 40, (v) => { thread.contact.name = v; onChange(); }),
    field(t("chatPresence"), thread.contact.presence ?? "", 40, (v) => { thread.contact.presence = v || undefined; onChange(); }, "online"),
    C.row({ icon: "badge-check", label: t("chatVerified"), trailing: "toggle",
      toggle: { on: !!thread.contact.verified, onChange: (v) => { thread.contact.verified = v || undefined; onChange(); } } }),
  ));

  host.append(C.section({ heading: t("chatThread") },
    field(t("chatDateLabel"), thread.dateLabel ?? "", 20, (v) => { thread.dateLabel = v || undefined; onChange(); }, "TODAY"),
    C.row({ icon: "lock", label: t("chatEncryption"), trailing: "toggle",
      toggle: { on: !!thread.showEncryptionNotice, onChange: (v) => { thread.showEncryptionNotice = v || undefined; onChange(); } } }),
  ));

  const list = el("div", "ui-list");
  thread.messages.forEach((msg, i) => list.append(messageCard(msg, i, thread, list, sync)));
  if (!thread.messages.length) list.append(C.hint("message-square-text", t("chatNoMessages")));
  host.append(C.divider(), C.section({
    heading: t("chatMessages"),
    hint: thread.messages.length > 1 ? t("dragToReorder") : undefined,
    action: thread.messages.length ? { label: t(anyExpanded(thread) ? "collapseAll" : "expandAll"), onClick: () => {
      const collapse = anyExpanded(thread);
      for (const m of thread.messages) { if (collapse) collapsed.add(m); else collapsed.delete(m); }
      redraw();
    } } : undefined,
  }, list));
}
