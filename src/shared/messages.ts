// Message contract between the plugin UI (iframe) and the main thread (Figma sandbox).
// Types only: this module is imported by both sides, so it must compile with
// neither the DOM nor the Figma globals. The UI's send helper lives in
// src/ui/bridge.ts, where `parent` exists.
import type { FlowJSON } from "../model/flowTypes";
import type { Thread } from "../model/chatTypes";

export type ThemePref = "system" | "light" | "dark";
export type LangPref = "en" | "pt";

// WhatsApp mockup options — mirror the Meta Playground's gear menu. These affect
// the live preview AND the generated Figma frames (via the `generate` message).
export type OS = "android" | "ios";
export type PreviewTheme = "light" | "dark";
export type ScreenSize = "sm" | "md" | "lg"; // standard phone height for generated frames
export interface GenOptions {
  os: OS;              // phone chrome to imitate (consumed from Phase 3)
  theme: PreviewTheme; // WhatsApp light/dark palette (consumed from Phase 2)
  interactive: boolean; // preview navigation + Figma prototype wiring
  size: ScreenSize;    // minimum height of the generated screen frame
  showBusinessName: boolean; // business name under the flow title in the modal header
  businessName: string;      // the name itself (empty = nothing rendered)
  // The section each Generate wraps its screens in.
  sectionName: string;   // prefix; the run's date is always appended (empty = date only)
  sectionColor: string;  // "#rrggbb" background fill
  sectionRadius: number; // corner radius in px
}

/** Which generator the plugin is showing. */
export type Mode = "flows" | "chat";

export interface Prefs {
  mode: Mode; // reopen in whichever generator was last used
  theme: ThemePref; // plugin-chrome theme (distinct from the WhatsApp mockup theme)
  lang: LangPref;
  os: OS;
  previewTheme: PreviewTheme; // WhatsApp mockup theme
  interactive: boolean;
  size: ScreenSize;
  showBusinessName: boolean;
  businessName: string;
  sectionName: string;
  sectionColor: string;
  sectionRadius: number;
}

// UI -> main
export type UIToMain =
  // `replaceSectionId` links this run to a section already on the canvas (the
  // one the flow was imported from): the generator rebuilds that section in
  // place instead of dropping a second copy below it. Absent = a fresh run.
  | { type: "generate"; flow: FlowJSON; options: GenOptions; replaceSectionId?: string }
  // Chat mode (knowledge/CHAT_UI.md). Separate from `generate` because the
  // payload and the renderer are different, but it reuses the same options.
  | { type: "generateChat"; thread: Thread; options: GenOptions }
  | { type: "resize"; width: number; height: number }
  | { type: "notify"; message: string }
  | { type: "savePrefs"; prefs: Prefs };

// main -> UI
export type MainToUI =
  // `sectionId` is the section this run produced. The UI keeps it so the next
  // Generate updates the same section — including after an update, which
  // creates a new node with a new id.
  | { type: "generated"; screenCount: number; sectionId?: string; replaced?: boolean }
  | { type: "error"; message: string }
  | { type: "prefs"; prefs: Prefs }
  // The user clicked a generated section that carries an embedded Flow JSON —
  // offer to load it back into the builder.
  // `sectionId` lets the UI remember where the flow came from, so editing it
  // can update that section rather than generating a duplicate.
  | { type: "importOffer"; name: string; flow: FlowJSON; sectionId: string }
  // Selection moved off that section (or onto nothing) — withdraw the offer.
  | { type: "importOfferEnd" };
