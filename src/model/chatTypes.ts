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
}

export interface Contact {
  name: string;
  presence?: string; // "online", "last seen today at 09:40", or omitted
  avatar?: string;   // base64 data URI; absent renders a monogram
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

/** A short, representative thread — the chat-mode counterpart of sample.ts. */
export function sampleThread(): Thread {
  return {
    contact: { name: "Aurora Books", presence: "online" },
    dateLabel: "TODAY",
    showEncryptionNotice: true,
    messages: [
      { id: "m1", direction: "in", type: "text", time: "09:38",
        text: "Hi! Your order #4127 is ready for pickup." },
      { id: "m2", direction: "in", type: "text", time: "09:38",
        text: "We're open until 7pm today." },
      { id: "m3", direction: "out", type: "text", time: "09:40", status: "read",
        text: "Perfect, I'll come by after work." },
      { id: "m4", direction: "in", type: "text", time: "09:41",
        text: "See you then. Bring the QR code from your confirmation email." },
      { id: "m5", direction: "out", type: "text", time: "09:41", status: "delivered",
        text: "Got it 👍" },
    ],
  };
}
