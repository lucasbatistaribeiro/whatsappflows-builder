// Chat-mode preview: renders a Thread as a WhatsApp conversation inside the same
// .wa-phone frame the Flows preview uses. See knowledge/CHAT_UI.md.
//
// Colours come from the --wa-* CSS vars that preview.ts pushes from theme.ts, so
// light/dark works without this file knowing about either palette.
import type { Interactive, Message, TemplateButtonType, Thread } from "../model/chatTypes";
import { startsRun, endsRun } from "../model/chatTypes";
import { iconEl } from "./icons";
import { statusBar } from "./preview";

function el(tag: string, className?: string, text?: string): HTMLElement {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

/** Initials for the monogram shown when a contact has no avatar image. */
function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();
}

function avatar(name: string, src?: string): HTMLElement {
  if (src) {
    const img = el("img", "wa-c-avatar") as HTMLImageElement;
    img.src = src;
    img.alt = "";
    return img;
  }
  return el("div", "wa-c-avatar wa-c-monogram", initials(name));
}

function header(thread: Thread): HTMLElement {
  const bar = el("div", "wa-c-header");
  bar.appendChild(iconEl("chevron-left", 20));
  bar.appendChild(avatar(thread.contact.name, thread.contact.avatar));

  const names = el("div", "wa-c-names");
  const nameRow = el("div", "wa-c-name");
  nameRow.appendChild(el("span", undefined, thread.contact.name));
  if (thread.contact.verified) nameRow.appendChild(iconEl("badge-check", 13));
  names.appendChild(nameRow);
  if (thread.contact.presence) {
    names.appendChild(el("div", "wa-c-presence", thread.contact.presence));
  }
  bar.appendChild(names);

  const actions = el("div", "wa-c-actions");
  for (const name of ["video", "phone", "more-vertical"]) {
    actions.appendChild(iconEl(name, 18));
  }
  bar.appendChild(actions);
  return bar;
}

/**
 * The tick glyph on an outgoing bubble. One check for sent, two for delivered,
 * two in the tick blue for read.
 */
function ticks(status: Message["status"]): HTMLElement {
  const wrap = el("span", "wa-c-ticks" + (status === "read" ? " read" : ""));
  wrap.appendChild(iconEl(status === "sent" ? "check" : "check-check", 14));
  return wrap;
}

/**
 * Time + ticks, on their OWN row rather than inline with the text. Real WhatsApp
 * reflows the last text line around the timestamp, which needs shape-aware text
 * layout that neither CSS nor Figma auto-layout has — see the trade-off in
 * knowledge/CHAT_UI.md before "fixing" this.
 */
function metaRow(msg: Message): HTMLElement {
  const meta = el("div", "wa-c-meta");
  if (msg.time) meta.appendChild(el("span", "wa-c-time", msg.time));
  if (msg.direction === "out" && msg.status) meta.appendChild(ticks(msg.status));
  return meta;
}

function quoted(reply: NonNullable<Message["replyTo"]>): HTMLElement {
  const box = el("div", "wa-c-quote");
  box.appendChild(el("div", "wa-c-quote-author", reply.author));
  box.appendChild(el("div", "wa-c-quote-text", reply.text));
  return box;
}

/** Leading glyph per template button type. */
const TEMPLATE_BUTTON_ICON: Record<TemplateButtonType, string> = {
  QUICK_REPLY: "reply", URL: "external-link", PHONE_NUMBER: "phone",
  COPY_CODE: "copy", FLOW: "layout-list", MPM: "shopping-bag",
  CATALOG: "shopping-bag", OTP: "copy",
};

/**
 * One full-width action row: a centred, accent-coloured label with an optional
 * leading glyph. Reply buttons, the list CTA, the flow CTA and template buttons
 * all render this way in WhatsApp, so they share one builder instead of four
 * near-identical ones.
 *
 * INFERRED, not calibrated: no official screenshot of any of these was found
 * (knowledge/CHAT_PATTERNS.md). The payload limits are official; this layout is
 * our reading of it.
 */
function actionRow(label: string, icon?: string): HTMLElement {
  const row = el("div", "wa-c-action");
  if (icon) row.appendChild(iconEl(icon, 15));
  row.appendChild(el("span", undefined, label));
  return row;
}

