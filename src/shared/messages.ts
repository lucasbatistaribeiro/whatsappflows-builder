// Message contract between the plugin UI (iframe) and the main thread (Figma sandbox).
import type { FlowJSON } from "../model/flowTypes";

export type ThemePref = "system" | "light" | "dark";
export type LangPref = "en" | "pt";
export interface Prefs { theme: ThemePref; lang: LangPref; }

// UI -> main
export type UIToMain =
  | { type: "generate"; flow: FlowJSON }
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
