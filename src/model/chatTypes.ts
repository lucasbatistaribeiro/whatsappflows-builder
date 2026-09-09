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
  | { kind: "list"; cta: string; sections: ListSection[] }
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

/** A short, representative thread — the chat-mode counterpart of sample.ts. */
export function sampleThread(): Thread {
  return {
    contact: { name: "Aurora Books", presence: "Business account", verified: true },
    dateLabel: "TODAY",
    showEncryptionNotice: true,
    messages: [
      // A template message: how a business opens a conversation.
      { id: "m1", direction: "in", type: "text", time: "09:36",
        text: "Your order #4127 is ready for pickup. Collect it until 19:00 today.",
        interactive: { kind: "template", header: "Order ready", footer: "Aurora Books",
          buttons: [
            { type: "QUICK_REPLY", text: "On my way" },
            { type: "URL", text: "Track order" },
            { type: "PHONE_NUMBER", text: "Call the store" },
          ] } },
      // Reply buttons: the "pick one" pattern.
      { id: "m2", direction: "in", type: "text", time: "09:37",
        text: "Want us to hold it for another day?",
        interactive: { kind: "buttons", buttons: [
          { id: "hold", title: "Yes, hold it" },
          { id: "no", title: "No, thanks" },
        ] } },
      { id: "m3", direction: "out", type: "text", time: "09:40", status: "read",
        text: "No, thanks — I'll come by after work." },
      // The list menu.
      { id: "m4", direction: "in", type: "text", time: "09:41",
        text: "Anything else while you're here?",
        interactive: { kind: "list", cta: "View menu", sections: [
          { title: "Coffee", rows: [
            { id: "espresso", title: "Espresso", description: "Single origin, rotating" },
            { id: "filter", title: "Filter", description: "V60, 300ml" },
          ] },
          { title: "Pastry", rows: [{ id: "croissant", title: "Butter croissant" }] },
        ] } },
      // A flow CTA — the bridge to what Flows mode builds.
      { id: "m5", direction: "in", type: "text", time: "09:41",
        text: "You can also book a table for later.",
        interactive: { kind: "flow", cta: "Book a table" } },
      // Media: a voice note, a photo with a caption, and a quoted reply.
      { id: "m6", direction: "out", type: "audio", time: "09:42", status: "read",
        media: { duration: "0:14" } },
      { id: "m7", direction: "in", type: "image", time: "09:43",
        text: "Here it is, wrapped and ready.", media: { size: "412 KB" } },
      { id: "m8", direction: "in", type: "document", time: "09:43",
        media: { name: "receipt-4127.pdf", size: "88 KB" } },
      { id: "m9", direction: "out", type: "text", time: "09:44", status: "delivered",
        text: "Perfect 👍", replyTo: { author: "Aurora Books", text: "Here it is, wrapped and ready." } },
    ],
  };
}
