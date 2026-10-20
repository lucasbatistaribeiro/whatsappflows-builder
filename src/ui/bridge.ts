// The UI's end of the postMessage channel. Lives here rather than in
// src/shared/messages.ts because `parent` is a DOM global: the shared module is
// the typed contract both runtimes import, so it has to stay free of DOM and of
// the Figma API (see build/tsconfig.main.json / tsconfig.ui.json).
//
// Figma's own contract: the UI wraps what it sends in `pluginMessage` and passes
// "*" as the target origin; the sandbox receives the value unwrapped.
import type { UIToMain } from "../shared/messages";

export function postToMain(msg: UIToMain): void {
  parent.postMessage({ pluginMessage: msg }, "*");
}
