// Message contract between the plugin UI (iframe) and the main thread (Figma sandbox).
import type { FlowJSON } from "../model/flowTypes";

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
}

export interface Prefs {
  theme: ThemePref; // plugin-chrome theme (distinct from the WhatsApp mockup theme)
  lang: LangPref;
  os: OS;
  previewTheme: PreviewTheme; // WhatsApp mockup theme
  interactive: boolean;
  size: ScreenSize;
}

// UI -> main
export type UIToMain =
  | { type: "generate"; flow: FlowJSON; options: GenOptions }
  | { type: "resize"; width: number; height: number }
  | { type: "notify"; message: string }
  | { type: "savePrefs"; prefs: Prefs };

// main -> UI
export type MainToUI =
  | { type: "generated"; screenCount: number }
  | { type: "error"; message: string }
  | { type: "prefs"; prefs: Prefs };

export function postToMain(msg: UIToMain): void {
  parent.postMessage({ pluginMessage: msg }, "*");
}
