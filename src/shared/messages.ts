// Message contract between the plugin UI (iframe) and the main thread (Figma sandbox).
import type { FlowJSON } from "../model/flowTypes";

// UI -> main
export type UIToMain =
  | { type: "generate"; flow: FlowJSON }
  | { type: "resize"; width: number; height: number }
  | { type: "notify"; message: string };

// main -> UI
export type MainToUI =
  | { type: "generated"; screenCount: number }
  | { type: "error"; message: string };

export function postToMain(msg: UIToMain): void {
  parent.postMessage({ pluginMessage: msg }, "*");
}