/** The list menu's bottom sheet — the second state a list message has. */
function listSheet(inter: Extract<Interactive, { kind: "list" }>): HTMLElement {
  const sheet = el("div", "wa-c-sheet");
  sheet.appendChild(el("div", "wa-c-sheet-title", inter.cta));
  for (const section of inter.sections) {
    if (section.title) sheet.appendChild(el("div", "wa-c-sheet-section", section.title));
    for (const row of section.rows) {
      const r = el("div", "wa-c-sheet-row");
      const txt = el("div", "wa-c-sheet-text");
      txt.appendChild(el("div", "wa-c-sheet-row-title", row.title));
      if (row.description) txt.appendChild(el("div", "wa-c-sheet-desc", row.description));
      r.appendChild(txt);
      r.appendChild(el("span", "wa-c-radio"));
      sheet.appendChild(r);
    }
  }
  return sheet;
}

/** The interactive part that hangs under a bubble's text. */
function interactive(inter: Interactive): HTMLElement {
  const box = el("div", "wa-c-actions-box");
  if (inter.kind === "buttons") {
    for (const b of inter.buttons) box.appendChild(actionRow(b.title));
  } else if (inter.kind === "list") {
    box.appendChild(actionRow(inter.cta, "list"));
  } else if (inter.kind === "flow") {
    box.appendChild(actionRow(inter.cta, "layout-list"));
  } else {
    for (const b of inter.buttons) box.appendChild(actionRow(b.text, TEMPLATE_BUTTON_ICON[b.type]));
  }
  return box;
}

function bubble(msg: Message, tail: boolean, showMeta: boolean): HTMLElement {
  const row = el("div", "wa-c-row " + (msg.direction === "out" ? "out" : "in"));
  const b = el("div", "wa-c-bubble" + (tail ? " tail" : ""));
  const tpl = msg.interactive?.kind === "template" ? msg.interactive : null;

  if (msg.replyTo) b.appendChild(quoted(msg.replyTo));
  if (tpl?.header) b.appendChild(el("div", "wa-c-tpl-header", tpl.header));
  if (msg.text) b.appendChild(el("div", "wa-c-text", msg.text));
  if (tpl?.footer) b.appendChild(el("div", "wa-c-tpl-footer", tpl.footer));
  if (showMeta) b.appendChild(metaRow(msg));
  // The action block sits below the meta, spanning the bubble's full width, so
  // its dividers reach both edges — hence the negative margins in the CSS.
  if (msg.interactive) b.appendChild(interactive(msg.interactive));

  row.appendChild(b);
  return row;
}

function inputBar(): HTMLElement {
  const bar = el("div", "wa-c-input");
  const field = el("div", "wa-c-field");
  field.appendChild(iconEl("smile", 18));
  field.appendChild(el("span", "wa-c-field-ph", "Message"));
  field.appendChild(iconEl("paperclip", 18));
  field.appendChild(iconEl("camera", 18));
  bar.appendChild(field);
  const mic = el("div", "wa-c-mic");
  mic.appendChild(iconEl("mic", 18));
  bar.appendChild(mic);
  return bar;
}

/** Render `thread` into `host` (replacing its contents). */
export function renderChat(thread: Thread, host: HTMLElement): void {
  host.innerHTML = "";

  const phone = el("div", "wa-phone wa-c-phone");
  phone.appendChild(statusBar());
  phone.appendChild(header(thread));

  const body = el("div", "wa-c-thread");
  if (thread.dateLabel) {
    body.appendChild(pill(thread.dateLabel, "wa-c-date"));
  }
  if (thread.showEncryptionNotice) {
    body.appendChild(pill("Messages are end-to-end encrypted", "wa-c-notice", "lock"));
  }
  thread.messages.forEach((msg, i) => {
    const first = startsRun(thread.messages, i);
    // Time + ticks only on the last message of a run, as the real app does.
    const row = bubble(msg, first, endsRun(thread.messages, i));
    if (!first) row.classList.add("grouped");
    body.appendChild(row);
  });
  phone.appendChild(body);

  // A list message has two states, and both are worth mocking. The open sheet is
  // docked over the bottom of the thread so the state is actually visible; once
  // the composer exists it should become a toggle rather than always-on.
  const firstList = thread.messages
    .map((m) => m.interactive)
    .find((i): i is Extract<Interactive, { kind: "list" }> => !!i && i.kind === "list");
  if (firstList) phone.appendChild(listSheet(firstList));

  phone.appendChild(inputBar());
  host.appendChild(phone);
}

function pill(text: string, cls: string, icon?: string): HTMLElement {
  const wrap = el("div", "wa-c-pill-row");
  const p = el("div", "wa-c-pill " + cls);
  if (icon) p.appendChild(iconEl(icon, 11));
  p.appendChild(el("span", undefined, text));
  wrap.appendChild(p);
  return wrap;
}
