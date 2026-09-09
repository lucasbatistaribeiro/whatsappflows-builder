// Chat mode, Figma side: builds a Thread as one phone-sized frame. The visual
// counterpart of src/ui/chat.ts — the two must stay in step, and both read their
// colours from theme.ts (see knowledge/CHAT_UI.md).
//
// Only verifiable inside Figma: typecheck + build says nothing about how this
// renders on the canvas.
import type { Interactive, Message, Thread } from "../model/chatTypes";
import { startsRun } from "../model/chatTypes";
import { COLOR, DEVICE, fill } from "./theme";
import { FONT } from "./fonts";
import { autoFrame, divider, markFill, markFillV, text } from "./nodes";
import { statusBar } from "./chrome";

// Mirrors the .wa-c-* CSS in ui.html. Unconfirmed until calibrated (CHAT_UI.md).
const THREAD_PAD_X = 7;
const THREAD_PAD_Y = 8;
const ROW_GAP = 8;
const GROUPED_GAP = 2;   // consecutive messages from the same side sit tighter
const BUBBLE_RADIUS = 8;
const TAIL = 7;          // notch width/height
const MAX_BUBBLE_RATIO = 0.75;

const CONTENT_W = DEVICE.width - THREAD_PAD_X * 2;
const MAX_BUBBLE_W = Math.floor(CONTENT_W * MAX_BUBBLE_RATIO);
const MAX_TEXT_W = MAX_BUBBLE_W - 16; // bubble's horizontal padding

/** Monogram initials, matching the preview's avatar fallback. */
function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();
}

function avatar(name: string): FrameNode {
  const f = autoFrame({ name: "Avatar", axis: "HORIZONTAL", align: "CENTER", counterAlign: "CENTER",
    width: 30, height: 30, bg: COLOR.chipBg, radius: 15 });
  f.appendChild(text(initials(name), { size: 12, font: FONT.semibold, color: COLOR.textSecondary }));
  return f;
}

function header(thread: Thread): FrameNode {
  const bar = autoFrame({ name: "Chat header", axis: "HORIZONTAL", gap: 8,
    padding: [8, 10, 8, 10], bg: COLOR.chatHeader, counterAlign: "CENTER" });
  markFill(bar);
  bar.appendChild(avatar(thread.contact.name));

  const names = autoFrame({ name: "Names", gap: 1 });
  markFill(names);
  const nameRow = autoFrame({ name: "Name", axis: "HORIZONTAL", gap: 3, counterAlign: "CENTER" });
  nameRow.appendChild(text(thread.contact.name, { size: 14, font: FONT.semibold, color: COLOR.textPrimary }));
  if (thread.contact.verified) {
    // A glyph rather than an SVG: the status-bar icons need createNodeFromSvg for
    // their exact shapes, but a badge reads fine as text and can't fail silently.
    nameRow.appendChild(text("✓", { size: 11, font: FONT.semibold, color: COLOR.link }));
  }
  names.appendChild(nameRow);
  if (thread.contact.presence) {
    names.appendChild(text(thread.contact.presence, { size: 11, color: COLOR.textSecondary }));
  }
  bar.appendChild(names);
  return bar;
}

/** Centred system pill — the date divider and the encryption notice. */
function pill(label: string, bg: string): FrameNode {
  const row = autoFrame({ name: "Pill row", axis: "HORIZONTAL", align: "CENTER" });
  markFill(row);
  const p = autoFrame({ name: "Pill", axis: "HORIZONTAL", padding: [5, 9, 5, 9], bg, radius: 7 });
  p.appendChild(text(label, { size: 11, color: COLOR.textSecondary }));
  row.appendChild(p);
  return row;
}

/** "09:41  ✓✓" — its own row, never inline with the text (CHAT_UI.md trade-off). */
function metaRow(msg: Message): FrameNode | null {
  if (!msg.time && !(msg.direction === "out" && msg.status)) return null;
  const meta = autoFrame({ name: "Meta", axis: "HORIZONTAL", gap: 3, align: "MAX", counterAlign: "CENTER" });
  markFill(meta);
  if (msg.time) meta.appendChild(text(msg.time, { size: 11, color: COLOR.textSecondary }));
  if (msg.direction === "out" && msg.status) {
    const glyph = msg.status === "sent" ? "✓" : "✓✓";
    meta.appendChild(text(glyph, { size: 11, color: msg.status === "read" ? COLOR.tick : COLOR.textSecondary }));
  }
  return meta;
}

