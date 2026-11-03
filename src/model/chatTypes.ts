// Chat-mode model: a WhatsApp conversation to mock up. Pure (no figma, no DOM) so
// both the preview and the Figma generator import it — same rule as flowTypes.ts.
//
// Unlike Flow JSON, this shape is OURS: Meta publishes no conversation format
// (see knowledge/BACKLOG.md), so there is nothing to conform to and nothing to
// validate against. Keep it small — every field has to be worth rendering.

export type Direction = "in" | "out";

/** Delivery state. Outgoing messages only; incoming ones show no ticks. */
export type Status = "sent" | "delivered" | "read";

export type MessageType = "text" | "image" | "video" | "document" | "audio";

export interface QuotedReply {
  author: string;
  text: string;
}

export interface Media {
  src?: string;      // base64 data URI; absent renders a placeholder
  name?: string;     // document filename
  size?: string;     // display string, e.g. "1.2 MB"
  duration?: string; // audio/video, e.g. "0:14"
}

/**
 * Official limits, from Meta's OpenAPI specs and template prose docs — see
 * knowledge/CHAT_PATTERNS.md for the per-field provenance. Kept here so a future
 * validator and the renderers read one source instead of re-deriving them.
 *
 * Note `replyButtonTitle` (20) vs `templateButtonText` (25): session reply
 * buttons and template buttons genuinely differ, and conflating them rejects
 * valid templates.
 */
export const LIMITS = {
  headerText: 60, bodyText: 1024, footerText: 60,
  replyButtons: 3, replyButtonTitle: 20,
  listCta: 20, listSections: 10, listSectionTitle: 24,
  listRows: 10, listRowTitle: 24, listRowDescription: 72,
  flowCta: 30,
  templateButtons: 10, templateButtonText: 25,
} as const;

export type TemplateButtonType =
  | "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "COPY_CODE"
  | "FLOW" | "MPM" | "CATALOG" | "OTP";

export interface ReplyButton { id?: string; title: string }
export interface ListRow { id?: string; title: string; description?: string }
export interface ListSection { title?: string; rows: ListRow[] }
export interface TemplateButton { type: TemplateButtonType; text: string }

/**
 * The interactive part of a message. A second axis, not more `type` values: a
 * message is text *or* media AND may carry one of these.
 *
 * Deliberately narrower than the API — a mockup needs what is drawn, so
 * `catalog_id`, `signature_hash` and friends stay out until something renders
 * them (knowledge/CHAT_PATTERNS.md).
 */
export type Interactive =
  | { kind: "buttons"; buttons: ReplyButton[] }
  | {
      kind: "list";
      cta: string;
      sections: ListSection[];
      /**
       * Whether to mock the *open* sheet rather than just the bubble. A list
       * message has two states and both are worth drawing, so which one you get
       * is authored per message — it isn't something the preview decides.
       */
      sheetOpen?: boolean;
    }
  | { kind: "flow"; cta: string }
  | { kind: "template"; header?: string; footer?: string; buttons: TemplateButton[] };

export interface Message {
  id: string;
  direction: Direction;
  type: MessageType;
  text?: string;
  /**
   * Display string ("09:41"), deliberately not a timestamp: a mockup wants a
   * fixed, legible time rather than a live clock, and a string keeps the model
   * free of timezone and formatting questions.
   */
  time?: string;
  status?: Status;
  replyTo?: QuotedReply;
  media?: Media;
  /** Reply buttons, a list menu, a flow CTA, or a template's extra parts. */
  interactive?: Interactive;
}

export interface Contact {
  name: string;
  presence?: string; // "online", "last seen today at 09:40", or omitted
  avatar?: string;   // base64 data URI; absent renders a monogram
  /** Verified badge after the name, as WhatsApp shows for a business account. */
  verified?: boolean;
}

export interface Thread {
  contact: Contact;
  messages: Message[];
  /** The one-off "messages are end-to-end encrypted" notice at the top. */
  showEncryptionNotice?: boolean;
  /** Date divider pill above the first message, e.g. "TODAY". */
  dateLabel?: string;
}

/**
 * Consecutive messages from the same side are visually grouped: they tighten
 * their vertical gap and only the first of a run carries a tail. Returns, per
 * message index, whether it starts a new run.
 */
export function startsRun(messages: Message[], i: number): boolean {
  if (i <= 0) return true;
  return messages[i - 1].direction !== messages[i].direction;
}

/**
 * Whether this message is the last of its run. WhatsApp shows the time and ticks
 * only on the last message of a same-side run — observed on WhatsApp LLC's own
 * Business screenshots, where the first of two consecutive outgoing bubbles
 * carries no meta at all. It also makes the "meta on its own row" trade-off
 * cheaper, since far fewer bubbles pay for that extra row.
 */
export function endsRun(messages: Message[], i: number): boolean {
  if (i >= messages.length - 1) return true;
  return messages[i + 1].direction !== messages[i].direction;
}
