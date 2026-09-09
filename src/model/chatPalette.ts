// Chat-mode palette, mirroring src/model/palette.ts: label, group, and a factory
// producing a fresh message when the user adds it. The composer feeds these into
// the same grouped, searchable dropdown the Flows "Add component" picker uses, so
// adding a list menu is the same gesture as adding a RadioButtonsGroup.
//
// Each entry lands **fully formed** — a list menu arrives with a section and two
// rows, a template with a header, footer and buttons — because a component you
// have to assemble from empty fields isn't really "added".
import type { Direction, Message } from "./chatTypes";

export interface ChatPaletteEntry {
  key: string;
  label: string;
  group: "Text" | "Media" | "Interactive";
  make: () => Message;
}

let seq = 0;
/** Ids only have to be unique within a thread; a counter is enough. */
const id = (): string => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

const base = (direction: Direction): Pick<Message, "id" | "direction" | "type" | "time"> & Partial<Message> => ({
  id: id(),
  direction,
  type: "text",
  time: "09:41",
  ...(direction === "out" ? { status: "read" as const } : {}),
});

export const CHAT_PALETTE: ChatPaletteEntry[] = [
  // Text
  { key: "text-in", label: "Incoming text", group: "Text",
    make: () => ({ ...base("in"), text: "Message from the business." }) },
  { key: "text-out", label: "Outgoing text", group: "Text",
    make: () => ({ ...base("out"), text: "Reply from the customer." }) },

  // Media
  { key: "image", label: "Image", group: "Media",
    make: () => ({ ...base("in"), type: "image", media: {}, text: "" }) },
  { key: "video", label: "Video", group: "Media",
    make: () => ({ ...base("in"), type: "video", media: { duration: "0:24" } }) },
  { key: "document", label: "Document", group: "Media",
    make: () => ({ ...base("in"), type: "document", media: { name: "document.pdf", size: "1.2 MB" } }) },
  { key: "audio", label: "Voice note", group: "Media",
    make: () => ({ ...base("out"), type: "audio", media: { duration: "0:14" } }) },

  // Interactive — business-initiated, so these default to incoming.
  { key: "buttons", label: "Reply buttons", group: "Interactive",
    make: () => ({ ...base("in"), text: "Pick an option.",
      interactive: { kind: "buttons", buttons: [{ title: "Yes" }, { title: "No" }] } }) },
  { key: "list", label: "List menu", group: "Interactive",
    make: () => ({ ...base("in"), text: "Browse what we have today.",
      interactive: { kind: "list", cta: "View menu", sections: [
        { title: "Section", rows: [
          { title: "First item", description: "Short description" },
          { title: "Second item" },
        ] },
      ] } }) },
  { key: "flow", label: "Flow button", group: "Interactive",
    make: () => ({ ...base("in"), text: "Book in a few taps.",
      interactive: { kind: "flow", cta: "Book now" } }) },
  { key: "template", label: "Template", group: "Interactive",
    make: () => ({ ...base("in"), text: "Your order is on its way.",
      interactive: { kind: "template", header: "Order update", footer: "Business name",
        buttons: [{ type: "QUICK_REPLY", text: "Track it" }, { type: "PHONE_NUMBER", text: "Call us" }] } }) },
];

export const CHAT_PALETTE_GROUPS = ["Text", "Media", "Interactive"] as const;
