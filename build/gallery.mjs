// Builds the component gallery (gallery.ts + the two chrome stylesheets) into
// build/gallery.html, a standalone page to open in a browser:
//
//   npm run gallery && (cd build && python -m http.server 8792)   # /gallery.html
//
// It is a development aid, gitignored; nothing here reaches plugin/.
import esbuild from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const p = (...parts) => path.join(root, ...parts);

const r = await esbuild.build({ entryPoints: [p("build/gallery.ts")], bundle: true, write: false, format: "iife", target: "es2019" });
const tokens = await readFile(p("src/ui/tokens.css"), "utf8");
const chrome = await readFile(p("src/ui/chrome.css"), "utf8");
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Chrome gallery</title><style>
${tokens}
${chrome}
/* What the plugin's ui.html sets globally, so the components measure the same here. */
:root { color-scheme: light dark; } * { box-sizing: border-box; }
body { margin: 0; padding: 24px; background: var(--md-sys-color-surface-container); color: var(--md-sys-color-on-surface); font: 14px/1.45 var(--md-ref-typeface-plain); }
.g-block { margin-bottom: 28px; }
.g-block h3 { font-size: 13px; font-weight: 600; color: var(--md-sys-color-outline); margin: 0 0 10px; }
.g-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
.g-stack { display: flex; flex-direction: column; gap: var(--ui-space-12); }
.g-stack.sm { gap: var(--ui-space-8); }
.g-frame { height: 390px; display: flex; background: var(--md-sys-color-surface); border: 1px solid var(--md-sys-color-outline-variant); border-radius: 12px; overflow: hidden; }
.ui-section, .ui-toolbar { width: 430px; background: var(--md-sys-color-surface); } /* the panel's width at --ui-scale */
#theme { position: fixed; top: 10px; right: 10px; }
</style></head><body><button id="theme" class="ui-btn secondary sm">theme</button><div id="gallery"></div><script>${r.outputFiles[0].text}</script></body></html>`;
await writeFile(p("build/gallery.html"), html);
console.log("gallery -> build/gallery.html");