/**
 * Text that hugs when short and wraps at the 75% cap when long. Measured first,
 * then rebuilt at a fixed width — Figma has no max-width, so the width has to be
 * decided before the node is final.
 */
function bubbleText(chars: string): TextNode {
  const probe = text(chars, { size: 14.2, lineHeight: 19, color: COLOR.textPrimary });
  if (probe.width <= MAX_TEXT_W) return probe;
  probe.remove();
  return text(chars, { size: 14.2, lineHeight: 19, color: COLOR.textPrimary, width: MAX_TEXT_W });
}

/**
 * The tail notch. Squares the corner on the tail side and hangs a triangle off
 * it, absolutely positioned so auto-layout ignores it. Wrapped: if absolute
 * positioning misbehaves the squared corner alone still reads as a run start,
 * which is why the corner is squared first.
 */
function addTail(bubble: FrameNode, out: boolean, colour: string): void {
  if (out) bubble.topRightRadius = 0; else bubble.topLeftRadius = 0;
  try {
    const svg = out
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="${TAIL}" height="${TAIL}"><path d="M0 0 H${TAIL} V${TAIL} Z" fill="${colour}"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="${TAIL}" height="${TAIL}"><path d="M${TAIL} 0 H0 V${TAIL} Z" fill="${colour}"/></svg>`;
    const node = figma.createNodeFromSvg(svg);
    node.name = "Tail";
    bubble.appendChild(node);
    node.layoutPositioning = "ABSOLUTE";
    node.y = 0;
    node.x = out ? bubble.width : -TAIL;
  } catch {
    /* squared corner already applied above */
  }
}

/**
 * One full-width action row. Reply buttons, the list CTA, the flow CTA and
 * template buttons all look like this, so they share one builder.
 *
 * INFERRED layout — no official screenshot of these patterns was found; the
 * payload limits in CHAT_PATTERNS.md are official, this drawing is not.
 */
function actionRow(label: string): FrameNode {
  const row = autoFrame({ name: "Action", axis: "HORIZONTAL", align: "CENTER",
    counterAlign: "CENTER", padding: [8, 10, 8, 10] });
  markFill(row);
  row.appendChild(text(label, { size: 14, font: FONT.medium, color: COLOR.link }));
  return row;
}

/**
 * The action block under a bubble's text. Unlike the CSS side, which cancels the
 * bubble padding with negative margins, here the bubble carries no padding at all
 * and this block is a full-width sibling of a padded content frame — Figma has no
 * negative margins.
 */
function interactiveBlock(inter: Interactive): FrameNode {
  const box = autoFrame({ name: "Actions" });
  markFill(box);
  box.appendChild(divider());
  const labels = inter.kind === "buttons" ? inter.buttons.map((b) => b.title)
    : inter.kind === "template" ? inter.buttons.map((b) => b.text)
    : [inter.cta];
  labels.forEach((label, i) => {
    if (i > 0) box.appendChild(divider());
    box.appendChild(actionRow(label));
  });
  return box;
}

/**
 * Image / video placeholder. Base64 media isn't decoded here — Flows mode has the
 * same gap for `Image` — so this is the tinted box with a glyph, plus a play badge
 * for video. The meta is overlaid on the media in the real app, but overlaying
 * inside auto-layout needs absolute positioning, so here it stays a row below;
 * flagged as a known divergence in CHAT_UI.md.
 */
function mediaBox(msg: Message): FrameNode {
  const box = autoFrame({ name: msg.type === "video" ? "Video" : "Image", axis: "HORIZONTAL",
    align: "CENTER", counterAlign: "CENTER", bg: COLOR.chipBg, radius: 6,
    width: MAX_BUBBLE_W - 6, height: Math.round((MAX_BUBBLE_W - 6) * 0.75) });
  box.appendChild(text(msg.type === "video" ? "▶" : "❑",
    { size: 22, color: COLOR.placeholder }));
  return box;
}

/** Voice note: play glyph, a bar waveform, duration. */
function audioBody(msg: Message): FrameNode {
  const wrap = autoFrame({ name: "Audio", gap: 2 });
  markFill(wrap);
  const row = autoFrame({ name: "Player", axis: "HORIZONTAL", gap: 8, counterAlign: "CENTER" });
  markFill(row);
  row.appendChild(text("▶", { size: 15, color: COLOR.textSecondary }));

  const wave = autoFrame({ name: "Waveform", axis: "HORIZONTAL", gap: 2, counterAlign: "CENTER" });
  markFill(wave);
  const bars = [5, 9, 14, 7, 11, 16, 8, 13, 6, 10, 15, 9, 12, 7, 14, 8, 11, 6, 13, 9];
  for (const h of bars) {
    const bar = figma.createRectangle();
    bar.name = "bar";
    bar.resize(2, h);
    bar.cornerRadius = 1;
    bar.fills = [fill(COLOR.placeholder)];
    wave.appendChild(bar);
  }
  row.appendChild(wave);
  wrap.appendChild(row);

  const foot = autoFrame({ name: "Foot", axis: "HORIZONTAL", counterAlign: "CENTER" });
  markFill(foot);
  foot.appendChild(text(msg.media?.duration ?? "0:00", { size: 11, color: COLOR.textSecondary }));
  wrap.appendChild(foot);
  return wrap;
}

/** Document row — inferred, no reference screenshot. */
function documentBody(msg: Message): FrameNode {
  const row = autoFrame({ name: "Document", axis: "HORIZONTAL", gap: 8, counterAlign: "CENTER",
    padding: [6, 8, 6, 8], bg: COLOR.chipBg, radius: 6 });
  markFill(row);
  const stack = autoFrame({ name: "File", gap: 1 });
  markFill(stack);
  stack.appendChild(text(msg.media?.name ?? "document.pdf", { size: 13.5, color: COLOR.textPrimary }));
  if (msg.media?.size) stack.appendChild(text(msg.media.size, { size: 11, color: COLOR.textSecondary }));
  row.appendChild(stack);
  return row;
}

function bubble(msg: Message, tail: boolean, showMeta: boolean): FrameNode {
  const out = msg.direction === "out";
  const row = autoFrame({ name: out ? "Out" : "In", axis: "HORIZONTAL", align: out ? "MAX" : "MIN" });
  markFill(row);

  const colour = out ? COLOR.bubbleOut : COLOR.bubbleIn;
  // The bubble itself is unpadded so an action block can span its full width; the
  // text lives in a padded child instead.
  const b = autoFrame({ name: "Bubble", bg: colour, radius: BUBBLE_RADIUS });
  const content = autoFrame({ name: "Content", gap: 1, padding: [6, 8, 6, 8] });
  markFill(content);

  const tpl = msg.interactive && msg.interactive.kind === "template" ? msg.interactive : null;
  if (msg.replyTo) {
    const q = autoFrame({ name: "Quote", gap: 1, padding: [3, 6, 3, 6], bg: COLOR.chipBg, radius: 4 });
    q.appendChild(text(msg.replyTo.author, { size: 12, font: FONT.semibold, color: COLOR.primary }));
    q.appendChild(text(msg.replyTo.text, { size: 12, color: COLOR.textSecondary, width: MAX_TEXT_W }));
    content.appendChild(q);
  }
  if (tpl && tpl.header) {
    content.appendChild(text(tpl.header, { size: 15, font: FONT.semibold, lineHeight: 20, color: COLOR.textPrimary }));
  }
  if (msg.type === "image" || msg.type === "video") content.appendChild(mediaBox(msg));
  else if (msg.type === "audio") content.appendChild(audioBody(msg));
  else if (msg.type === "document") content.appendChild(documentBody(msg));
  if (msg.text) content.appendChild(bubbleText(msg.text));
  if (tpl && tpl.footer) {
    content.appendChild(text(tpl.footer, { size: 12.5, lineHeight: 17, color: COLOR.textSecondary }));
  }
  const meta = showMeta ? metaRow(msg) : null;
  if (meta) content.appendChild(meta);
  b.appendChild(content);

  const wide = msg.interactive || msg.type === "image" || msg.type === "video";
  if (msg.interactive) {
    // A bubble with actions takes the full width cap: the rows need the room, and
    // that is how the real app draws them.
    b.appendChild(interactiveBlock(msg.interactive));
  }
  if (wide) {
    b.counterAxisSizingMode = "FIXED";
    b.resize(MAX_BUBBLE_W, b.height);
  }

  row.appendChild(b);
  if (tail) addTail(b, out, colour);
  return row;
}

function inputBar(): FrameNode {
  const bar = autoFrame({ name: "Input bar", axis: "HORIZONTAL", gap: 6,
    padding: [6, 7, 6, 7], bg: COLOR.chatHeader, counterAlign: "CENTER" });
  markFill(bar);

  const field = autoFrame({ name: "Field", axis: "HORIZONTAL", gap: 7,
    padding: [7, 9, 7, 9], bg: COLOR.surface, radius: 18, counterAlign: "CENTER" });
  markFill(field);
  field.appendChild(text("Message", { size: 13, color: COLOR.placeholder }));
  bar.appendChild(field);

  const mic = autoFrame({ name: "Mic", axis: "HORIZONTAL", align: "CENTER", counterAlign: "CENTER",
    width: 34, height: 34, bg: COLOR.primary, radius: 17 });
  bar.appendChild(mic);
  return bar;
}

/** Split messages into runs of consecutive same-direction messages. */
function runs(messages: Message[]): Message[][] {
  const out: Message[][] = [];
  messages.forEach((msg, i) => {
    if (startsRun(messages, i)) out.push([msg]);
    else out[out.length - 1].push(msg);
  });
  return out;
}

/**
 * Build the whole conversation as one frame. Caller places it and then runs
 * applyFills + the minimum-height pass, exactly like a generated flow screen.
 */
export function buildThread(thread: Thread): FrameNode {
  const frame = autoFrame({ name: `Chat — ${thread.contact.name}`, bg: COLOR.wallpaper, width: DEVICE.width });
  frame.clipsContent = true;

  const sb = statusBar(); // same phone chrome as a generated flow screen
  frame.appendChild(sb);
  markFill(sb);
  frame.appendChild(header(thread));

  // Named "body" on purpose: enforceMinHeight() in index.ts finds the child by
  // that name to absorb the slack when a short thread is padded to the standard
  // phone height. Rename it and the input bar stops being pinned to the bottom.
  const body = autoFrame({ name: "body", gap: ROW_GAP,
    padding: [THREAD_PAD_Y, THREAD_PAD_X, THREAD_PAD_Y, THREAD_PAD_X], bg: COLOR.wallpaper });
  markFill(body);
  markFillV(body); // fills the leftover height so the alignment below has slack
  // Messages sit at the BOTTOM, like the real app: the empty wallpaper is above
  // them. The CSS does this with `margin-top: auto` on the first child.
  body.primaryAxisAlignItems = "MAX";

  if (thread.dateLabel) body.appendChild(pill(thread.dateLabel, COLOR.bubbleIn));
  if (thread.showEncryptionNotice) {
    body.appendChild(pill("Messages are end-to-end encrypted", COLOR.systemPill));
  }
  // Consecutive messages from one side form a run, which sits tighter than the
  // gap between runs. Figma auto-layout has one item spacing per frame and no
  // per-child margin, so each run gets its own frame: ROW_GAP between runs,
  // GROUPED_GAP inside one.
  for (const run of runs(thread.messages)) {
    const group = autoFrame({ name: "Run", gap: GROUPED_GAP });
    markFill(group);
    run.forEach((msg, i) => {
      // Time + ticks only on the last of a run, as the real app does.
      const last = i === run.length - 1;
      group.appendChild(bubble(msg, i === 0, last));
    });
    body.appendChild(group);
  }
  frame.appendChild(body);

  frame.appendChild(inputBar());
  return frame;
}
